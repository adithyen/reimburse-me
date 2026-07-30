'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Wallet, Target, Users, ArrowUpRight,
  ArrowDownRight, Clock, Star, AlertCircle, BarChart3, RefreshCw,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDateShort, formatRelative, formatAmount, cn } from '@/lib/utils'
import Link from 'next/link'

async function fetchDashboard() {
  const res = await fetch('/api/analytics/dashboard')
  if (!res.ok) throw new Error('Failed to fetch dashboard data')
  const json = await res.json()
  return json.data
}

const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 60000, // refresh every minute
  })

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Failed to load dashboard</p>
          <button onClick={() => refetch()} className="mt-3 text-primary text-sm hover:underline">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Your financial recovery overview</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* ---- PRIMARY BALANCE CARDS ---- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BalanceCard
          title="Current Balance"
          amount={data?.currentBalance ?? 0}
          icon={<Wallet className="h-5 w-5" />}
          color="primary"
          subtitle="Across all accounts"
          isLoading={isLoading}
          index={0}
        />
        <BalanceCard
          title="Projected Balance"
          amount={data?.projectedBalance ?? 0}
          icon={<TrendingUp className="h-5 w-5" />}
          color="success"
          subtitle={`+${formatCurrency(data?.pendingRecoveries ?? 0)} pending recoveries`}
          isLoading={isLoading}
          index={1}
          highlight
        />
        <BalanceCard
          title="Target Balance"
          amount={data?.targetBalance ?? 0}
          icon={<Target className="h-5 w-5" />}
          color="warning"
          subtitle={data?.toTarget > 0 ? `₹${formatAmount(data?.toTarget)} more needed` : 'Target reached! 🎉'}
          isLoading={isLoading}
          index={2}
          progress={data?.targetBalance > 0 ? Math.min(100, ((data?.projectedBalance ?? 0) / data?.targetBalance) * 100) : 100}
        />
      </div>

      {/* ---- SECONDARY METRIC CARDS ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Pending Recoveries"
          value={formatCurrency(data?.pendingRecoveries ?? 0)}
          change={data?.pendingDebtCount ? `${data.pendingDebtCount} active debts` : 'None'}
          icon={<Clock className="h-4 w-4" />}
          isLoading={isLoading}
          index={3}
        />
        <MetricCard
          label="Monthly Expenses"
          value={formatCurrency(data?.monthlyExpenses ?? 0)}
          change="This month"
          icon={<ArrowUpRight className="h-4 w-4" />}
          trend="up"
          isLoading={isLoading}
          index={4}
        />
        <MetricCard
          label="Monthly Recovered"
          value={formatCurrency(data?.monthlyRecoveries ?? 0)}
          change="This month"
          icon={<ArrowDownRight className="h-4 w-4" />}
          trend="down"
          isLoading={isLoading}
          index={5}
        />
        <MetricCard
          label="Recovery Rate"
          value={`${data?.recoveryRate ?? 0}%`}
          change="All time"
          icon={<Star className="h-4 w-4" />}
          isLoading={isLoading}
          index={6}
        />
      </div>

      {/* ---- CHARTS ROW ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Trend Chart */}
        <motion.div
          custom={7}
          initial="hidden"
          animate="visible"
          variants={FADE_UP}
          className="lg:col-span-2"
        >
          <Card className="h-full finance-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Monthly Expenses vs Recoveries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[220px] w-full rounded-xl" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data?.monthlyTrend || []} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatAmount(v)} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    />
                    <Bar dataKey="expenses" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="recoveries" fill="hsl(var(--color-success))" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Pie */}
        <motion.div custom={8} initial="hidden" animate="visible" variants={FADE_UP}>
          <Card className="h-full finance-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[220px] w-full rounded-xl" />
              ) : data?.categoryBreakdown?.length > 0 ? (() => {
                const total = data.categoryBreakdown.reduce((s: number, c: any) => s + c.total, 0)
                const top = data.categoryBreakdown.slice(0, 6)
                return (
                  <div className="flex items-center gap-4">
                    {/* Donut */}
                    <div className="flex-shrink-0">
                      <ResponsiveContainer width={140} height={140}>
                        <PieChart>
                          <Pie
                            data={top}
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={64}
                            paddingAngle={3}
                            dataKey="total"
                            nameKey="categoryName"
                          >
                            {top.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => formatCurrency(Number(value) || 0)}
                            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Legend */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {top.map((cat: any, i: number) => {
                        const pct = total > 0 ? Math.round((cat.total / total) * 100) : 0
                        return (
                          <div key={i} className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-xs text-foreground truncate flex-1 capitalize">
                              {cat.categoryName?.replace(/-/g, ' ') || 'others'}
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-xs font-semibold text-foreground">{formatCurrency(cat.total)}</span>
                              <span className="text-[10px] text-muted-foreground w-7 text-right">{pct}%</span>
                            </div>
                          </div>
                        )
                      })}
                      {data.categoryBreakdown.length > 6 && (
                        <p className="text-[10px] text-muted-foreground pt-1">
                          +{data.categoryBreakdown.length - 6} more categories
                        </p>
                      )}
                    </div>
                  </div>
                )
              })() : (
                <EmptyChart message="No transactions this month" />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ---- PEOPLE + RECENT ACTIVITY ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Who Owes You */}
        <motion.div custom={9} initial="hidden" animate="visible" variants={FADE_UP}>
          <Card className="finance-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Who Owes You
                </CardTitle>
                <Link href="/dashboard/people" className="text-xs text-primary hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))
              ) : data?.peopleSummary?.length > 0 ? (
                data.peopleSummary.map((person: { id: string; color: string; name: string; relationship: string | null; totalOutstanding: number }) => (
                  <Link
                    key={person.id}
                    href={`/dashboard/people/${person.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent transition-colors group"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: person.color }}
                    >
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{person.name}</p>
                      {person.relationship && (
                        <p className="text-xs text-muted-foreground">{person.relationship}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatCurrency(person.totalOutstanding)}</p>
                      <p className="text-xs text-muted-foreground">pending</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No pending debts</p>
                  <Link href="/dashboard/people" className="text-xs text-primary hover:underline mt-1 block">
                    Add people
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div custom={10} initial="hidden" animate="visible" variants={FADE_UP}>
          <Card className="finance-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
                <div className="flex items-center gap-2">
                  {data?.unassignedCount > 0 && (
                    <Badge variant="secondary" className="text-xs bg-primary/15 text-primary border-primary/30">
                      {data.unassignedCount} unassigned
                    </Badge>
                  )}
                  <Link href="/dashboard/transactions" className="text-xs text-primary hover:underline">View all</Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full rounded-lg" />
                ))
              ) : data?.recentTransactions?.length > 0 ? (
                data.recentTransactions.slice(0, 6).map((txn: {
                  id: string
                  date: string
                  merchant: string | null
                  rawNarration: string | null
                  amount: number
                  type: string
                  status: string
                  category: { color: string; name: string } | null
                }) => (
                  <div
                    key={txn.id}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs"
                      style={{ background: txn.category?.color ? `${txn.category.color}20` : 'hsl(var(--muted))' }}
                    >
                      <span style={{ color: txn.category?.color || 'hsl(var(--muted-foreground))' }}>
                        {txn.type === 'CREDIT' ? '↑' : '↓'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {txn.merchant || txn.rawNarration?.slice(0, 30) || 'Transaction'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatDateShort(new Date(txn.date))}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'text-xs font-bold',
                        txn.type === 'CREDIT' ? 'text-emerald-500' : 'text-foreground'
                      )}>
                        {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </p>
                      {txn.status === 'UNASSIGNED' && txn.type === 'DEBIT' && (
                        <span className="text-[10px] text-amber-500">Unassigned</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No transactions yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Import a statement to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ---- QUICK INSIGHTS ---- */}
      {!isLoading && data?.oldestDebt && (
        <motion.div custom={11} initial="hidden" animate="visible" variants={FADE_UP}>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Oldest pending debt — {data.oldestDebt.person}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.oldestDebt.amount)} outstanding for {data.oldestDebt.daysOld} days
                </p>
              </div>
              <Link
                href="/dashboard/people"
                className="text-xs text-amber-500 font-medium hover:underline"
              >
                View →
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

// ---- Sub-components ----

function BalanceCard({
  title, amount, icon, color, subtitle, isLoading, index, highlight, progress,
}: {
  title: string
  amount: number
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning'
  subtitle?: string
  isLoading: boolean
  index: number
  highlight?: boolean
  progress?: number
}) {
  const colorMap = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    success: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    warning: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  }

  return (
    <motion.div custom={index} initial="hidden" animate="visible" variants={FADE_UP}>
      <Card className={cn('finance-card card-hover', highlight && 'border-primary/30 bg-primary/5')}>
        <CardContent className="pt-5 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
                <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center', colorMap[color])}>
                  {icon}
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground tracking-tight">
                {formatCurrency(amount)}
              </p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
              {progress !== undefined && (
                <div className="mt-3">
                  <Progress value={progress} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground mt-1">{Math.round(progress)}% of target</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function MetricCard({
  label, value, change, icon, trend, isLoading, index,
}: {
  label: string
  value: string
  change?: string
  icon: React.ReactNode
  trend?: 'up' | 'down'
  isLoading: boolean
  index: number
}) {
  return (
    <motion.div custom={index} initial="hidden" animate="visible" variants={FADE_UP}>
      <Card className="finance-card">
        <CardContent className="pt-4 pb-3">
          {isLoading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-1.5 text-muted-foreground">
                {icon}
                <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{value}</p>
              {change && <p className="text-[11px] text-muted-foreground mt-0.5">{change}</p>}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
