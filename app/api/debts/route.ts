import { NextResponse } from 'next/server'
import { getOrCreateAuthUser } from '@/lib/auth-user'
import { prisma } from '@/lib/prisma'

// GET /api/debts
export async function GET(request: Request) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const personId = searchParams.get('personId')
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  const where = {
    userId: user.id,
    ...(personId && { personId }),
    ...(status && status !== 'all' ? { status: status as 'PENDING' | 'PARTIAL' | 'SETTLED' | 'CANCELLED' | 'OVERDUE' } : {}),
  }

  const [debts, total] = await Promise.all([
    prisma.debtRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        person: true,
        category: true,
        settlements: { orderBy: { settledAt: 'desc' }, take: 3 },
        debtTransactions: {
          include: { transaction: { select: { id: true, merchant: true, date: true, amount: true } } },
        },
      },
    }),
    prisma.debtRecord.count({ where }),
  ])

  // Compute overall summary
  const summary = await prisma.debtRecord.aggregate({
    where: { userId: user.id, status: { in: ['PENDING', 'PARTIAL'] } },
    _sum: { outstandingAmount: true, totalAmount: true, recoveredAmount: true },
    _count: { id: true },
  })

  return NextResponse.json({
    success: true,
    data: debts,
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    summary: {
      totalOutstanding: summary._sum.outstandingAmount || 0,
      totalDebt: summary._sum.totalAmount || 0,
      totalRecovered: summary._sum.recoveredAmount || 0,
      pendingCount: summary._count.id,
    },
  })
}

// POST /api/debts — create manual debt
export async function POST(request: Request) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { personId, title, amount, categoryId, notes, dueDate } = body

  if (!personId || !amount) {
    return NextResponse.json({ error: 'personId and amount are required' }, { status: 400 })
  }

  const person = await prisma.person.findFirst({ where: { id: personId, userId: user.id } })
  if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 })

  const debt = await prisma.debtRecord.create({
    data: {
      userId: user.id,
      personId,
      title: title || 'Expense',
      totalAmount: parseFloat(amount),
      recoveredAmount: 0,
      outstandingAmount: parseFloat(amount),
      status: 'PENDING',
      categoryId: categoryId || null,
      notes: notes || null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: { person: true, category: true },
  })

  return NextResponse.json({ success: true, data: debt }, { status: 201 })
}
