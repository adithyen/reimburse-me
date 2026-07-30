'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Building2, Wallet, CreditCard, Edit2, Trash2, Star, ArrowUpDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatCurrency, cn, PERSON_COLORS } from '@/lib/utils'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bank: z.string().optional(),
  accountType: z.enum(['savings', 'current', 'cash_wallet', 'credit']),
  nickname: z.string().optional(),
  accountNumber: z.string().optional(),
  currentBalance: z.coerce.number().min(0),
  targetBalance: z.coerce.number().min(0),
  color: z.string(),
  isDefault: z.boolean(),
})

type AccountForm = z.infer<typeof accountSchema>

const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings Account', icon: Wallet },
  { value: 'current', label: 'Current Account', icon: Building2 },
  { value: 'cash_wallet', label: 'Cash Wallet', icon: Wallet },
  { value: 'credit', label: 'Credit Card', icon: CreditCard },
]

const ACCOUNT_COLORS = ['#6366f1', '#8b5cf6', '#22c55e', '#f97316', '#3b82f6', '#ec4899', '#eab308', '#14b8a6']

export default function AccountsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts')
      return (await res.json()).data
    },
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema) as any,
    defaultValues: {
      accountType: 'savings',
      currentBalance: 0,
      targetBalance: 0,
      color: '#6366f1',
      isDefault: false,
    },
  })

  const selectedColor = watch('color')

  const createMutation = useMutation({
    mutationFn: async (data: AccountForm) => {
      const method = editingId ? 'PATCH' : 'POST'
      const url = editingId ? `/api/accounts/${editingId}` : '/api/accounts'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(editingId ? 'Account updated' : 'Account added')
      setDialogOpen(false)
      setEditingId(null)
      reset()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Account removed')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const totalBalance = data?.reduce((s: number, a: { currentBalance: number }) => s + a.currentBalance, 0) || 0

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bank Accounts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Total across all accounts: <span className="font-bold text-foreground">{formatCurrency(totalBalance)}</span>
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); reset() } }}>
          <DialogTrigger render={<button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium gradient-brand text-white border-0 shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all" />}>
            <Plus className="h-4 w-4" /> Add Account
          </DialogTrigger>
          <DialogContent className="sm:max-w-md p-4 grid gap-4">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Account' : 'Add Account'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit((d: any) => createMutation.mutate(d))} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Account Name *</label>
                  <input {...register('name')} placeholder="e.g., SBI Savings" className="form-input w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Bank Name</label>
                  <input {...register('bank')} placeholder="e.g., State Bank of India" className="form-input w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Account Type</label>
                <select {...register('accountType')} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Current Balance (₹)</label>
                  <input {...register('currentBalance')} type="number" step="0.01" className="form-input w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Target Balance (₹)</label>
                  <input {...register('targetBalance')} type="number" step="0.01" className="form-input w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">Color</label>
                <div className="flex gap-2">
                  {ACCOUNT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setValue('color', c)}
                      className={cn('w-7 h-7 rounded-full border-2 transition-all', selectedColor === c ? 'border-foreground scale-110' : 'border-transparent')}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input {...register('isDefault')} type="checkbox" id="isDefault" className="rounded" />
                <label htmlFor="isDefault" className="text-sm text-foreground">Set as default account</label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset() }}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="gradient-brand text-white border-0">
                  {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Add Account'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : data?.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-foreground font-medium">No accounts yet</p>
          <p className="text-muted-foreground text-sm mt-1 mb-4">Add your bank account to start tracking</p>
          <Button onClick={() => setDialogOpen(true)} className="gradient-brand text-white border-0">
            <Plus className="h-4 w-4 mr-2" /> Add First Account
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.map((account: {
            id: string
            name: string
            bank: string | null
            accountType: string
            currentBalance: number
            targetBalance: number
            color: string
            isDefault: boolean
            nickname: string | null
          }, i: number) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className="finance-card card-hover overflow-hidden">
                <div className="h-1 w-full" style={{ backgroundColor: account.color }} />
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${account.color}20` }}
                      >
                        <Building2 className="h-5 w-5" style={{ color: account.color }} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{account.name}</p>
                        <p className="text-xs text-muted-foreground">{account.bank || account.accountType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {account.isDefault && (
                        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          Default
                        </Badge>
                      )}
                      <button
                        onClick={() => { setEditingId(account.id); setDialogOpen(true) }}
                        className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(account.id)}
                        className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Current Balance</span>
                      <span className="text-lg font-bold text-foreground">{formatCurrency(account.currentBalance)}</span>
                    </div>
                    {account.targetBalance > 0 && (
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Target</span>
                        <span className="text-xs text-muted-foreground">{formatCurrency(account.targetBalance)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
