'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Filter, Search, ArrowUpCircle, ArrowDownCircle, Tag, CheckSquare,
  Square, UserPlus, AlertTriangle, RefreshCw, X, ChevronDown, Inbox,
  List, SlidersHorizontal, Plus,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, formatDateShort, cn, truncate } from '@/lib/utils'
import { toast } from 'sonner'
import { useUIStore } from '@/store/ui-store'
import { PersonalLabelsDialog } from '@/components/transactions/personal-labels-dialog'
import { AddTransactionModal } from '@/components/transactions/add-transaction-modal'
import { EditLabelModal } from '@/components/transactions/edit-label-modal'

type Transaction = {
  id: string
  date: string
  merchant: string | null
  rawNarration: string | null
  amount: number
  type: 'DEBIT' | 'CREDIT'
  status: string
  source: string
  category: { name: string; color: string; slug: string } | null
  account: { name: string; color: string } | null
  debtTransactions: Array<{ debtRecord: { person: { name: string; color: string } } }>
  personalLabels?: Array<{ id: string; name: string; color: string }>
}

type Label = {
  id: string
  name: string
  color: string
}

type Person = {
  id: string
  name: string
  color: string
  relationship: string | null
}

export default function TransactionsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'inbox' | 'all'>('inbox')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editLabelOpen, setEditLabelOpen] = useState(false)
  const [editingTxn, setEditingTxn] = useState<{ id: string; merchant: string | null; rawNarration: string | null } | null>(null)
  const [assignSheetOpen, setAssignSheetOpen] = useState(false)
  const [assigningTxn, setAssigningTxn] = useState<string | null>(null)
  const [assignTitle, setAssignTitle] = useState('')
  const [personalSheetOpen, setPersonalSheetOpen] = useState(false)
  const [personalTxn, setPersonalTxn] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const { importModalOpen, setImportModalOpen } = useUIStore()

  const filters = tab === 'inbox'
    ? { status: 'UNASSIGNED', type: 'DEBIT' }
    : {}

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['transactions', tab, search, page],
    queryFn: async () => {
      const paramsObj: Record<string, string> = {
        page: String(page),
        pageSize: '50',
      }
      if (search) paramsObj.search = search
      if (tab === 'inbox') {
        paramsObj.status = 'UNASSIGNED'
        paramsObj.type = 'DEBIT'
      }
      const params = new URLSearchParams(paramsObj)
      const res = await fetch(`/api/transactions?${params}`)
      return res.json()
    },
  })

  const { data: people } = useQuery({
    queryKey: ['people-list'],
    queryFn: async () => {
      const res = await fetch('/api/people')
      return (await res.json()).data as Person[]
    },
  })

  const assignMutation = useMutation({
    mutationFn: async ({ txnId, personId, title }: { txnId: string; personId: string; title?: string }) => {
      const res = await fetch(`/api/transactions/${txnId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId, title: title || undefined }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Transaction assigned!')
      setAssignSheetOpen(false)
      setAssigningTxn(null)
      setAssignTitle('')
      setSelectedIds(new Set())
    },
    onError: (e: Error) => toast.error(e.message),
  })

  

  const unassignMutation = useMutation({
    mutationFn: async (txnId: string) => {
      const res = await fetch(`/api/transactions/${txnId}/unassign`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Transaction unassigned')
    },
  })
  const transactions: Transaction[] = data?.data || []
  const meta = data?.meta || { total: 0, unassignedCount: 0 }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkAssign = (personId: string) => {
    // Assign all selected transactions
    const ids = Array.from(selectedIds)
    Promise.all(ids.map((txnId) => assignMutation.mutateAsync({ txnId, personId })))
      .then(() => {
        toast.success(`${ids.length} transaction(s) assigned!`)
        setSelectedIds(new Set())
      })
      .catch((e) => toast.error(e.message))
  }

  const handleAssign = (txnId: string) => {
    const txn = transactions.find((t: any) => t.id === txnId)
    setAssigningTxn(txnId)
    setAssignTitle(txn?.merchant && txn.merchant !== txn.rawNarration ? txn.merchant : '')
    setAssignSheetOpen(true)
  }

  const handleOpenEditLabel = (txn: Transaction) => {
    setEditingTxn({ id: txn.id, merchant: txn.merchant, rawNarration: txn.rawNarration })
    setEditLabelOpen(true)
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          {meta.unassignedCount > 0 && (
            <p className="text-amber-500 text-sm mt-0.5">
              {meta.unassignedCount} transactions awaiting assignment
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setImportModalOpen(true)}
          >
            <Upload className="h-4 w-4" /> Import Statement
          </Button>
          <Button
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="gap-2 gradient-brand text-white border-0 shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" /> Add Manual
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search merchant, narration..."
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-3 rounded-xl gradient-brand text-white shadow-lg"
          >
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="text-xs gap-1"
                onClick={() => { setAssigningTxn(null); setAssignTitle(''); setAssignSheetOpen(true) }}
              >
                <UserPlus className="h-3.5 w-3.5" /> Assign Selected
              </Button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-white/80 hover:text-white underline ml-2"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setPage(1); setSelectedIds(new Set()) }}>
        <TabsList>
          <TabsTrigger value="inbox" className="gap-2">
            <Inbox className="h-4 w-4" />
            Inbox
            {meta.unassignedCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] bg-primary/20 text-primary border-0">
                {meta.unassignedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <List className="h-4 w-4" />
            All Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          <TransactionList
            transactions={transactions}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onAssign={handleAssign}
            onEditLabel={handleOpenEditLabel}
            onMarkPersonal={(txnId) => { setPersonalTxn(txnId); setPersonalSheetOpen(true) }}
            onUnassign={(txnId) => unassignMutation.mutate(txnId)}
            showAssignActions
          />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <TransactionList
            transactions={transactions}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onAssign={handleAssign}
            onEditLabel={handleOpenEditLabel}
            onMarkPersonal={(txnId) => { setPersonalTxn(txnId); setPersonalSheetOpen(true) }}
            onUnassign={(txnId) => unassignMutation.mutate(txnId)}
            showAssignActions={false}
          />
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={assignSheetOpen} onOpenChange={setAssignSheetOpen}>
        <DialogContent className="sm:max-w-md p-5 flex flex-col gap-4">
          <DialogHeader className="px-0 pb-0 flex-shrink-0">
            <DialogTitle>Assign to Person</DialogTitle>
          </DialogHeader>

          {/* Context of what is being assigned */}
          <div className="bg-muted/50 p-3 rounded-lg border border-border">
            {assigningTxn ? (() => {
              const txn = transactions.find((t: any) => t.id === assigningTxn);
              if (!txn) return null;
              return (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{txn.merchant || txn.rawNarration}</span>
                    <span className="text-xs text-muted-foreground">{formatDateShort(new Date(txn.date))}</span>
                  </div>
                  <span className={`text-sm font-bold ${txn.type === 'CREDIT' ? 'text-color-success' : ''}`}>
                    {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                  </span>
                </div>
              )
            })() : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{selectedIds.size} transactions selected</span>
              </div>
            )}
          </div>

          {/* Label / Title input */}
          {assigningTxn && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Transaction Label / Title (Optional)
              </label>
              <input
                type="text"
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                placeholder="e.g. Movie Ticket, Medicine, Dinner"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          <div className="space-y-2 overflow-y-auto max-h-[45vh] pr-1">
            {people?.map((person) => (
              <button
                key={person.id}
                onClick={() => {
                  if (assigningTxn) {
                    assignMutation.mutate({ txnId: assigningTxn, personId: person.id, title: assignTitle.trim() || undefined })
                  } else {
                    handleBulkAssign(person.id)
                  }
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors border border-transparent hover:border-primary/20"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: person.color }}
                >
                  {person.name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground text-sm">{person.name}</p>
                  {person.relationship && <p className="text-xs text-muted-foreground">{person.relationship}</p>}
                </div>
              </button>
            ))}
            {(!people || people.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No contacts yet. Add people first.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Personal Labels Dialog */}
      <PersonalLabelsDialog
        open={personalSheetOpen}
        onOpenChange={setPersonalSheetOpen}
        txnId={personalTxn}
      />

      {/* Manual Add Transaction Dialog */}
      <AddTransactionModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
      />

      {/* Edit Label Modal */}
      <EditLabelModal
        open={editLabelOpen}
        onOpenChange={setEditLabelOpen}
        targetType="transaction"
        targetId={editingTxn?.id || null}
        initialLabel={editingTxn?.merchant}
        rawNarration={editingTxn?.rawNarration}
      />
    </div>
  )
}

function TransactionList({
  transactions, isLoading, selectedIds, onToggleSelect, onAssign, onEditLabel, onMarkPersonal, onUnassign, showAssignActions,
}: {
  transactions: Transaction[]
  isLoading: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onAssign: (id: string) => void
  onEditLabel: (txn: Transaction) => void
  onMarkPersonal: (id: string) => void
  onUnassign: (id: string) => void
  showAssignActions: boolean
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-2xl">
        <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="font-medium text-foreground">No transactions found</p>
        <p className="text-sm text-muted-foreground mt-1">Import a bank statement to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {transactions.map((txn, i) => (
        <motion.div
          key={txn.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.02 }}
          className={cn(
            'flex items-center gap-3 px-3 py-3 rounded-xl group',
            'border border-transparent hover:border-border hover:bg-card',
            'transition-all duration-150',
            selectedIds.has(txn.id) && 'border-primary/30 bg-primary/5'
          )}
        >
          {/* Checkbox */}
          <button onClick={() => onToggleSelect(txn.id)} className="flex-shrink-0">
            {selectedIds.has(txn.id)
              ? <CheckSquare className="h-4 w-4 text-primary" />
              : <Square className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground" />}
          </button>

          {/* Type indicator */}
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            txn.type === 'CREDIT' ? 'bg-emerald-500/10' : 'bg-primary/10'
          )}>
            {txn.type === 'CREDIT'
              ? <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
              : <ArrowUpCircle className="h-4 w-4 text-primary" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground truncate" title={txn.rawNarration || txn.merchant || 'Transaction'}>
                {txn.rawNarration || txn.merchant || 'Transaction'}
              </p>
              {txn.category && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: `${txn.category.color}15`, color: txn.category.color }}
                >
                  {txn.category.name}
                </span>
              )}
              {txn.debtTransactions?.[0] && (
                <span className="text-[10px] text-primary font-medium">
                  → {txn.debtTransactions[0].debtRecord.person.name}
                </span>
              )}
              {txn.personalLabels?.map(l => (
                <span key={l.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${l.color}20`, color: l.color }}>
                  {l.name}
                </span>
              ))}
            </div>

            {/* Custom Label subtitle */}
            <div className="flex items-center gap-1.5 text-xs mt-0.5">
              <span className="text-muted-foreground text-[11px]">Label:</span>
              {txn.merchant && txn.merchant !== txn.rawNarration ? (
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold text-[11px]">
                  {txn.merchant}
                </span>
              ) : (
                <span className="text-muted-foreground text-[11px]">—</span>
              )}
              <span className="text-muted-foreground/60 text-[11px] ml-1">
                · {formatDateShort(new Date(txn.date))} · {txn.source}
                {txn.account && ` · ${txn.account.name}`}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div className="text-right flex-shrink-0">
            <p className={cn('font-bold text-sm', txn.type === 'CREDIT' ? 'text-emerald-500' : 'text-foreground')}>
              {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
            </p>
          </div>

          {/* Actions (visible on hover) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={() => onEditLabel(txn)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-muted text-foreground hover:bg-accent transition-colors"
              title="Edit Transaction Label"
            >
              <Tag className="h-3 w-3 text-primary" /> Label
            </button>
            {(showAssignActions || txn.status === 'UNASSIGNED') ? (
              <>
                <button
                  onClick={() => onAssign(txn.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                >
                  <UserPlus className="h-3 w-3" /> Assign
                </button>
                <button
                  onClick={() => onMarkPersonal(txn.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-muted text-muted-foreground hover:bg-accent transition-colors"
                >
                  Personal
                </button>
              </>
            ) : txn.status === 'ASSIGNED' ? (
              <>
                <button
                  onClick={() => onAssign(txn.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                >
                  Reassign
                </button>
                <button
                  onClick={() => onUnassign(txn.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                >
                  Unassign
                </button>
              </>
            ) : txn.status === 'PERSONAL' ? (
              <button
                  onClick={() => onMarkPersonal(txn.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-muted text-muted-foreground hover:bg-accent transition-colors"
                >
                  Edit Labels
              </button>
            ) : null}
          </div>

          {/* Status badge */}
          {txn.status !== 'UNASSIGNED' && (
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0 flex-shrink-0', {
                'badge-assigned': txn.status === 'ASSIGNED',
                'badge-personal': txn.status === 'PERSONAL',
                'badge-settled': txn.status === 'SETTLED',
              })}
            >
              {txn.status}
            </Badge>
          )}
        </motion.div>
      ))}
    </div>
  )
}
