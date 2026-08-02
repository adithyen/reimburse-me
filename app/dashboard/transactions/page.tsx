'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Filter, Search, ArrowUpCircle, ArrowDownCircle, Tag, CheckSquare,
  Square, UserPlus, AlertTriangle, RefreshCw, X, ChevronDown, Inbox,
  List, SlidersHorizontal, Plus, Trash2, Split, Calculator, Percent,
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
  debtTransactions: Array<{
    id: string
    assignedAmount: number
    debtRecord: { id: string; person: { id: string; name: string; color: string } }
  }>
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

  // Delete confirmation state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'single' | 'selected' | 'all'
    id?: string
    count?: number
  } | null>(null)

  // Split assignment state
  const [splitMode, setSplitMode] = useState<'full' | 'equal' | 'custom'>('full')
  const [equalSplitWays, setEqualSplitWays] = useState<number>(2)
  const [customAmountStr, setCustomAmountStr] = useState<string>('')

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
    mutationFn: async ({
      txnId,
      personId,
      title,
      assignedAmount,
    }: {
      txnId: string
      personId: string
      title?: string
      assignedAmount?: number
    }) => {
      const res = await fetch(`/api/transactions/${txnId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId,
          title: title || undefined,
          assignedAmount: assignedAmount !== undefined ? assignedAmount : undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['people-list'] })
      toast.success('Transaction assigned!')
      setAssignSheetOpen(false)
      setAssigningTxn(null)
      setAssignTitle('')
      setSplitMode('full')
      setCustomAmountStr('')
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
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['people-list'] })
      toast.success('Transaction unassigned')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (target: { type: 'single' | 'selected' | 'all'; id?: string }) => {
      if (target.type === 'single' && target.id) {
        const res = await fetch(`/api/transactions/${target.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete transaction')
        return res.json()
      } else if (target.type === 'selected') {
        const ids = Array.from(selectedIds)
        const res = await fetch('/api/transactions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete transactions')
        return res.json()
      } else if (target.type === 'all') {
        const res = await fetch('/api/transactions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleteAll: true }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete all transactions')
        return res.json()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['people-list'] })
      toast.success('Transaction(s) deleted successfully')
      setDeleteModalOpen(false)
      setDeleteTarget(null)
      setSelectedIds(new Set())
    },
    onError: (e: Error) => toast.error(e.message),
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
    setSplitMode('full')
    setEqualSplitWays(2)
    setCustomAmountStr('')
    setAssignSheetOpen(true)
  }

  const activeTxn = assigningTxn ? transactions.find((t: any) => t.id === assigningTxn) : null
  const activeTxnAlreadyAssigned = activeTxn?.debtTransactions?.reduce((sum: number, dt: any) => sum + (dt.assignedAmount || 0), 0) || 0
  const activeTxnRemaining = activeTxn ? Math.max(0, activeTxn.amount - activeTxnAlreadyAssigned) : 0

  const effectiveAssignAmount = (() => {
    if (!activeTxn) return undefined
    if (splitMode === 'full') {
      return activeTxnRemaining > 0 ? activeTxnRemaining : activeTxn.amount
    }
    if (splitMode === 'equal') {
      const ways = Math.max(2, equalSplitWays)
      const perShare = Math.round((activeTxn.amount / ways) * 100) / 100
      return Math.min(activeTxn.amount, perShare)
    }
    if (splitMode === 'custom') {
      const val = parseFloat(customAmountStr)
      if (isNaN(val) || val <= 0) return activeTxnRemaining > 0 ? activeTxnRemaining : activeTxn.amount
      return Math.min(activeTxn.amount, Math.round(val * 100) / 100)
    }
    return activeTxn.amount
  })()

  const handleOpenEditLabel = (txn: Transaction) => {
    setEditingTxn({ id: txn.id, merchant: txn.merchant, rawNarration: txn.rawNarration })
    setEditLabelOpen(true)
  }

  const handleDeleteSingle = (id: string) => {
    setDeleteTarget({ type: 'single', id, count: 1 })
    setDeleteModalOpen(true)
  }

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return
    setDeleteTarget({ type: 'selected', count: selectedIds.size })
    setDeleteModalOpen(true)
  }

  const handleDeleteAll = () => {
    setDeleteTarget({ type: 'all', count: meta.total })
    setDeleteModalOpen(true)
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
        <div className="flex items-center gap-2 flex-wrap">
          {meta.total > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive"
              onClick={handleDeleteAll}
              title="Delete all transactions to re-import fresh"
            >
              <Trash2 className="h-4 w-4" /> Clear All
            </Button>
          )}
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
              <Button
                size="sm"
                variant="destructive"
                className="text-xs gap-1 bg-red-600/90 hover:bg-red-700 text-white border-0"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Selected ({selectedIds.size})
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
            onDelete={handleDeleteSingle}
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
            onDelete={handleDeleteSingle}
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

      {/* Delete Confirmation Warning Dialog */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-foreground">
              {deleteTarget?.type === 'all'
                ? 'Are you sure you want to delete ALL transactions from your account?'
                : deleteTarget?.type === 'selected'
                ? `Are you sure you want to delete ${deleteTarget.count} selected transaction(s)?`
                : 'Are you sure you want to delete this transaction?'}
            </p>
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="block font-semibold">⚠️ Cause & Impact Warning:</strong>
                <p className="leading-relaxed">
                  Deleting transaction(s) will permanently remove them along with any associated <strong>debt assignments</strong>, <strong>reimbursement calculations</strong>, and <strong>custom labels</strong>.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  You can re-import your bank statement anytime to start fresh.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
              className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4" />
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignSheetOpen} onOpenChange={setAssignSheetOpen}>
        <DialogContent className="sm:max-w-lg p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-0 pb-0 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {assigningTxn ? 'Assign / Split Transaction' : 'Assign Transactions'}
            </DialogTitle>
          </DialogHeader>

          {/* Context of what is being assigned */}
          <div className="bg-muted/50 p-3.5 rounded-xl border border-border">
            {activeTxn ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold truncate text-foreground">
                      {activeTxn.merchant || activeTxn.rawNarration}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateShort(new Date(activeTxn.date))} · {activeTxn.source}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-bold ${activeTxn.type === 'CREDIT' ? 'text-emerald-500' : 'text-foreground'}`}>
                      {activeTxn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(activeTxn.amount)}
                    </span>
                  </div>
                </div>

                {/* Existing assignments if any */}
                {activeTxn.debtTransactions && activeTxn.debtTransactions.length > 0 && (
                  <div className="pt-2 border-t border-border/50 text-xs flex items-center justify-between text-muted-foreground">
                    <span>Already assigned: <strong className="text-foreground">{formatCurrency(activeTxnAlreadyAssigned)}</strong></span>
                    <span>Remaining: <strong className="text-primary">{formatCurrency(activeTxnRemaining)}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{selectedIds.size} transactions selected</span>
              </div>
            )}
          </div>

          {/* Split Mode Selector (only for single transaction assignment) */}
          {assigningTxn && activeTxn && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Assignment Mode
                </label>
                {effectiveAssignAmount && (
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    Assigning {formatCurrency(effectiveAssignAmount)}
                  </span>
                )}
              </div>

              {/* Mode Tabs */}
              <div className="grid grid-cols-3 p-1 rounded-xl bg-muted/70 border border-border text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setSplitMode('full')}
                  className={cn(
                    'py-2 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5',
                    splitMode === 'full'
                      ? 'bg-card text-foreground font-semibold shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span>Full Amount</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('equal')}
                  className={cn(
                    'py-2 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5',
                    splitMode === 'equal'
                      ? 'bg-card text-foreground font-semibold shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Split className="h-3.5 w-3.5" />
                  <span>Equal Split</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSplitMode('custom')
                    if (!customAmountStr) setCustomAmountStr(String(Math.round(activeTxn.amount / 2)))
                  }}
                  className={cn(
                    'py-2 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5',
                    splitMode === 'custom'
                      ? 'bg-card text-foreground font-semibold shadow-sm border border-border/50'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Calculator className="h-3.5 w-3.5" />
                  <span>Custom (₹)</span>
                </button>
              </div>

              {/* Equal Split Sub-controls */}
              {splitMode === 'equal' && (
                <div className="p-3.5 rounded-xl bg-card border border-border space-y-3 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      Split equally between:
                    </span>
                    <div className="flex items-center gap-1">
                      {[2, 3, 4, 5, 6].map((ways) => (
                        <button
                          key={ways}
                          type="button"
                          onClick={() => setEqualSplitWays(ways)}
                          className={cn(
                            'w-8 h-7 rounded-lg text-xs font-bold border transition-all',
                            equalSplitWays === ways
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                          )}
                        >
                          {ways}
                        </button>
                      ))}
                      <div className="flex items-center gap-1 ml-1">
                        <input
                          type="number"
                          min="2"
                          max="50"
                          value={equalSplitWays}
                          onChange={(e) => setEqualSplitWays(Math.max(2, parseInt(e.target.value) || 2))}
                          className="w-12 h-7 px-1.5 text-xs text-center font-bold rounded-lg border border-border bg-muted/40 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-[11px] text-muted-foreground">ways</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-muted/50 p-2.5 rounded-lg border border-border/40">
                    <div>
                      <span className="text-muted-foreground">Each person's share: </span>
                      <span className="font-bold text-foreground text-sm">
                        {formatCurrency(Math.round((activeTxn.amount / Math.max(2, equalSplitWays)) * 100) / 100)}
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                      Assign 1 share
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    💡 <strong>Flexible Split:</strong> Only 1 share ({formatCurrency(Math.round((activeTxn.amount / Math.max(2, equalSplitWays)) * 100) / 100)}) will be assigned to the selected person. You are not forced to assign the other shares.
                  </p>
                </div>
              )}

              {/* Custom Split Sub-controls */}
              {splitMode === 'custom' && (
                <div className="p-3.5 rounded-xl bg-card border border-border space-y-3 shadow-sm">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium block">
                      Enter exact amount to assign to this person:
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        max={activeTxn.amount}
                        value={customAmountStr}
                        onChange={(e) => setCustomAmountStr(e.target.value)}
                        placeholder="e.g. 20.00"
                        className="w-full pl-7 pr-3.5 py-2 text-sm font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>

                  {/* Quick percentage presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: '25%', frac: 0.25 },
                      { label: 'Half (50%)', frac: 0.5 },
                      { label: '75%', frac: 0.75 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setCustomAmountStr((activeTxn.amount * preset.frac).toFixed(2))}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors"
                      >
                        {preset.label} (₹{(activeTxn.amount * preset.frac).toFixed(0)})
                      </button>
                    ))}
                  </div>

                  {parseFloat(customAmountStr) > 0 && parseFloat(customAmountStr) < activeTxn.amount && (
                    <div className="text-[11px] flex items-center justify-between text-muted-foreground bg-muted/30 p-2 rounded-lg">
                      <span>Remaining unassigned:</span>
                      <span className="font-bold text-foreground">
                        {formatCurrency(Math.max(0, activeTxn.amount - parseFloat(customAmountStr)))}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

          {/* People list */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Select Person to Assign:
            </label>
            <div className="space-y-1.5 overflow-y-auto max-h-[35vh] pr-1">
              {people?.map((person) => (
                <button
                  key={person.id}
                  onClick={() => {
                    if (assigningTxn) {
                      assignMutation.mutate({
                        txnId: assigningTxn,
                        personId: person.id,
                        title: assignTitle.trim() || undefined,
                        assignedAmount: effectiveAssignAmount,
                      })
                    } else {
                      handleBulkAssign(person.id)
                    }
                  }}
                  disabled={assignMutation.isPending}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-accent transition-colors border border-border/50 hover:border-primary/30 group text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: person.color }}
                    >
                      {person.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{person.name}</p>
                      {person.relationship && <p className="text-xs text-muted-foreground truncate">{person.relationship}</p>}
                    </div>
                  </div>
                  {effectiveAssignAmount && (
                    <span className="text-xs font-semibold text-primary group-hover:underline flex-shrink-0 ml-2">
                      Assign {formatCurrency(effectiveAssignAmount)} →
                    </span>
                  )}
                </button>
              ))}
              {(!people || people.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No contacts yet. Add people first.</p>
              )}
            </div>
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
  transactions, isLoading, selectedIds, onToggleSelect, onAssign, onEditLabel, onMarkPersonal, onUnassign, onDelete, showAssignActions,
}: {
  transactions: Transaction[]
  isLoading: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onAssign: (id: string) => void
  onEditLabel: (txn: Transaction) => void
  onMarkPersonal: (id: string) => void
  onUnassign: (id: string) => void
  onDelete: (id: string) => void
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
              {txn.debtTransactions && txn.debtTransactions.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {txn.debtTransactions.map((dt: any) => (
                    <span
                      key={dt.id}
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-primary/10 text-primary border border-primary/20"
                    >
                      → {dt.debtRecord?.person?.name} ({formatCurrency(dt.assignedAmount)})
                    </span>
                  ))}
                  {txn.status === 'PARTIAL' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Partial
                    </span>
                  )}
                </div>
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
            {(showAssignActions || txn.status === 'UNASSIGNED' || txn.status === 'PARTIAL') ? (
              <>
                <button
                  onClick={() => onAssign(txn.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                >
                  <UserPlus className="h-3 w-3" /> {txn.status === 'PARTIAL' ? 'Split More' : 'Assign'}
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
                  Split / Edit
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
            <button
              onClick={() => onDelete(txn.id)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-destructive hover:bg-destructive/15 transition-colors"
              title="Delete Transaction"
            >
              <Trash2 className="h-3 w-3" />
            </button>
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
