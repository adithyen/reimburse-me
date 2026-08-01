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
    ...(status && { status: status as Prisma.EnumTransactionStatusFilter }),
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

  // Count unassigned DEBIT transactions
  const unassignedCount = await prisma.transaction.count({
    where: { userId: user.id, status: 'UNASSIGNED', type: 'DEBIT' },
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
