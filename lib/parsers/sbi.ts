/**
 * SBI (State Bank of India) Statement Parser
 * Handles PDF and CSV/Excel statements from SBI NetBanking and YONO app.
 * 
 * Detected formats:
 * - YONO/Email XLSX: Date, Details, Ref No, Debit, Credit, Balance  
 * - NetBanking CSV: Txn Date, Description, Ref No./Cheque No., Debit, Credit, Balance
 * - PDF: Spatial text reconstruction with date-anchored rows
 */

import { categorizeTransaction, extractMerchant } from '@/lib/categorize'
import {
  IStatementParser,
  ParseOptions,
  ParseResult,
  CanonicalTransaction,
  parseDate,
  parseAmount,
  detectDebitCredit,
} from './types'

const SBI_DETECTION_KEYWORDS = [
  'state bank of india',
  'sbi',
  'yono sbi',
  'sbibank',
  'onlinesbi',
  'sbiy', // SBIY in narrations like "SBIY226..."
]

export class SBIParser implements IStatementParser {
  name = 'SBIParser'
  bankName = 'State Bank of India'

  canParse(content: string, fileName: string): boolean {
    const lower = (content + ' ' + fileName).toLowerCase()
    return SBI_DETECTION_KEYWORDS.some((kw) => lower.includes(kw))
  }

  async parse(content: string, _options?: ParseOptions): Promise<ParseResult> {
    const warnings: string[] = []
    const errors: string[] = []

    const isCsv = this.looksLikeCsv(content)

    if (isCsv) {
      return this.parseCsv(content, warnings, errors)
    } else {
      return this.parsePdfText(content, warnings, errors)
    }
  }

  private looksLikeCsv(content: string): boolean {
    const firstFewLines = content.split('\n').slice(0, 10).join('\n')
    return (firstFewLines.match(/,/g) || []).length >= 5
  }

  private parseCsv(content: string, warnings: string[], errors: string[]): ParseResult {
    const transactions: CanonicalTransaction[] = []
    
    // Normalize multiline cells from XLSX export (cells with embedded \r\n)
    // SheetJS exports them as quoted fields with internal newlines
    const rawLines = content.split('\n')
    const lines = this.joinMultilineCells(rawLines)
      .map(l => l.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      errors.push('Empty CSV file')
      return { transactions, totalFound: 0, parserName: this.name, bankDetected: this.bankName, warnings, errors }
    }

    // Find header row
    let headerIdx = -1
    let colMap: Record<string, number> = {}

    for (let i = 0; i < Math.min(lines.length, 25); i++) {
      const cols = parseCsvRow(lines[i])
      const detected = detectSBIColumns(cols.map(c => c.toLowerCase().trim()))
      if (detected) {
        headerIdx = i
        colMap = detected
        break
      }
    }

    if (headerIdx === -1) {
      warnings.push('Could not auto-detect SBI CSV column headers. Trying generic CSV fallback.')
      // Fall back to generic parsing
      const { GenericParser } = require('./generic')
      const gp = new GenericParser()
      return gp.parse(content, {})
    }

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cols = parseCsvRow(lines[i])
      if (cols.length < 3) continue

      try {
        const dateStr = (colMap['date'] !== undefined ? cols[colMap['date']] : '').trim()
        const narration = (colMap['narration'] !== undefined ? cols[colMap['narration']] : '').trim()
        const debitStr = (colMap['debit'] !== undefined ? cols[colMap['debit']] : '').trim()
        const creditStr = (colMap['credit'] !== undefined ? cols[colMap['credit']] : '').trim()
        const balanceStr = (colMap['balance'] !== undefined ? cols[colMap['balance']] : '').trim()
        const ref = (colMap['ref'] !== undefined ? cols[colMap['ref']] : '').trim() || undefined

        if (!dateStr) continue
        const date = parseDate(dateStr)
        if (!date) {
          // Might be a summary row
          continue
        }

        if (!narration && !debitStr && !creditStr) continue

        const dc = detectDebitCredit(debitStr, creditStr)
        if (!dc || dc.amount === 0) continue

        // Clean narration: remove embedded newlines and excess whitespace
        const cleanNarration = narration.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()

        const { categorySlug, confidence } = categorizeTransaction(cleanNarration)
        const merchant = extractMerchant(cleanNarration)

        transactions.push({
          date,
          rawNarration: cleanNarration,
          merchant,
          amount: dc.amount,
          type: dc.type,
          runningBalance: parseAmount(balanceStr) || undefined,
          referenceNumber: ref?.trim() || undefined,
          bankTxnId: extractRefNumber(cleanNarration) || ref?.trim(),
          categorySlug,
          confidence,
        })
      } catch (e) {
        errors.push(`Row ${i + 1}: ${String(e)}`)
      }
    }

