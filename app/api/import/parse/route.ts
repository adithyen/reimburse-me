import { NextResponse } from 'next/server'
import { getOrCreateAuthUser } from '@/lib/auth-user'
import { prisma } from '@/lib/prisma'
import { StatementParserFactory, extractPdfText, parseExcelToText } from '@/lib/parsers/factory'
import type { BankName } from '@/lib/parsers/types'

/**
 * POST /api/import/parse
 * Parses a statement file and returns preview rows.
 * Does NOT save to DB — that's /api/import/confirm.
 */
export async function POST(request: Request) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const password = formData.get('password') as string | null
    const forceBankName = formData.get('bankName') as BankName | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name
    const ext = fileName.split('.').pop()?.toLowerCase() || ''

    let textContent: string

    // Extract text based on file type
    try {
      if (ext === 'pdf') {
        textContent = await extractPdfText(buffer, password || undefined)
      } else if (['xlsx', 'xls'].includes(ext)) {
        textContent = await parseExcelToText(buffer, password || undefined)
      } else if (ext === 'csv' || ext === 'txt') {
        // Check if CSV is encrypted/binary excel file renamed to .csv
        const headerHex = buffer.slice(0, 8).toString('hex')
        if (headerHex.startsWith('d0cf11e0') || headerHex.startsWith('504b0304')) {
          // It's actually a binary xls/xlsx file renamed as .csv!
          textContent = await parseExcelToText(buffer, password || undefined)
        } else {
          textContent = buffer.toString('utf-8')
        }
      } else {
        return NextResponse.json({ error: 'Unsupported file type. Please upload PDF, CSV, or Excel.' }, { status: 400 })
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      if (errMsg.includes('NEEDS_PASSWORD')) {
        return NextResponse.json(
          { error: 'NEEDS_PASSWORD', message: 'This file is password-protected. Please enter the password to unlock it.' },
          { status: 422 }
        )
      }
      if (errMsg.includes('WRONG_PASSWORD')) {
        return NextResponse.json(
          { error: 'WRONG_PASSWORD', message: 'Incorrect password. Please try again.' },
          { status: 422 }
        )
      }
      throw e
    }

    // Parse transactions
    let result
    try {
      result = await StatementParserFactory.parse(
        fileName,
        textContent,
        forceBankName || undefined,
        { password: password || undefined }
      )
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      if (errMsg.includes('NEEDS_PASSWORD')) {
        return NextResponse.json(
          { error: 'NEEDS_PASSWORD', message: 'This file is password-protected. Please enter the password to unlock it.' },
          { status: 422 }
        )
      }
      if (errMsg.includes('WRONG_PASSWORD')) {
        return NextResponse.json(
          { error: 'WRONG_PASSWORD', message: 'Incorrect password. Please try again.' },
          { status: 422 }
        )
      }
      throw e
    }

    // Check for existing transactions (deduplication preview)
    const bankTxnIds = result.transactions
      .map((t) => t.bankTxnId)
      .filter(Boolean) as string[]

    const existingBankTxnIds = bankTxnIds.length > 0
      ? new Set(
          (await prisma.transaction.findMany({
            where: { userId: user.id, bankTxnId: { in: bankTxnIds } },
            select: { bankTxnId: true },
          })).map((t) => t.bankTxnId)
        )
      : new Set<string>()

    // Build preview rows
    const previewRows = result.transactions.map((txn, i) => ({
      id: `preview_${i}`,
      date: txn.date.toISOString().split('T')[0],
      rawDate: txn.date,
      merchant: txn.merchant || txn.rawNarration?.slice(0, 50) || 'Unknown',
      rawNarration: txn.rawNarration || '',
      amount: txn.amount,
      type: txn.type,
      runningBalance: txn.runningBalance,
      categorySlug: txn.categorySlug,
      referenceNumber: txn.referenceNumber,
      bankTxnId: txn.bankTxnId,
      confidence: txn.confidence || 0.5,
      warning: txn.parseWarning,
      isSelected: !existingBankTxnIds.has(txn.bankTxnId || ''),
      isDuplicate: existingBankTxnIds.has(txn.bankTxnId || ''),
      isEdited: false,
    }))

    return NextResponse.json({
      success: true,
      data: {
        previewRows,
        parserName: result.parserName,
        bankDetected: result.bankDetected,
        totalFound: result.totalFound,
        duplicates: existingBankTxnIds.size,
        warnings: result.warnings,
        errors: result.errors,
        dateRange: result.dateRange
          ? {
              from: result.dateRange.from.toISOString(),
              to: result.dateRange.to.toISOString(),
            }
          : null,
      },
    })
  } catch (e) {
    console.error('Import parse error:', e)
    const errMsg = e instanceof Error ? e.message : String(e)
    if (errMsg.includes('NEEDS_PASSWORD')) {
      return NextResponse.json(
        { error: 'NEEDS_PASSWORD', message: 'This file is password-protected. Please enter the password to unlock it.' },
        { status: 422 }
      )
    }
    if (errMsg.includes('WRONG_PASSWORD')) {
      return NextResponse.json(
        { error: 'WRONG_PASSWORD', message: 'Incorrect password. Please try again.' },
        { status: 422 }
      )
    }
    if (errMsg.includes('UNSUPPORTED_EXCEL_PASSWORD')) {
      return NextResponse.json(
        { error: 'UNSUPPORTED_EXCEL_PASSWORD', message: 'Encrypted Excel/CSV files are not supported natively. Please remove the password using Excel and upload again.' },
        { status: 422 }
      )
    }
    return NextResponse.json({ error: 'Failed to parse file: ' + errMsg }, { status: 500 })
  }
}
