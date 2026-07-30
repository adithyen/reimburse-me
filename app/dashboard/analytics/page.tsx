'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, TrendingDown, PieChart, List } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart as RechartsPie, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatAmount } from '@/lib/utils'

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/dashboard')
      return (await res.json()).data
    },
  })

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Spending insights and recovery trends</p>
      </div>

      {/* 6-Month Trend — AreaChart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="finance-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Expense vs Recovery Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[280px] w-full rounded-xl" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data?.monthlyTrend || []}>
                  <defs>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={formatAmount} />
                  <Tooltip
                    formatter={(v: any, name: any) => [formatCurrency(Number(v) || 0), name === 'expenses' ? 'Expenses' : 'Recovered']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                  />
                  <Legend formatter={(v: string) => v === 'expenses' ? 'Expenses' : 'Recovered'} />
                  <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" fill="url(#expGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="recoveries" stroke="hsl(var(--primary))" fill="url(#recGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="finance-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" /> Spending by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[240px] w-full rounded-xl" /> : (
                data?.categoryBreakdown?.length > 0 ? (
                  <div className="space-y-2">
                    <ResponsiveContainer width="100%" height={160}>
                      <RechartsPie>
                        <Pie data={data.categoryBreakdown} cx="50%" cy="50%" outerRadius={70} dataKey="total" nameKey="categoryName" paddingAngle={2}>
                          {data.categoryBreakdown.map((entry: { color: string }, i: number) => (
                            <Cell key={i} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => formatCurrency(Number(v) || 0)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="space-y-1">
                      {data.categoryBreakdown.slice(0, 5).map((cat: { categoryName: string; color: string; total: number; percentage: number }) => (
                        <div key={cat.categoryName} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-xs text-muted-foreground flex-1">{cat.categoryName}</span>
                          <span className="text-xs font-medium text-foreground">{formatCurrency(cat.total)}</span>
                          <span className="text-[10px] text-muted-foreground w-8 text-right">{cat.percentage.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No expense data this month</p>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top people outstanding */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="finance-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <List className="h-4 w-4 text-primary" /> Top Outstanding Debts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data?.peopleSummary || []} layout="vertical" barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={formatAmount} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v) || 0)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    <Bar dataKey="totalOutstanding" radius={[0, 6, 6, 0]}>
                      {(data?.peopleSummary || []).map((p: { color: string }, i: number) => (
                        <Cell key={i} fill={p.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
