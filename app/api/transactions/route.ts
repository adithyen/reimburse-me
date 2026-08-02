import { NextResponse } from 'next/server'
import { getOrCreateAuthUser } from '@/lib/auth-user'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// GET /api/transactions
export async function GET(request: Request) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '50')
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const categoryId = searchParams.get('categoryId')
  const accountId = searchParams.get('accountId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const amountMin = searchParams.get('amountMin')
  const amountMax = searchParams.get('amountMax')

  const where: Prisma.TransactionWhereInput = {
    userId: user.id,
    ...(search && {
      OR: [
        { merchant: { contains: search, mode: 'insensitive' } },
        { rawNarration: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(status && (
      status === 'UNASSIGNED'
        ? { status: { in: ['UNASSIGNED', 'PARTIAL'] } }
        : { status: status as Prisma.EnumTransactionStatusFilter }
    )),
    ...(type && { type: type as Prisma.EnumTransactionTypeFilter }),
    ...(categoryId && { categoryId }),
    ...(accountId && { accountId }),
    ...(dateFrom && { date: { gte: new Date(dateFrom) } }),
    ...(dateTo && { date: { ...((dateFrom && { gte: new Date(dateFrom) }) || {}), lte: new Date(dateTo) } }),
    ...(amountMin && { amount: { gte: parseFloat(amountMin) } }),
    ...(amountMax && { amount: { ...((amountMin && { gte: parseFloat(amountMin) }) || {}), lte: parseFloat(amountMax) } }),
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: true,
        account: { select: { id: true, name: true, color: true } },
        debtTransactions: {
          select: {
            id: true,
            assignedAmount: true,
            debtRecord: {
              select: {
                id: true,
                person: { select: { id: true, name: true, color: true } },
              },
            },
          },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ])

  // Count unassigned and partial DEBIT transactions
  const unassignedCount = await prisma.transaction.count({
    where: { userId: user.id, status: { in: ['UNASSIGNED', 'PARTIAL'] }, type: 'DEBIT' },
  })

  return NextResponse.json({
    success: true,
    data: transactions,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      unassignedCount,
    },
  })
}

// POST /api/transactions — manual entry
export async function POST(request: Request) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    date,
    merchant,
    amount,
    type,
    categoryId,
    accountId,
    paymentMethod,
    notes,
    rawNarration,
    isRecoverable,
    tags,
  } = body

  if (!date || !amount || !type) {
    return NextResponse.json({ error: 'date, amount, and type are required' }, { status: 400 })
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId: user.id,
      date: new Date(date),
      merchant: merchant || null,
      rawNarration: rawNarration || null,
      amount: parseFloat(amount),
      type,
      categoryId: categoryId || null,
      accountId: accountId || null,
      paymentMethod: paymentMethod || null,
      notes: notes || null,
      isRecoverable: isRecoverable || false,
      tags: tags || [],
      source: 'MANUAL',
      status: 'UNASSIGNED',
    },
    include: { category: true, account: true },
  })

  return NextResponse.json({ success: true, data: transaction }, { status: 201 })
}

// DELETE /api/transactions — bulk delete or delete all
export async function DELETE(request: Request) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { ids, deleteAll } = body

  if (!deleteAll && (!Array.isArray(ids) || ids.length === 0)) {
    return NextResponse.json({ error: 'ids array or deleteAll: true required' }, { status: 400 })
  }

  const whereTxn = {
    userId: user.id,
    ...(deleteAll ? {} : { id: { in: ids as string[] } }),
  }

  // Find target transactions
  const txns = await prisma.transaction.findMany({
    where: whereTxn,
    include: { debtTransactions: true },
  })

  if (txns.length === 0) {
    return NextResponse.json({ success: true, count: 0 })
  }

  const targetIds = txns.map((t) => t.id)

  // Collect debt record adjustments
  const debtAdjustments = new Map<string, number>()
  for (const t of txns) {
    for (const dt of t.debtTransactions) {
      const current = debtAdjustments.get(dt.debtRecordId) || 0
      debtAdjustments.set(dt.debtRecordId, current + dt.assignedAmount)
    }
  }

  // Update debt records
  for (const [debtRecordId, decAmt] of debtAdjustments.entries()) {
    const debt = await prisma.debtRecord.findUnique({ where: { id: debtRecordId } })
    if (debt) {
      const newTotal = Math.max(0, debt.totalAmount - decAmt)
      const newOutstanding = Math.max(0, debt.outstandingAmount - decAmt)
      if (newTotal === 0 && debt.recoveredAmount === 0) {
        await prisma.debtRecord.delete({ where: { id: debtRecordId } }).catch(() => {})
      } else {
        await prisma.debtRecord.update({
          where: { id: debtRecordId },
          data: {
            totalAmount: newTotal,
            outstandingAmount: newOutstanding,
            ...(newOutstanding === 0 && { status: 'SETTLED' }),
          },
        }).catch(() => {})
      }
    }
  }

  // Delete debt transactions
  await prisma.debtTransaction.deleteMany({
    where: { transactionId: { in: targetIds } },
  })

  // Delete transactions
  const result = await prisma.transaction.deleteMany({
    where: { id: { in: targetIds }, userId: user.id },
  })

  return NextResponse.json({ success: true, count: result.count })
}
