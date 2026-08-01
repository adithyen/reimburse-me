'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

type Account = {
  id: string
  name: string
  bank?: string | null
}

type Category = {
  id: string
  name: string
  color: string
}

type AddTransactionModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddTransactionModal({ open, onOpenChange }: AddTransactionModalProps) {
  const queryClient = useQueryClient()

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [label, setLabel] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [type, setType] = useState<'DEBIT' | 'CREDIT'>('DEBIT')
  const [accountId, setAccountId] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [rawNarration, setRawNarration] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Fetch accounts
  const { data: accountsData } = useQuery({
    queryKey: ['accounts-list'],
    queryFn: async () => {
      const res = await fetch('/api/accounts')
      if (!res.ok) return []
      const json = await res.json()
      return (json.data || []) as Account[]
    },
    enabled: open,
  })

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-list'],
    queryFn: async () => {
      const res = await fetch('/api/categories')
      if (!res.ok) return []
      const json = await res.json()
      return (json.data || []) as Category[]
    },
    enabled: open,
  })

  const accounts = accountsData || []
  const categories = categoriesData || []

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0])
    setLabel('')
    setAmount('')
    setType('DEBIT')
    setAccountId('')
    setCategoryId('')
    setRawNarration('')
    setNotes('')
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new Error('Please enter a valid amount')
      }
      if (!date) {
        throw new Error('Please select a date')
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          merchant: label.trim() || null,
          amount: Number(amount),
          type,
          accountId: accountId || null,
          categoryId: categoryId || null,
          rawNarration: rawNarration.trim() || null,
          notes: notes.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create transaction')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Transaction added successfully!')
      resetForm()
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Plus className="h-5 w-5 text-primary" />
            Add Manual Transaction
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => setType('DEBIT')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                type === 'DEBIT'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowUpCircle className="h-4 w-4 text-primary" />
              Debit (Expense)
            </button>
            <button
              type="button"
              onClick={() => setType('CREDIT')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                type === 'CREDIT'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
              Credit (Income)
            </button>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Label / Merchant */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Transaction Label / Title
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Movie Ticket, Dinner at Hotel"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Account & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select Account...</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select Category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bank Narration / Details */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Bank Narration / Raw Details (Optional)
            </label>
            <input
              type="text"
              value={rawNarration}
              onChange={(e) => setRawNarration(e.target.value)}
              placeholder="e.g. UPI/DR/650018496393/BIGTREE..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional comments or context"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending}
              className="gradient-brand text-white border-0"
            >
              {createMutation.isPending ? 'Saving...' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
