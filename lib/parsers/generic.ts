/**
 * Generic Bank Statement Parser
 * Fallback parser — handles any CSV/Excel/PDF that isn't caught by a bank-specific parser.
 * Uses aggressive heuristics to detect columns and extract transactions.
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

export class GenericParser implements IStatementParser {
  name = 'GenericParser'
  bankName = 'Generic'

  canParse(_content: string, _fileName: string): boolean {
    return true // Always last resort
  }

  async parse(content: string, _options?: ParseOptions): Promise<ParseResult> {
    const warnings: string[] = ['Using generic parser — some transactions may not be detected correctly.']
    const errors: string[] = []

    const isCsv = this.looksLikeCsv(content)

    if (isCsv) {
      return this.parseCsv(content, warnings, errors)
    } else {
      return this.parsePdfText(content, warnings, errors)
    }
  }

  private looksLikeCsv(content: string): boolean {
    const lines = content.split('\n').slice(0, 10)
    const commaCount = lines.join('\n').split(',').length - 1
    return commaCount >= 5
  }

  private parseCsv(content: string, warnings: string[], errors: string[]): ParseResult {
    const transactions: CanonicalTransaction[] = []

    // Join multiline quoted cells
    const rawLines = content.split('\n')
    const joinedLines = this.joinMultilineCells(rawLines)
    const lines = joinedLines.map(l => l.trim()).filter(Boolean)

    if (lines.length === 0) {
      errors.push('Empty file.')
      return { transactions, totalFound: 0, parserName: this.name, bankDetected: this.bankName, warnings, errors }
    }

    const delimiter = detectDelimiter(lines)

    // Find the best header row (highest score)
    let headerIdx = -1
    let headers: string[] = []
    let colMap: ReturnType<typeof detectGenericColumns> = {}
    let bestScore = -1

    for (let i = 0; i < Math.min(lines.length, 30); i++) {
      const cols = parseCsvRow(lines[i], delimiter)
      if (cols.length < 2) continue
      const candidateHeaders = cols.map(c => c.toLowerCase().replace(/['"]/g, '').trim())
      const cm = detectGenericColumns(candidateHeaders)
      let score = 0
      if (cm.date !== undefined) score += 10
      if (cm.narration !== undefined) score += 5
      if (cm.debit !== undefined) score += 4
      if (cm.credit !== undefined) score += 4
      if (cm.amount !== undefined) score += 3
      if (cm.balance !== undefined) score += 2

      if (score > bestScore && cm.date !== undefined) {
        bestScore = score
        headerIdx = i
        headers = candidateHeaders
        colMap = cm
      }
    }

    // If no header found with date, try finding by checking if first column is a date
    if (headerIdx === -1) {
      for (let i = 0; i < Math.min(lines.length, 20); i++) {
        const cols = parseCsvRow(lines[i], delimiter)
        if (cols.length >= 3 && parseDate(cols[0])) {
          // This looks like data starting at row i, with no header
          // Treat i-1 as header or just use defaults
          headerIdx = i - 1
          colMap = { date: 0, narration: 1 }
          if (cols.length >= 4) colMap = { date: 0, narration: 1, debit: 2, credit: 3 }
          if (cols.length >= 5) colMap.balance = 4
          warnings.push('No header row detected. Assuming Date, Narration, Debit, Credit, Balance layout.')
          break
        }
      }
    }

    if (headerIdx === -1) {
      errors.push('Could not find a valid header row in the file.')
      return { transactions, totalFound: 0, parserName: this.name, bankDetected: this.bankName, warnings, errors }
    }

    for (let i = Math.max(0, headerIdx + 1); i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue

      const cols = parseCsvRow(line, delimiter)
      if (cols.length < 2) continue

      try {
        const dateStr = (colMap.date !== undefined && colMap.date < cols.length ? cols[colMap.date] : '').trim()
        if (!dateStr) continue

        const date = parseDate(dateStr)
        if (!date) continue

        const narration = (colMap.narration !== undefined && colMap.narration < cols.length ? cols[colMap.narration] : 
          cols.slice(1, 3).join(' ')).replace(/[\r\n]+/g, ' ').trim()
        
        const debitStr = (colMap.debit !== undefined && colMap.debit < cols.length ? cols[colMap.debit] : '').trim()
        const creditStr = (colMap.credit !== undefined && colMap.credit < cols.length ? cols[colMap.credit] : '').trim()
        const amountStr = (colMap.amount !== undefined && colMap.amount < cols.length ? cols[colMap.amount] : '').trim()
        const balanceStr = (colMap.balance !== undefined && colMap.balance < cols.length ? cols[colMap.balance] : '').trim()
        const ref = (colMap.ref !== undefined && colMap.ref < cols.length ? cols[colMap.ref] : '').trim() || undefined
        const typeStr = (colMap.type !== undefined && colMap.type < cols.length ? cols[colMap.type] : '').trim().toUpperCase()

        let txn: CanonicalTransaction | null = null

        if (colMap.debit !== undefined || colMap.credit !== undefined) {
          const dc = detectDebitCredit(debitStr, creditStr)
          if (dc && dc.amount > 0) {
            txn = this.buildTxn(date, narration, dc.amount, dc.type, balanceStr, ref)
          }
        } else if (amountStr) {
          const rawAmount = parseAmount(amountStr)
          if (rawAmount === 0) continue

          let type: 'DEBIT' | 'CREDIT' = 'DEBIT'
          if (amountStr.startsWith('-') || amountStr.toUpperCase().includes('DR')) {
            type = 'DEBIT'
          } else if (amountStr.startsWith('+') || amountStr.toUpperCase().includes('CR')) {
            type = 'CREDIT'
          } else if (typeStr) {
            type = (typeStr.startsWith('CR') || typeStr.includes('CREDIT') || typeStr.includes('DEP')) ? 'CREDIT' : 'DEBIT'
          } else {
            const lower = narration.toLowerCase()
            if (lower.includes('received') || lower.includes('credited') || lower.includes('refund') ||
                lower.includes('salary') || lower.includes('reversal') || lower.includes('cashback')) {
              type = 'CREDIT'
            }
          }

          txn = this.buildTxn(date, narration, rawAmount, type, balanceStr, ref)
        } else {
          // Last resort: try to extract any numeric value from the line
          const allNums = extractAmountsFromLine(line)
          if (allNums.length > 0) {
            const amount = allNums[allNums.length > 1 ? allNums.length - 2 : 0]
            if (amount > 0) {
              const lower = narration.toLowerCase()
              const type: 'DEBIT' | 'CREDIT' = (lower.includes('cr') || lower.includes('credit') || lower.includes('dep')) ? 'CREDIT' : 'DEBIT'
              txn = this.buildTxn(date, narration, amount, type, '', ref)
            }
          }
        }

        if (txn) transactions.push(txn)
      } catch (e) {
        errors.push(`Row ${i + 1}: ${String(e)}`)
      }
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

  private buildTxn(
    date: Date,
    narration: string,
    amount: number,
    type: 'DEBIT' | 'CREDIT',
    balanceStr: string,
    ref: string | undefined
  ): CanonicalTransaction {
    const { categorySlug, confidence } = categorizeTransaction(narration)
    const merchant = extractMerchant(narration)

    return {
      date,
      rawNarration: narration.trim(),
      merchant,
      amount,
      type,
      runningBalance: parseAmount(balanceStr) || undefined,
      referenceNumber: ref,
      categorySlug,
      confidence,
    }
  }

  private joinMultilineCells(rawLines: string[]): string[] {
    const result: string[] = []
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i]
      if (result.length === 0) { result.push(line); continue }
      const last = result[result.length - 1]
      const quoteCount = (last.match(/"/g) || []).length
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
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean)

    // Multiple date patterns
    const DATE_PATTERNS = [
      /^(\d{2}[\/\-]\d{2}[\/\-]\d{4})\s+(.+)$/,
      /^(\d{2}\s+[A-Za-z]{3}\s+\d{4})\s+(.+)$/,
      /^(\d{4}[\/\-]\d{2}[\/\-]\d{2})\s+(.+)$/,
      /^(\d{2}[\/\-]\d{2}[\/\-]\d{2})\s+(.+)$/,
    ]

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      for (const pattern of DATE_PATTERNS) {
        const match = line.match(pattern)
        if (!match) continue

        const date = parseDate(match[1])
        if (!date) continue

        // Collect this line + next if it's a continuation
        let fullContent = line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]
          const nextIsDate = DATE_PATTERNS.some(p => nextLine.match(p))
          if (!nextIsDate && nextLine && !nextLine.match(/^(date|txn|balance|total|opening|closing)/i)) {
            fullContent = line + ' ' + nextLine
            i++
          }
        }

        const amounts = extractAmountsFromLine(fullContent)
        if (amounts.length === 0) continue

        let debit = 0, credit = 0, balance = 0
        const lower = fullContent.toLowerCase()

        if (amounts.length >= 3) {
          balance = amounts[amounts.length - 1]
          const prevBal = getPreviousBalance(transactions)
          if (prevBal !== undefined) {
            if (balance < prevBal - 0.01) debit = amounts[amounts.length - 2]
            else credit = amounts[amounts.length - 2]
          } else {
            if (lower.includes('dr') || lower.includes('wdl') || lower.includes('debit')) {
              debit = amounts[amounts.length - 2]
            } else if (lower.includes('cr') || lower.includes('dep') || lower.includes('credit')) {
              credit = amounts[amounts.length - 2]
            } else {
              debit = amounts[amounts.length - 2]
            }
          }
        } else if (amounts.length === 2) {
          balance = amounts[1]
          if (lower.includes('cr') || lower.includes('dep') || lower.includes('credit')) credit = amounts[0]
          else debit = amounts[0]
        } else {
          if (lower.includes('cr') || lower.includes('credit')) credit = amounts[0]
          else debit = amounts[0]
        }

        if (debit === 0 && credit === 0) continue

        const amount = debit > 0 ? debit : credit
        const type: 'DEBIT' | 'CREDIT' = debit > 0 ? 'DEBIT' : 'CREDIT'
        const narration = extractNarrationFromPdfLine(fullContent, match[1], amounts)

        const { categorySlug, confidence } = categorizeTransaction(narration)

        transactions.push({
          date,
          rawNarration: narration.trim(),
          merchant: extractMerchant(narration),
          amount,
          type,
          runningBalance: balance || undefined,
          categorySlug,
          confidence: confidence * 0.8,
          parseWarning: 'Generic PDF parser — please verify debit/credit type',
        })

        break
      }
    }

    if (transactions.length === 0) {
      errors.push('Could not parse any transactions from this PDF. Try exporting as CSV from your bank app for better results.')
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

function detectDelimiter(lines: string[]): string {
  const sample = lines.slice(0, 15).join('\n')
  const commas = (sample.match(/,/g) || []).length
  const semicolons = (sample.match(/;/g) || []).length
  const tabs = (sample.match(/\t/g) || []).length
  const pipes = (sample.match(/\|/g) || []).length

  if (tabs > commas && tabs > semicolons) return '\t'
  if (semicolons > commas && semicolons > tabs) return ';'
  if (pipes > commas) return '|'
  return ','
}

function parseCsvRow(line: string, delimiter: string = ','): string[] {
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
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^['"]+|['"]+$/g, ''))
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim().replace(/^['"]+|['"]+$/g, ''))
  return result
}

function detectGenericColumns(headers: string[]): {
  date?: number
  narration?: number
  debit?: number
  credit?: number
  amount?: number
  balance?: number
  ref?: number
  type?: number
} {
  const map: ReturnType<typeof detectGenericColumns> = {}

  headers.forEach((h, i) => {
    const clean = h.replace(/[^a-z0-9\s]/g, '').trim()

    // Date — prioritize exact "date" or "txn date"
    if (
      (clean === 'date' || clean === 'txn date' || clean === 'tran date' ||
       clean === 'transaction date' || clean === 'dt' || clean === 'posting date' ||
       clean === 'value date' || clean.startsWith('date ')) &&
      map.date === undefined
    ) {
      map.date = i
    }

    // Narration
    if (
      (clean.includes('narration') || clean.includes('description') || clean === 'details' ||
       clean.includes('particulars') || clean === 'remarks' || clean === 'merchant' ||
       clean === 'transaction details') &&
      map.narration === undefined
    ) {
      map.narration = i
    }

    // Debit (must NOT be inside "credit" column)
    if (
      (clean === 'debit' || clean === 'withdrawal' || clean === 'dr' || clean === 'dr amt' ||
       clean === 'debit amt' || clean === 'withdrawal amt' || clean === 'paid out' || clean === 'amount debited') &&
      !clean.includes('credit') &&
      map.debit === undefined
    ) {
      map.debit = i
    }

    // Credit
    if (
      (clean === 'credit' || clean === 'deposit' || clean === 'cr' || clean === 'cr amt' ||
       clean === 'credit amt' || clean === 'deposit amt' || clean === 'paid in' || clean === 'amount credited') &&
      !clean.includes('debit') &&
      map.credit === undefined
    ) {
      map.credit = i
    }

    // Amount (single column)
    if ((clean === 'amount' || clean === 'txn amount' || clean === 'transaction amount') && map.amount === undefined) {
      map.amount = i
    }

    // Balance
    if ((clean.includes('balance') || clean === 'closing' || clean === 'avl bal') && map.balance === undefined) {
      map.balance = i
    }

    // Reference
    if ((clean.includes('ref') || clean.includes('chq') || clean.includes('utr') || clean.includes('txn id') || clean.includes('cheque')) && map.ref === undefined) {
      map.ref = i
    }

    // Type
    if ((clean === 'type' || clean === 'txn type' || clean === 'cr dr' || clean === 'dr cr') && map.type === undefined) {
      map.type = i
    }
  })

  // Fallback date detection
  if (map.date === undefined) {
    headers.forEach((h, i) => {
      const clean = h.replace(/[^a-z0-9\s]/g, '').trim()
      if ((clean.includes('date') || clean.includes(' dt')) && map.date === undefined) {
        map.date = i
      }
    })
  }

  return map
}

function extractAmountsFromLine(str: string): number[] {
  const matches = str.match(/\d{1,3}(?:,\d{3})*\.\d{2}/g) || []
  return matches.map(m => parseAmount(m)).filter(n => n > 0)
}

function extractNarrationFromPdfLine(line: string, dateStr: string, amounts: number[]): string {
  let s = line.replace(dateStr, '').trim()
  // Remove trailing amounts
  for (const amt of amounts) {
    s = s.replace(amt.toFixed(2), '').replace(amt.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','), '')
  }
  s = s.replace(/\s{2,}/g, ' ').trim()
  // Remove trailing numbers
  s = s.replace(/[\d,\.]+\s*$/, '').trim()
  return s.slice(0, 120) || line.slice(0, 80)
}

function getPreviousBalance(transactions: CanonicalTransaction[]): number | undefined {
  for (let i = transactions.length - 1; i >= 0; i--) {
    if (transactions[i].runningBalance !== undefined) return transactions[i].runningBalance
  }
  return undefined
}

function getDateRange(txns: CanonicalTransaction[]): { from: Date; to: Date } | undefined {
  if (txns.length === 0) return undefined
  const sorted = [...txns].sort((a, b) => a.date.getTime() - b.date.getTime())
  return { from: sorted[0].date, to: sorted[sorted.length - 1].date }
}
