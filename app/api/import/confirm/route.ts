import { NextResponse } from 'next/server'
import { getOrCreateAuthUser } from '@/lib/auth-user'
import { prisma } from '@/lib/prisma'
import { categorizeTransaction } from '@/lib/categorize'

/**
 * POST /api/import/confirm
 * Saves confirmed (user-reviewed) preview rows to the database.
 */
export async function POST(request: Request) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { rows, accountId, fileName, fileType, bankDetected, parserUsed } = body

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    // Get category map for this user
    const categories = await prisma.category.findMany({
      where: { OR: [{ userId: user.id }, { userId: null }] },
      select: { id: true, slug: true },
    })
    const categorySlugMap = Object.fromEntries(categories.map((c) => [c.slug, c.id]))

    // Create import batch record
    const batch = await prisma.importBatch.create({
      data: {
        userId: user.id,
        accountId: accountId || null,
        fileName: fileName || 'import',
        fileType: fileType || 'unknown',
        bankDetected: bankDetected || null,
        parserUsed: parserUsed || null,
        totalRows: rows.length,
        status: 'PROCESSING',
      },
    })

    let importedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    // Process rows in batches of 50
    const BATCH_SIZE = 50
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch_rows = rows.slice(i, i + BATCH_SIZE)

      await Promise.allSettled(
        batch_rows.map(async (row: {
          date: string
          merchant: string
          rawNarration: string
          amount: number
          type: 'DEBIT' | 'CREDIT'
          runningBalance?: number
          categorySlug?: string
          referenceNumber?: string
          bankTxnId?: string
          isSelected?: boolean
          paymentMethod?: string
          notes?: string
        }) => {
          if (!row.isSelected) return

          try {
            // Resolve category
            const catSlug = row.categorySlug || categorizeTransaction(row.rawNarration || row.merchant || '').categorySlug
            const categoryId = categorySlugMap[catSlug] || categorySlugMap['others'] || null

            // Upsert to handle concurrent imports gracefully
            await prisma.transaction.upsert({
              where: {
                userId_bankTxnId_accountId: {
                  userId: user.id,
                  bankTxnId: row.bankTxnId || `import_${Date.now()}_${i}`,
                  accountId: accountId || '',
                },
              },
              create: {
                userId: user.id,
                accountId: accountId || null,
                importBatchId: batch.id,
                date: new Date(row.date),
                merchant: row.merchant || null,
                rawNarration: row.rawNarration || null,
                amount: row.amount,
                type: row.type,
                runningBalance: row.runningBalance || null,
                referenceNumber: row.referenceNumber || null,
                categoryId,
                bankTxnId: row.bankTxnId || null,
                source: fileType === 'pdf' ? 'PDF' : fileType === 'csv' ? 'CSV' : 'EXCEL',
                importedAt: new Date(),
                status: 'UNASSIGNED',
              },
              update: {}, // If duplicate exists, do nothing
            })
            importedCount++
          } catch (e: unknown) {
            const errMsg = String(e)
            if (errMsg.includes('Unique constraint')) {
              skippedCount++
            } else {
              errors.push(errMsg)
            }
          }
        })
      )
    }

    // Update batch
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        importedRows: importedCount,
        skippedRows: skippedCount,
        errorRows: errors.length,
        status: errors.length === 0 ? 'COMPLETED' : importedCount > 0 ? 'PARTIAL' : 'FAILED',
        errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
      },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'IMPORT_COMPLETE',
        title: 'Import Complete',
        message: `${importedCount} transactions imported from ${fileName || 'statement'}. ${skippedCount > 0 ? `${skippedCount} duplicates skipped.` : ''}`,
        isRead: false,
        metadata: { batchId: batch.id, importedCount, skippedCount },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        batchId: batch.id,
        importedCount,
        skippedCount,
        errorCount: errors.length,
      },
    })
  } catch (e) {
    console.error('Import confirm error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
