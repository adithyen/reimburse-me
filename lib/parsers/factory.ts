/**
 * Statement Parser Factory
 * Detects bank from file content/metadata and returns the appropriate parser.
 * Uses pdfjs-dist for PDF text extraction and xlsx for Excel.
 */

import { IStatementParser, FileDetectionResult, BankName, ParseResult, ParseOptions } from './types'
import { SBIParser } from './sbi'
import { GenericParser } from './generic'

// ---- All registered parsers (in priority order) ----
const PARSERS: IStatementParser[] = [
  new SBIParser(),
  new GenericParser(), // MUST be last
]

// Bank detection keywords for file metadata / first page content
const BANK_DETECTION_MAP: Record<BankName, string[]> = {
  SBI: ['state bank of india', 'sbi', 'yono sbi', 'onlinesbi', 'sbi bank', 'sbiy'],
  HDFC: ['hdfc bank', 'hdfc', 'hdfcbank'],
  ICICI: ['icici bank', 'icicibank', 'icici'],
  Federal: ['federal bank', 'federalbank', 'fed bank'],
  Airtel: ['airtel payments bank', 'airtel bank', 'airtel money', 'airtel'],
  Axis: ['axis bank', 'axisbank'],
  Canara: ['canara bank', 'canarabank'],
  Union: ['union bank of india', 'union bank', 'unionbank'],
  PNB: ['punjab national bank', 'pnb'],
  BOI: ['bank of india', 'boi'],
  Generic: [],
}

export class StatementParserFactory {
  /**
   * Auto-detect file type and bank, return detection metadata.
   */
  static async detect(
    fileName: string,
    contentOrBuffer: string | Buffer
  ): Promise<FileDetectionResult> {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''

    let fileType: FileDetectionResult['fileType'] = 'unknown'
    if (ext === 'pdf') fileType = 'pdf'
    else if (ext === 'csv') fileType = 'csv'
    else if (['xlsx', 'xls'].includes(ext)) fileType = 'xlsx'

    const content = typeof contentOrBuffer === 'string'
      ? contentOrBuffer
      : contentOrBuffer.toString('utf-8', 0, Math.min(contentOrBuffer.length, 2000))

    // Detect password protection
    let isPasswordProtected = false
    if (typeof contentOrBuffer !== 'string') {
      if (fileType === 'pdf') {
        isPasswordProtected = detectPasswordProtectedPdf(contentOrBuffer as Buffer)
      } else if (fileType === 'xlsx' || fileType === 'csv') {
        isPasswordProtected = detectPasswordProtectedExcel(contentOrBuffer as Buffer)
      }
    }

    // Detect bank
    const bankResult = detectBank(content + ' ' + fileName)

    // Find recommended parser
    const parser = PARSERS.find((p) => p.name !== 'GenericParser' && p.canParse(content, fileName))
    const parserRecommended = parser?.name || 'GenericParser'

    return {
      fileType,
      bankDetected: bankResult.bank,
      isPasswordProtected,
      confidence: bankResult.confidence,
      parserRecommended,
    }
  }

  /**
   * Parse a statement file.
   */
  static async parse(
    fileName: string,
    textContent: string,
    forceBankName?: BankName,
    options?: ParseOptions
  ): Promise<ParseResult> {
    let parser: IStatementParser

    if (forceBankName && forceBankName !== 'Generic') {
      const specific = PARSERS.find(
        (p) => p.bankName.toLowerCase().includes(forceBankName.toLowerCase())
      )
      parser = specific || PARSERS[PARSERS.length - 1]
    } else {
      parser = PARSERS.find((p) => p.canParse(textContent, fileName)) || PARSERS[PARSERS.length - 1]
    }

    return parser.parse(textContent, options)
  }

  static getParserList(): Array<{ name: string; bankName: string }> {
    return PARSERS.map((p) => ({ name: p.name, bankName: p.bankName }))
  }
}

// ---- Bank detection ----

function detectBank(content: string): { bank: BankName; confidence: number } {
  const lower = content.toLowerCase()

  for (const [bank, keywords] of Object.entries(BANK_DETECTION_MAP)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        const confidence = Math.min(0.99, 0.7 + (kw.length / 30) * 0.3)
        return { bank: bank as BankName, confidence }
      }
    }
  }

  return { bank: 'Generic', confidence: 0.3 }
}

