'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Tag, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Inbox, CheckSquare, Square, X, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, formatDateShort, cn, truncate } from '@/lib/utils'
import { toast } from 'sonner'

type Label = {
  id: string
  name: string
  color: string
}

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
  personalLabels?: Array<{ id: string; name: string; color: string }>
}

export default function PersonalTransactionsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  
  const [personalSheetOpen, setPersonalSheetOpen] = useState(false)
  const [personalTxn, setPersonalTxn] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', 'personal', search, page],
    queryFn: async () => {
      const paramsObj: Record<string, string> = {
        page: String(page),
        pageSize: '50',
        status: 'PERSONAL'
      }
      if (search) paramsObj.search = search
      const params = new URLSearchParams(paramsObj)
      const res = await fetch(`/api/transactions?${params}`)
      return res.json()
    },
  })

  const { data: labels } = useQuery({
    queryKey: ['labels-list'],
    queryFn: async () => {
      const res = await fetch('/api/labels')
      return (await res.json()).data as Label[]
    },
  })

  const markPersonalMutation = useMutation({
    mutationFn: async ({ txnId, labelIds }: { txnId: string; labelIds: string[] }) => {
      const res = await fetch(`/api/transactions/${txnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PERSONAL', isPersonal: true, personalLabelIds: labelIds }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Labels updated')
      setPersonalSheetOpen(false)
      setPersonalTxn(null)
    },
  })

  const unassignMutation = useMutation({
    mutationFn: async (txnId: string) => {
      const res = await fetch(`/api/transactions/${txnId}/unassign`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Removed from personal')
    },
  })

  const transactions: Transaction[] = data?.data || []
  const meta = data?.meta || { total: 0, totalPages: 1 }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Personal Expenses</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Transactions you've marked as personal and not reimbursable.
          </p>
        </div>
      </div>

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

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium text-foreground">No personal transactions</p>
          <p className="text-sm text-muted-foreground mt-1">Mark transactions as personal from the Inbox</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {transactions.map((txn, i) => (
            <motion.div
              key={txn.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl group border border-transparent hover:border-border hover:bg-card transition-all duration-150"
            >
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
                  <p className="text-sm font-medium text-foreground truncate">
                    {txn.merchant || truncate(txn.rawNarration || 'Transaction', 40)}
                  </p>
                  {txn.personalLabels?.map(l => (
                    <span key={l.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${l.color}20`, color: l.color }}>
                      {l.name}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatDateShort(new Date(txn.date))} · {txn.source}
                </p>
              </div>

              <div className="text-right flex-shrink-0 mr-4">
                <p className={cn('font-bold text-sm', txn.type === 'CREDIT' ? 'text-emerald-500' : 'text-foreground')}>
                  {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
                </p>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  onClick={() => { setPersonalTxn(txn.id); setPersonalSheetOpen(true) }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-muted text-muted-foreground hover:bg-accent transition-colors"
                >
                  Edit Labels
                </button>
                <button
                  onClick={() => unassignMutation.mutate(txn.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-destructive/15 text-destructive hover:bg-destructive/25 transition-colors"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* Personal Labels Dialog */}
      <Dialog open={personalSheetOpen} onOpenChange={setPersonalSheetOpen}>
        <DialogContent className="sm:max-w-md p-5 flex flex-col gap-5">
          <DialogHeader className="px-0 pb-0 flex-shrink-0">
            <DialogTitle>Edit Personal Labels</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 overflow-y-auto max-h-[50vh] pr-1">
            {labels?.map((label) => (
              <button
                key={label.id}
                onClick={() => {
                  if (personalTxn) {
                    markPersonalMutation.mutate({ txnId: personalTxn, labelIds: [label.id] })
                  }
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors border border-transparent hover:border-primary/20"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: label.color }}
                >
                  <Tag className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground text-sm">{label.name}</p>
                </div>
              </button>
            ))}
            {(!labels || labels.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No personal labels found.</p>
            )}
            {(!labels || labels.length === 0) && (
              <Button 
                className="w-full mt-2" 
                variant="outline" 
                onClick={async () => {
                   await fetch('/api/labels', { method: 'POST', body: JSON.stringify({ name: 'Self Expense', color: '#8b5cf6' }) });
                   await fetch('/api/labels', { method: 'POST', body: JSON.stringify({ name: 'Business', color: '#f59e0b' }) });
                   await fetch('/api/labels', { method: 'POST', body: JSON.stringify({ name: 'Ignore', color: '#64748b' }) });
                   queryClient.invalidateQueries({ queryKey: ['labels-list'] });
                }}
              >
                Create Default Labels
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