    if (transactions.length === 0) {
      warnings.push('SBI CSV parser found 0 transactions. Trying generic fallback.')
      const { GenericParser } = require('./generic')
      const gp = new GenericParser()
      return gp.parse(content, {})
    }

    return {
      transactions,
      totalFound: transactions.length,
      parserName: this.name,
      bankDetected: this.bankName,
      warnings,
      errors,
      dateRange: getDateRange(transactions),
    }
  }

  /**
   * Join multiline CSV cells that were split across lines by SheetJS
   * A continuation line doesn't start with a date or quote that starts a new row.
   */
  private joinMultilineCells(rawLines: string[]): string[] {
    const result: string[] = []
    
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i]
      
      if (result.length === 0) {
        result.push(line)
        continue
      }
      
      // Count unescaped quotes in current accumulated line
      const last = result[result.length - 1]
      const quoteCount = (last.match(/"/g) || []).length
      
      // If there's an odd number of quotes, we're inside a quoted field
      if (quoteCount % 2 !== 0) {
        result[result.length - 1] += ' ' + line.trim()
      } else {
        result.push(line)
      }
    }
    
    return result
  }

  private parsePdfText(content: string, warnings: string[], errors: string[]): ParseResult {
    const transactions: CanonicalTransaction[] = []
    const lines = content.split('\n')

    // SBI PDF has transaction lines in format:
    // DD/MM/YYYY  NARRATION  REF  DEBIT  CREDIT  BALANCE  
    // or they might span multiple lines

    // Strategy: scan for date-anchored lines
    const DATE_RE = /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const dateMatch = line.match(DATE_RE)
      if (!dateMatch) continue

      const dateStr = dateMatch[1]
      const date = parseDate(dateStr)
      if (!date) continue

      // Collect this line and the next line (SBI PDFs often split narration)
      let fullContent = line
      if (i + 1 < lines.length && !lines[i + 1].trim().match(DATE_RE)) {
        const nextLine = lines[i + 1].trim()
        if (nextLine && !nextLine.match(/^(date|txn|balance|narration)/i)) {
          fullContent = line + ' ' + nextLine
          i++ // skip next line
        }
      }

      // Extract all monetary amounts (numbers with decimal places)
      const amounts = extractAmounts(fullContent)
      if (amounts.length === 0) continue

      // Remove the date from the content to get narration+amounts
      const withoutDate = fullContent.replace(dateStr, '').trim()
      
      // The last 1-3 numbers are debit/credit/balance
      let debit = 0, credit = 0, balance = 0
      
      if (amounts.length >= 3) {
        balance = amounts[amounts.length - 1]
        // Check if second-to-last is debit or credit based on balance direction
        const prevBalance = getPreviousBalance(transactions)
        if (prevBalance !== undefined) {
          if (balance < prevBalance - 0.01) {
            debit = amounts[amounts.length - 2]
          } else if (balance > prevBalance + 0.01) {
            credit = amounts[amounts.length - 2]
          } else {
            debit = amounts[amounts.length - 2]
          }
        } else {
          // Can't determine from context - check narration keywords
          const lower = withoutDate.toLowerCase()
          if (lower.includes('dr') || lower.includes('wdl') || lower.includes('upi/dr') || lower.includes('atm')) {
            debit = amounts[amounts.length - 2]
          } else if (lower.includes('cr') || lower.includes('dep') || lower.includes('upi/cr')) {
            credit = amounts[amounts.length - 2]
          } else {
            debit = amounts[amounts.length - 2]
          }
        }
      } else if (amounts.length === 2) {
        balance = amounts[1]
        // Check narration for type hint
        const lower = withoutDate.toLowerCase()
        if (lower.includes('cr') || lower.includes('dep') || lower.includes('upi/cr')) {
          credit = amounts[0]
        } else {
          debit = amounts[0]
        }
      } else if (amounts.length === 1) {
        const lower = withoutDate.toLowerCase()
        if (lower.includes('cr') || lower.includes('dep') || lower.includes('upi/cr')) {
          credit = amounts[0]
        } else {
          debit = amounts[0]
        }
      }

      if (debit === 0 && credit === 0) continue

      const amount = debit > 0 ? debit : credit
      const type: 'DEBIT' | 'CREDIT' = debit > 0 ? 'DEBIT' : 'CREDIT'

      // Extract narration: text before the first amount
      const narration = extractNarrationFromLine(withoutDate, amounts[0])

      const { categorySlug, confidence } = categorizeTransaction(narration)
      const merchant = extractMerchant(narration)

      transactions.push({
        date,
        rawNarration: narration.trim(),
        merchant,
        amount,
        type,
        runningBalance: balance || undefined,
        bankTxnId: extractRefNumber(narration),
        categorySlug,
        confidence: confidence * 0.85,
        parseWarning: amounts.length === 1 ? 'Single amount found — type may need verification' : undefined,
      })
    }

    if (transactions.length === 0) {
      warnings.push('SBI PDF parser found 0 transactions. Statement format may be unsupported. Try CSV/Excel export from YONO app.')
    }

    return {
      transactions,
      totalFound: transactions.length,
      parserName: this.name,
      bankDetected: this.bankName,
      warnings,
      errors,
      dateRange: getDateRange(transactions),
    }
  }
}

