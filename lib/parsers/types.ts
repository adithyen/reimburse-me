/**
 * Parser abstraction layer for bank statement imports.
 * All parsers must implement IStatementParser and return CanonicalTransaction[].
 * This ensures bank-specific logic is fully isolated from the rest of the app.
 */

// ============================================================
// CANONICAL TRANSACTION MODEL
// Every parser must normalize its output to this format.
// ============================================================

export interface CanonicalTransaction {
  date: Date
  time?: string                 // "HH:MM:SS" if available
  rawNarration: string          // original narration from bank
  merchant?: string             // cleaned merchant name
  amount: number                // always positive
  type: 'DEBIT' | 'CREDIT'
  runningBalance?: number       // balance after this transaction
  referenceNumber?: string      // UTR / reference number
  bankTxnId?: string            // bank's own transaction ID
  categorySlug?: string         // auto-detected category
  confidence?: number           // parser confidence 0-1
  parseWarning?: string         // warning if low confidence
}

// ============================================================
// PARSER INTERFACE
// ============================================================

export interface IStatementParser {
  name: string
  bankName: string
  canParse(content: string, fileName: string): boolean
  parse(content: string, options?: ParseOptions): Promise<ParseResult>
}

export interface ParseOptions {
  accountId?: string
  fileName?: string
  password?: string             // for password-protected files (already decrypted before parse)
  skipRows?: number             // manually skip N header rows
  dateFormat?: string           // override date format detection
}

export interface ParseResult {
  transactions: CanonicalTransaction[]
  totalFound: number
  parserName: string
  bankDetected: string
  warnings: string[]
  errors: string[]
  dateRange?: {
    from: Date
    to: Date
  }
}

// ============================================================
// FILE DETECTION TYPES
// ============================================================

export type FileType = 'pdf' | 'csv' | 'xlsx' | 'unknown'
export type BankName =
  | 'SBI'
  | 'HDFC'
  | 'ICICI'
  | 'Federal'
  | 'Airtel'
  | 'Axis'
  | 'Canara'
  | 'Union'
  | 'PNB'
  | 'BOI'
  | 'Generic'

export interface FileDetectionResult {
  fileType: FileType
  bankDetected: BankName
  isPasswordProtected: boolean
  confidence: number
  parserRecommended: string
}

// ============================================================
// IMPORT PREVIEW ROW (for UI display before confirmation)
// ============================================================

export interface ImportPreviewRow {
  id: string                    // temp local ID
  date: string                  // formatted for display
  rawDate: Date
  merchant: string
  rawNarration: string
  amount: number
  type: 'DEBIT' | 'CREDIT'
  runningBalance?: number
  categorySlug?: string
  referenceNumber?: string
  bankTxnId?: string
  confidence: number
  warning?: string
  isSelected: boolean           // user selection for import
  isDuplicate?: boolean         // already exists in DB
  isEdited?: boolean            // user has edited this row
}

// ============================================================
// DATE PARSING UTILITIES (shared across parsers)
// ============================================================

const DATE_FORMATS: Array<{
  pattern: RegExp
  parse: (match: RegExpMatchArray) => Date | null
}> = [
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (with optional time)
  {
    pattern: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)?$/i,
    parse: (m) => {
      const d = parseInt(m[1]), mo = parseInt(m[2]) - 1, y = parseInt(m[3])
      const date = new Date(y, mo, d)
      return isValidDate(date) ? date : null
    },
  },
  // YYYY-MM-DD or YYYY/MM/DD (ISO, with optional time)
  {
    pattern: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?:[\sT]\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)?$/i,
    parse: (m) => {
      const date = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
      return isValidDate(date) ? date : null
    },
  },
  // DD MMM YYYY or DD-MMM-YYYY or DD MMM YY (with optional time)
  {
    pattern: /^(\d{1,2})[\/\-\s]([A-Za-z]{3,9})[\/\-\s](\d{2,4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)?$/i,
    parse: (m) => {
      const months: Record<string, number> = {
        jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
        may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
        oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
      }
      const mo = months[m[2].toLowerCase()]
      if (mo === undefined) return null
      let y = parseInt(m[3])
      if (y < 100) y += y > 50 ? 1900 : 2000
      const date = new Date(y, mo, parseInt(m[1]))
      return isValidDate(date) ? date : null
    },
  },
  // DD/MM/YY or DD-MM-YY (with optional time)
  {
    pattern: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)?$/i,
    parse: (m) => {
      const y = parseInt(m[3]) + (parseInt(m[3]) > 50 ? 1900 : 2000)
      const date = new Date(y, parseInt(m[2]) - 1, parseInt(m[1]))
      return isValidDate(date) ? date : null
    },
  },
]

function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime()) && date.getFullYear() > 1990 && date.getFullYear() < 2100
}

export function parseDate(str: string): Date | null {
  if (!str) return null
  const trimmed = str.trim().replace(/^["']|["']$/g, '')
  if (!trimmed) return null

  for (const { pattern, parse } of DATE_FORMATS) {
    const match = trimmed.match(pattern)
    if (match) {
      const result = parse(match)
      if (result) return result
    }
  }

  // Try extracting just the date part (first word/token before space if time exists)
  const datePartOnly = trimmed.split(/\s+/)[0]
  if (datePartOnly && datePartOnly !== trimmed) {
    for (const { pattern, parse } of DATE_FORMATS) {
      const match = datePartOnly.match(pattern)
      if (match) {
        const result = parse(match)
        if (result) return result
      }
    }
  }

  // Fallback: manual DD/MM/YYYY check if native Date fails
  const parts = trimmed.split(/[\/\-\.]/)
  if (parts.length >= 3) {
    const d = parseInt(parts[0]), mo = parseInt(parts[1]) - 1, y = parseInt(parts[2].slice(0, 4))
    if (!isNaN(d) && !isNaN(mo) && !isNaN(y) && d >= 1 && d <= 31 && mo >= 0 && mo <= 11 && y >= 1990) {
      const testDate = new Date(y, mo, d)
      if (isValidDate(testDate)) return testDate
    }
  }

  // Last resort: native Date parse
  const d = new Date(trimmed)
  return isValidDate(d) ? d : null
}

export function parseAmount(str: string): number {
  // Remove currency symbols, commas, spaces
  const cleaned = str.replace(/[₹$€£,\s]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : Math.abs(num)
}

export function detectDebitCredit(
  debitStr: string,
  creditStr: string
): { amount: number; type: 'DEBIT' | 'CREDIT' } | null {
  const debit = parseAmount(debitStr)
  const credit = parseAmount(creditStr)

  if (debit > 0 && credit === 0) return { amount: debit, type: 'DEBIT' }
  if (credit > 0 && debit === 0) return { amount: credit, type: 'CREDIT' }
  if (debit > 0 && credit > 0) return { amount: debit, type: 'DEBIT' } // fallback
  return null
}
