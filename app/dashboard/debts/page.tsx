'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CreditCard, Plus, Users, TrendingDown, Clock, CheckCircle2, Filter, Pencil } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate, getDebtStatusColor, cn } from '@/lib/utils'
import { EditLabelModal } from '@/components/transactions/edit-label-modal'
import { toast } from 'sonner'
import Link from 'next/link'

type Debt = {
  id: string
  title: string
  totalAmount: number
  outstandingAmount: number
  recoveredAmount: number
  status: 'PENDING' | 'PARTIAL' | 'SETTLED' | 'OVERDUE' | 'CANCELLED'
  dueDate: string | null
  createdAt: string
  person: { id: string; name: string; color: string; relationship: string | null }
  category: { name: string; color: string } | null
  settlements: Array<{ amount: number; method: string; settledAt: string }>
}

const STATUS_OPTIONS = ['all', 'PENDING', 'PARTIAL', 'SETTLED', 'OVERDUE']

export default function DebtsPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [personFilter, setPersonFilter] = useState('all')
  const [editLabelOpen, setEditLabelOpen] = useState(false)
  const [editingDebt, setEditingDebt] = useState<{ id: string; title: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['debts', statusFilter, personFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ pageSize: '100' })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (personFilter !== 'all') params.set('personId', personFilter)
      const res = await fetch(`/api/debts?${params}`)
      return res.json()
    },
  })

  const { data: people } = useQuery({
    queryKey: ['people-list'],
    queryFn: async () => {
      const res = await fetch('/api/people')
      return (await res.json()).data
    },
  })

  const debts: Debt[] = data?.data || []
  const summary = data?.summary || {}

  const pendingDebts = debts
    .filter((d) => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(d.status))
    .slice()
    .sort((a, b) => {
      const dateA = new Date((a as any).debtTransactions?.[0]?.transaction?.date || a.createdAt).getTime()
      const dateB = new Date((b as any).debtTransactions?.[0]?.transaction?.date || b.createdAt).getTime()
      return dateA - dateB
    })

  const settledDebts = debts
    .filter((d) => d.status === 'SETTLED')
    .slice()
    .sort((a, b) => {
      const dateA = new Date((a as any).debtTransactions?.[0]?.transaction?.date || a.createdAt).getTime()
      const dateB = new Date((b as any).debtTransactions?.[0]?.transaction?.date || b.createdAt).getTime()
      return dateA - dateB
    })

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Debt Records</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {summary.pendingCount || 0} pending · {formatCurrency(summary.totalOutstanding || 0)} outstanding
          </p>
        </div>
        <Link href="/dashboard/people" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-white font-medium text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> Add via People
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Total Outstanding" value={formatCurrency(summary.totalOutstanding || 0)} color="primary" isLoading={isLoading} />
        <SummaryCard label="Total Recovered" value={formatCurrency(summary.totalRecovered || 0)} color="success" isLoading={isLoading} />
        <SummaryCard label="Total Debt Created" value={formatCurrency(summary.totalDebt || 0)} color="default" isLoading={isLoading} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
          <SelectTrigger className="w-36 text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={personFilter} onValueChange={(val) => setPersonFilter(val || 'all')}>
          <SelectTrigger className="w-40 text-sm">
            <SelectValue placeholder="All people" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All People</SelectItem>
            {people?.map((p: { id: string; name: string }) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Debt list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : debts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <CreditCard className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium text-foreground">No debt records found</p>
          <p className="text-sm text-muted-foreground mt-1">Assign transactions to people to create debt records</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Pending debts */}
          {pendingDebts.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Pending ({pendingDebts.length})
              </h2>
              {pendingDebts.map((debt, i) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  index={i}
                  onEditLabel={(d) => { setEditingDebt({ id: d.id, title: d.title }); setEditLabelOpen(true) }}
                />
              ))}
            </>
          )}

          {/* Settled debts */}
          {settledDebts.length > 0 && statusFilter === 'all' && (
            <>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1 mt-4">
                Settled ({settledDebts.length})
              </h2>
              {settledDebts.map((debt, i) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  index={i}
                  onEditLabel={(d) => { setEditingDebt({ id: d.id, title: d.title }); setEditLabelOpen(true) }}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Edit Label Modal */}
      <EditLabelModal
        open={editLabelOpen}
        onOpenChange={setEditLabelOpen}
        targetType="debt"
        targetId={editingDebt?.id || null}
        initialLabel={editingDebt?.title}
      />
    </div>
  )
}

function DebtCard({ debt, index, onEditLabel }: { debt: Debt; index: number; onEditLabel: (debt: Debt) => void }) {
  const statusColor = getDebtStatusColor(debt.status)
  const progressPct = debt.totalAmount > 0 ? (debt.recoveredAmount / debt.totalAmount) * 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className="finance-card card-hover">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-4">
            {/* Person avatar */}
            <Link href={`/dashboard/people/${debt.person.id}`}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: debt.person.color }}
              >
                {debt.person.name.charAt(0)}
              </div>
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {(() => {
                    const rawNarration = (debt as any).debtTransactions?.[0]?.transaction?.rawNarration
                    const primaryDescription = rawNarration || debt.title
                    const customLabel = (debt.title && debt.title !== rawNarration) ? debt.title : null

                    return (
                      <>
                        <p className="font-semibold text-foreground text-sm leading-snug break-all">{primaryDescription}</p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                          <span className="text-muted-foreground text-[11px]">Label:</span>
                          {customLabel ? (
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold text-[11px] flex items-center gap-1">
                              {customLabel}
                              <button
                                onClick={() => onEditLabel(debt)}
                                className="text-primary/70 hover:text-primary transition-colors p-0.5 ml-0.5"
                                title="Edit Debt Label"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                              —
                              <button
                                onClick={() => onEditLabel(debt)}
                                className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                                title="Add Label"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                        </div>
                      </>
                    )
                  })()}
                  <p className="text-xs text-muted-foreground mt-1">
                    <Link href={`/dashboard/people/${debt.person.id}`} className="hover:text-foreground transition-colors">
                      {debt.person.name}
                    </Link>
                    {debt.person.relationship && ` · ${debt.person.relationship}`}
                    {' · '}{formatDate(new Date((debt as any).debtTransactions?.[0]?.transaction?.date || debt.createdAt))}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-foreground">{formatCurrency(debt.outstandingAmount)}</p>
                  {debt.recoveredAmount > 0 && (
                    <p className="text-xs text-emerald-500">+{formatCurrency(debt.recoveredAmount)} paid</p>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {progressPct > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{Math.round(progressPct)}% recovered</p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5"
                  style={{ color: statusColor, borderColor: `${statusColor}40`, background: `${statusColor}10` }}
                >
                  {debt.status}
                </Badge>
                {debt.category && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: `${debt.category.color}15`, color: debt.category.color }}
                  >
                    {debt.category.name}
                  </span>
                )}
                {debt.dueDate && new Date(debt.dueDate) < new Date() && debt.status !== 'SETTLED' && (
                  <span className="text-[10px] text-red-500 flex items-center gap-0.5">
                    <Clock className="h-3 w-3" /> Overdue
                  </span>
                )}
                <Link href={`/dashboard/people/${debt.person.id}`} className="text-xs text-primary hover:underline font-medium ml-auto">
                  View →
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function SummaryCard({ label, value, color, isLoading }: {
  label: string
  value: string
  color: 'primary' | 'success' | 'default'
  isLoading: boolean
}) {
  const colorMap = {
    primary: 'text-primary',
    success: 'text-emerald-500',
    default: 'text-foreground',
  }

  return (
    <Card className="finance-card">
      <CardContent className="pt-4 pb-3">
        {isLoading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn('text-lg font-bold mt-1', colorMap[color])}>{value}</p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