// ---- Password protection detection ----

function detectPasswordProtectedPdf(buffer: Buffer): boolean {
  try {
    const header = buffer.toString('latin1', 0, Math.min(buffer.length, 4096))
    return header.includes('/Encrypt') || header.includes('/EncryptMetadata')
  } catch {
    return false
  }
}

function detectPasswordProtectedExcel(buffer: Buffer): boolean {
  try {
    if (buffer.length < 8) return false
    const magic = buffer.slice(0, 8)
    // OLE compound document (used for encrypted XLSX/XLS)
    if (magic[0] === 0xd0 && magic[1] === 0xcf && magic[2] === 0x11 && magic[3] === 0xe0) {
      return true
    }
    return false
  } catch {
    return false
  }
}

// ---- Excel parsing (server-side) ----

export async function parseExcelToText(buffer: Buffer, password?: string): Promise<string> {
  const XLSX = await import('xlsx')

  if (password) {
    throw new Error('UNSUPPORTED_EXCEL_PASSWORD')
  }

  let workbook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellText: true, cellDates: true })
  } catch (e) {
    if (String(e).toLowerCase().includes('password') || String(e).includes('Encrypted')) {
      throw new Error('NEEDS_PASSWORD')
    }
    throw e
  }

  // Convert ALL sheets to CSV joined together (handles multi-sheet statements)
  const csvParts: string[] = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ',', RS: '\n' })
    // Only add non-empty sheets
    if (csv.trim().length > 0) {
      csvParts.push(csv)
    }
  }
  return csvParts.join('\n')
}

// ---- PDF text extraction (server-side) using pdfjs-dist ----

export async function extractPdfText(buffer: Buffer, password?: string): Promise<string> {
  // Check if encrypted first
  if (detectPasswordProtectedPdf(buffer) && !password) {
    throw new Error('NEEDS_PASSWORD')
  }

  try {
    // Use pdfjs-dist for reliable extraction
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as any).catch(() =>
      import('pdfjs-dist' as any)
    )

    const pdfjsMod = pdfjsLib.default || pdfjsLib

    // Set valid file:/// workerSrc for pdfjs-dist ESM loader compatibility
    if (pdfjsMod.GlobalWorkerOptions) {
      try {
        const { pathToFileURL } = require('url')
        const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
        pdfjsMod.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href
      } catch {
        try {
          const { pathToFileURL } = require('url')
          const workerPath = require.resolve('pdfjs-dist/build/pdf.worker.mjs')
          pdfjsMod.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href
        } catch {
          // Fallback
        }
      }
    }

    const loadingTask = pdfjsMod.getDocument({
      data: new Uint8Array(buffer),
      ...(password ? { password } : {}),
      isEvalSupported: false,
      useSystemFonts: true,
    })

    const pdf = await loadingTask.promise

    const pages: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      // Join items preserving spatial layout by adding spaces between tokens
      const items = textContent.items as Array<{ str: string; transform: number[]; width: number }>
      
      // Group by Y coordinate to reconstruct lines
      const lineMap = new Map<number, Array<{ x: number; str: string }>>()
      for (const item of items) {
        if (!item.str) continue
        const y = Math.round(item.transform[5]) // Y position (rounded)
        if (!lineMap.has(y)) lineMap.set(y, [])
        lineMap.get(y)!.push({ x: item.transform[4], str: item.str })
      }
      
      // Sort lines by Y descending (PDF coordinate system is bottom-up)
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a)
      const pageLines: string[] = []
      for (const y of sortedYs) {
        const tokens = lineMap.get(y)!.sort((a, b) => a.x - b.x)
        const line = tokens.map(t => t.str).join('  ')
        if (line.trim()) pageLines.push(line)
      }
      pages.push(pageLines.join('\n'))
    }

    return pages.join('\n\n--- PAGE BREAK ---\n\n')
  } catch (e) {
    const msg = String(e).toLowerCase()
    if (msg.includes('password') || msg.includes('encrypted') || msg.includes('badresponseer')) {
      if (!password) throw new Error('NEEDS_PASSWORD')
      throw new Error('WRONG_PASSWORD')
    }
    throw e
  }
}