// ---- Helpers ----

function parseCsvRow(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function detectSBIColumns(headers: string[]): Record<string, number> | null {
  const map: Record<string, number> = {}

  headers.forEach((h, i) => {
    const clean = h.replace(/[^a-z0-9\s]/g, '').trim()
    
    // Date column - prefer "date" over "value date"
    if ((clean === 'date' || clean === 'txn date' || clean === 'transaction date' || clean === 'posting date') && map['date'] === undefined) {
      map['date'] = i
    }
    
    // Narration/description
    if ((clean.includes('narration') || clean.includes('description') || clean.includes('details') || clean.includes('particulars')) && map['narration'] === undefined) {
      map['narration'] = i
    }
    
    // Debit
    if ((clean === 'debit' || clean.includes('withdrawal') || clean === 'dr' || clean === 'debit amt') && !clean.includes('credit') && map['debit'] === undefined) {
      map['debit'] = i
    }
    
    // Credit  
    if ((clean === 'credit' || clean.includes('deposit') || clean === 'cr' || clean === 'credit amt') && !clean.includes('debit') && map['credit'] === undefined) {
      map['credit'] = i
    }
    
    // Balance
    if ((clean.includes('balance') || clean === 'closing balance') && map['balance'] === undefined) {
      map['balance'] = i
    }
    
    // Reference
    if ((clean.includes('ref') || clean.includes('chq') || clean.includes('cheque') || clean.includes('utr')) && map['ref'] === undefined) {
      map['ref'] = i
    }
  })

  // Must have at minimum: date + (debit OR credit)
  if (map['date'] === undefined) return null
  if (map['debit'] === undefined && map['credit'] === undefined) return null
  
  return map
}

function extractAmounts(str: string): number[] {
  // Match amounts like 1,234.56 or 1234.56
  const matches = str.match(/\d{1,3}(?:,\d{3})*\.\d{2}/g) || []
  return matches.map(m => parseAmount(m)).filter(n => n > 0)
}

function extractNarrationFromLine(line: string, firstAmount: number): string {
  // Remove amounts from end of line
  const amountPattern = /\s*\d{1,3}(?:,\d{3})*\.\d{2}\s*/g
  // Find the position of the first amount
  const firstAmountStr = firstAmount.toFixed(2)
  const idx = line.search(new RegExp(firstAmountStr.replace('.', '\\.').replace(',', ',')))
  if (idx > 0) {
    return line.slice(0, idx).trim()
  }
  return line.replace(amountPattern, ' ').trim().slice(0, 100)
}

function extractRefNumber(narration: string): string | undefined {
  // UPI reference: 12-digit number after UPI/CR/ or UPI/DR/
  const upiRef = narration.match(/UPI\/(?:CR|DR)\/(\d+)/i)
  if (upiRef) return upiRef[1]
  
  // UTR number
  const utrRef = narration.match(/(?:UTR|REF|TXN)[\/\s:]?([A-Z0-9]{10,22})/i)
  if (utrRef) return utrRef[1]
  
  // SBIY reference number
  const sbiyRef = narration.match(/SBIY(\d{18,})/i)
  if (sbiyRef) return 'SBIY' + sbiyRef[1]
  
  return undefined
}

function getPreviousBalance(transactions: CanonicalTransaction[]): number | undefined {
  for (let i = transactions.length - 1; i >= 0; i--) {
    if (transactions[i].runningBalance !== undefined) {
      return transactions[i].runningBalance
    }
  }
  return undefined
}

function getDateRange(txns: CanonicalTransaction[]): { from: Date; to: Date } | undefined {
  if (txns.length === 0) return undefined
  const sorted = [...txns].sort((a, b) => a.date.getTime() - b.date.getTime())
  return { from: sorted[0].date, to: sorted[sorted.length - 1].date }
}
