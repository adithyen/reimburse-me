import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.user.findUnique({ where: { authId: user.id }, include: { settings: true } })
}

// GET /api/analytics/dashboard
export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  // Run all queries in parallel
  const [
    accounts,
    debtSummary,
    monthlyExpenses,
    monthlyRecoveries,
    recentTransactions,
    unassignedCount,
    categoryBreakdown,
    monthlyTrend,
    peopleSummary,
    oldestDebt,
  ] = await Promise.all([
    // All accounts
    prisma.account.findMany({
      where: { userId: user.id, isActive: true },
      select: { currentBalance: true, targetBalance: true, isDefault: true, name: true },
    }),

    // Pending debt summary
    prisma.debtRecord.aggregate({
      where: { userId: user.id, status: { in: ['PENDING', 'PARTIAL'] } },
      _sum: { outstandingAmount: true, recoveredAmount: true, totalAmount: true },
      _count: { id: true },
    }),

    // This month's debits
    prisma.transaction.aggregate({
      where: { userId: user.id, type: 'DEBIT', date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
      _count: { id: true },
    }),

    // This month's settlements
    prisma.settlement.aggregate({
      where: { userId: user.id, settledAt: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),

    // Recent transactions
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 10,
      include: {
        category: true,
        account: { select: { name: true, color: true } },
      },
    }),

    // Unassigned DEBIT count
    prisma.transaction.count({
      where: { userId: user.id, status: 'UNASSIGNED', type: 'DEBIT' },
    }),

    // Category breakdown (this month)
    prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId: user.id, type: 'DEBIT', date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),

    // Monthly trend (last 6 months)
    Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(now, 5 - i)
        const from = startOfMonth(d)
        const to = endOfMonth(d)
        return Promise.all([
          prisma.transaction.aggregate({
            where: { userId: user.id, type: 'DEBIT', date: { gte: from, lte: to } },
            _sum: { amount: true },
          }),
          prisma.settlement.aggregate({
            where: { userId: user.id, settledAt: { gte: from, lte: to } },
            _sum: { amount: true },
          }),
          format(d, 'MMM yyyy'),
        ])
      })
    ),

    // People with outstanding debts
    prisma.person.findMany({
      where: { userId: user.id, isArchived: false },
      include: {
        debtRecords: {
          where: { status: { in: ['PENDING', 'PARTIAL'] } },
          select: { outstandingAmount: true },
        },
      },
      take: 10,
    }),

    // Oldest pending debt
    prisma.debtRecord.findFirst({
      where: { userId: user.id, status: { in: ['PENDING', 'PARTIAL'] } },
      orderBy: { createdAt: 'asc' },
      include: { person: { select: { name: true } } },
    }),
  ])

  // Resolve category names
  const categoryIds = categoryBreakdown.map((c) => c.categoryId).filter(Boolean) as string[]
  const categories = categoryIds.length > 0
    ? await prisma.category.findMany({ where: { id: { in: categoryIds } } })
    : []

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))
  const totalMonthExpenses = monthlyExpenses._sum.amount || 0
  const categoryData = categoryBreakdown.map((c) => ({
    categorySlug: categoryMap[c.categoryId || '']?.slug || 'others',
    categoryName: categoryMap[c.categoryId || '']?.name || 'Others',
    color: categoryMap[c.categoryId || '']?.color || '#94a3b8',
    total: c._sum.amount || 0,
    count: c._count.id,
    percentage: totalMonthExpenses > 0 ? ((c._sum.amount || 0) / totalMonthExpenses) * 100 : 0,
  }))

  // Monthly trend data
  const trendData = monthlyTrend.map(([expenses, recoveries, month]) => ({
    month,
    expenses: (expenses as { _sum: { amount: number | null } })._sum.amount || 0,
    recoveries: (recoveries as { _sum: { amount: number | null } })._sum.amount || 0,
    net: ((expenses as { _sum: { amount: number | null } })._sum.amount || 0) -
      ((recoveries as { _sum: { amount: number | null } })._sum.amount || 0),
  }))

  // Balance calculations
  const totalCurrentBalance = accounts.reduce((s, a) => s + a.currentBalance, 0)
  const targetBalance = user.settings?.targetBalance || 0
  const pendingRecoveries = debtSummary._sum.outstandingAmount || 0
  const projectedBalance = totalCurrentBalance + pendingRecoveries

  // People summary sorted by outstanding
  const peopleSummaryData = peopleSummary
    .map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      relationship: p.relationship,
      totalOutstanding: p.debtRecords.reduce((s, d) => s + d.outstandingAmount, 0),
    }))
    .filter((p) => p.totalOutstanding > 0)
    .sort((a, b) => b.totalOutstanding - a.totalOutstanding)
    .slice(0, 5)

  // Recovery rate
  const totalDebt = debtSummary._sum.totalAmount || 0
  const totalRecovered = debtSummary._sum.recoveredAmount || 0
  const recoveryRate = totalDebt > 0 ? (totalRecovered / totalDebt) * 100 : 0

  return NextResponse.json({
    success: true,
    data: {
      // Balance
      currentBalance: totalCurrentBalance,
      pendingRecoveries,
      projectedBalance,
      targetBalance,
      toTarget: Math.max(0, targetBalance - projectedBalance),

      // Monthly stats
      monthlyExpenses: totalMonthExpenses,
      monthlyRecoveries: monthlyRecoveries._sum.amount || 0,

      // Debt summary
      totalOutstanding: pendingRecoveries,
      totalDebt,
      totalRecovered,
      recoveryRate: Math.round(recoveryRate),
      pendingDebtCount: debtSummary._count.id,

      // Activity
      unassignedCount,
      recentTransactions,

      // Analytics
      categoryBreakdown: categoryData,
      monthlyTrend: trendData,
      peopleSummary: peopleSummaryData,

      // Insights
      largestPendingDebt: peopleSummaryData[0] || null,
      oldestDebt: oldestDebt
        ? {
            id: oldestDebt.id,
            person: oldestDebt.person.name,
            amount: oldestDebt.outstandingAmount,
            daysOld: Math.floor((now.getTime() - oldestDebt.createdAt.getTime()) / 86400000),
          }
        : null,
    },
  })
}
