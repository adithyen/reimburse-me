'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Tag, ArrowUpCircle, ArrowDownCircle, Inbox, X, LayoutList, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PersonalLabelsDialog } from '@/components/transactions/personal-labels-dialog'
import { formatCurrency, formatDateShort, cn, truncate } from '@/lib/utils'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

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
  personalLabels?: Array<{ id: string; name: string; color: string; icon: string }>
}

export default function PersonalTransactionsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped')
  
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

  const groups = useMemo(() => {
    const map = new Map<string, { key: string, name: string, total: number, count: number, txns: Transaction[], labels: any[] }>()
    
    transactions.forEach(txn => {
      let key = 'unlabeled'
      let name = 'Unlabeled'
      let labels: any[] = []
      
      if (txn.personalLabels && txn.personalLabels.length > 0) {
        const sorted = [...txn.personalLabels].sort((a, b) => a.name.localeCompare(b.name))
        key = sorted.map(l => l.id).join('-')
        name = sorted.map(l => l.name).join(' + ')
        labels = sorted
      }
      
      if (!map.has(key)) {
        map.set(key, { key, name, total: 0, count: 0, txns: [], labels })
      }
      const group = map.get(key)!
      // For personal expenses we just sum the amounts, keeping debit as positive expense conceptually
      // We will sum credits as negative expense if they are marked personal
      group.total += (txn.type === 'DEBIT' ? txn.amount : -txn.amount)
      group.count += 1
      group.txns.push(txn)
    })
    
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [transactions])

  const renderTransactionList = (txns: Transaction[]) => (
    <div className="space-y-1.5 mt-3">
      {txns.map((txn, i) => (
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
              {viewMode === 'list' && txn.personalLabels?.map(l => (
                <span key={l.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${l.color}20`, color: l.color }}>
                  {l.icon && l.icon !== 'tag' ? l.icon + ' ' : ''}{l.name}
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
  )

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

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="relative w-full max-w-sm">
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
        
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-[200px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="grouped" className="text-xs gap-1.5"><Layers className="h-3.5 w-3.5"/> Grouped</TabsTrigger>
            <TabsTrigger value="list" className="text-xs gap-1.5"><LayoutList className="h-3.5 w-3.5"/> List</TabsTrigger>
          </TabsList>
        </Tabs>
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
        <div className="space-y-6">
          {viewMode === 'list' ? (
            renderTransactionList(transactions)
          ) : (
            groups.map(group => (
              <div key={group.key} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    {group.labels.length > 0 ? (
                      <div className="flex gap-1.5">
                        {group.labels.map(l => (
                           <span key={l.id} className="px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5" style={{ background: `${l.color}15`, color: l.color }}>
                              {l.icon && l.icon !== 'tag' && <span>{l.icon}</span>}
                              {l.name}
                           </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">{group.name}</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-2">({group.count} transactions)</span>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-foreground">{formatCurrency(group.total)}</p>
                  </div>
                </div>
                {renderTransactionList(group.txns)}
              </div>
            ))
          )}
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {meta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      <PersonalLabelsDialog open={personalSheetOpen} onOpenChange={setPersonalSheetOpen} txnId={personalTxn} />
    </div>
  )
}
