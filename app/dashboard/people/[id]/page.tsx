'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, FileText, Share2, Plus, CheckCircle2, Clock, AlertCircle,
  Phone, Mail, Wallet, TrendingDown, TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { formatCurrency, formatDate, getInitials, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'

const settlementSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ADJUSTMENT', 'MANUAL']),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
})

type SettlementForm = z.infer<typeof settlementSchema>

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'badge-unassigned',
  PARTIAL: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  SETTLED: 'badge-settled',
  OVERDUE: 'text-red-400 bg-red-400/10 border-red-400/20',
  CANCELLED: 'badge-personal',
}

export default function PersonDetailPage() {
  const params = useParams()
  const id = params.id as string
  const queryClient = useQueryClient()
  const [settlingDebtId, setSettlingDebtId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['person', id],
    queryFn: async () => {
      const res = await fetch(`/api/people/${id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return (await res.json()).data
    },
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SettlementForm>({
    resolver: zodResolver(settlementSchema) as any,
    defaultValues: { method: 'UPI' },
  })

  const settleMutation = useMutation({
    mutationFn: async (formData: SettlementForm & { debtRecordId: string }) => {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Payment recorded!')
      setSettlingDebtId(null)
      reset()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleGenerateReceipt = async () => {
    toast.loading('Generating receipt...')
    try {
      const res = await fetch(`/api/reports/person/${id}`)
      if (!res.ok) throw new Error('Failed to generate')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt_${data?.name}_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.dismiss()
      toast.success('Receipt downloaded!')
    } catch {
      toast.dismiss()
      toast.error('Failed to generate receipt')
    }
  }

  if (isLoading) return <PersonDetailSkeleton />

  if (!data) return (
    <div className="text-center py-16">
      <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
      <p className="text-foreground">Person not found</p>
      <Link href="/dashboard/people" className="text-primary text-sm hover:underline mt-2 block">← Back to People</Link>
    </div>
  )

  const pendingDebts = data.debtRecords?.filter((d: { status: string }) => ['PENDING', 'PARTIAL'].includes(d.status)) || []
  const settledDebts = data.debtRecords?.filter((d: { status: string }) => d.status === 'SETTLED') || []

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link href="/dashboard/people" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to People
      </Link>

      {/* Profile Header */}
      <Card className="finance-card overflow-hidden">
        <div className="h-1.5 w-full gradient-brand" />
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
              style={{ backgroundColor: data.color }}
            >
              {getInitials(data.name)}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{data.name}</h1>
                {data.relationship && (
                  <Badge variant="secondary" className="text-xs">{data.relationship}</Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {data.phone && (
                  <a href={`tel:${data.phone}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <Phone className="h-3.5 w-3.5" /> {data.phone}
                  </a>
                )}
                {data.email && (
                  <a href={`mailto:${data.email}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <Mail className="h-3.5 w-3.5" /> {data.email}
                  </a>
                )}
                {data.upiId && (
                  <span className="flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5" /> {data.upiId}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleGenerateReceipt} variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" /> Receipt
              </Button>
              {data.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const msg = `Hi ${data.name}! You have ₹${data.summary?.totalOutstanding?.toLocaleString('en-IN')} pending with me. Please check the receipt.`
                    window.open(`https://wa.me/${data.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`)
                  }}
                >
                  <Share2 className="h-4 w-4" /> WhatsApp
                </Button>
              )}
            </div>
          </div>

          {/* Summary metrics */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-lg font-bold text-primary">{formatCurrency(data.summary?.totalOutstanding || 0)}</p>
              <p className="text-xs text-muted-foreground">Outstanding</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-card border border-border">
              <p className="text-lg font-bold text-foreground">{formatCurrency(data.summary?.totalDebt || 0)}</p>
              <p className="text-xs text-muted-foreground">Total Debt</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-lg font-bold text-emerald-500">{formatCurrency(data.summary?.totalRecovered || 0)}</p>
              <p className="text-xs text-muted-foreground">Recovered</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Debts */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">
          Pending Debts ({pendingDebts.length})
        </h2>
        {pendingDebts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-foreground font-medium">All settled!</p>
              <p className="text-xs text-muted-foreground mt-0.5">No pending debts with {data.name}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingDebts.map((debt: {
              id: string
              title: string
              totalAmount: number
              outstandingAmount: number
              recoveredAmount: number
              status: string
              createdAt: string
              notes: string | null
              category: { name: string; color: string } | null
              settlements: Array<{ id: string; amount: number; method: string; settledAt: string }>
              debtTransactions: Array<{ transaction: { merchant: string | null; date: string; amount: number } }>
            }) => (
              <Card key={debt.id} className="finance-card">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-foreground text-sm">{debt.title}</h3>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-1.5 py-0', STATUS_STYLES[debt.status])}
                        >
                          {debt.status}
                        </Badge>
                        {debt.category && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: `${debt.category.color}40`, color: debt.category.color }}>
                            {debt.category.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(new Date(debt.createdAt))}</p>
                      {debt.notes && <p className="text-xs text-muted-foreground mt-1 italic">{debt.notes}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-foreground">{formatCurrency(debt.outstandingAmount)}</p>
                      {debt.recoveredAmount > 0 && (
                        <p className="text-xs text-emerald-500">+{formatCurrency(debt.recoveredAmount)} paid</p>
                      )}
                    </div>
                  </div>

                  {/* Linked transactions */}
                  {debt.debtTransactions?.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {debt.debtTransactions.slice(0, 3).map((dt: { transaction: { merchant: string | null; date: string; amount: number } }, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {dt.transaction.merchant || 'Transaction'} · {formatCurrency(dt.transaction.amount)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <Sheet open={settlingDebtId === debt.id} onOpenChange={(o) => !o && setSettlingDebtId(null)}>
                    <SheetTrigger
                      render={
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => setSettlingDebtId(debt.id)}
                        />
                      }
                    >
                      <Plus className="h-3 w-3 mr-1" /> Record Payment
                    </SheetTrigger>
                    <SheetContent side="bottom" className="max-h-[85vh]">
                      <SheetHeader>
                        <SheetTitle>Record Payment — {data.name}</SheetTitle>
                      </SheetHeader>
                      <form
                        onSubmit={handleSubmit((fd: any) => settleMutation.mutate({ amount: Number(fd.amount), method: fd.method, referenceId: fd.referenceId, notes: fd.notes, debtRecordId: debt.id }))}
                        className="space-y-4 mt-4"
                      >
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                          <p className="text-xs text-muted-foreground">Outstanding</p>
                          <p className="text-lg font-bold text-foreground">{formatCurrency(debt.outstandingAmount)}</p>
                        </div>

                        <div>
                          <label className="text-xs font-medium block mb-1">Amount Received *</label>
                          <input
                            {...register('amount')}
                            type="number"
                            step="0.01"
                            placeholder={String(debt.outstandingAmount)}
                            className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                          {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium block mb-1">Payment Method</label>
                            <select {...register('method')} className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50">
                              <option value="UPI">UPI</option>
                              <option value="CASH">Cash</option>
                              <option value="BANK_TRANSFER">Bank Transfer</option>
                              <option value="CHEQUE">Cheque</option>
                              <option value="ADJUSTMENT">Adjustment</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium block mb-1">Reference / UTR</label>
                            <input {...register('referenceId')} placeholder="Optional" className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50" />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium block mb-1">Notes</label>
                          <input {...register('notes')} placeholder="Optional" className="w-full px-3 py-2.5 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="w-full gradient-brand text-white border-0 py-3">
                          {isSubmitting ? 'Recording...' : 'Record Payment'}
                        </Button>
                      </form>
                    </SheetContent>
                  </Sheet>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Settled Debts */}
      {settledDebts.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Settled ({settledDebts.length})</h2>
          <div className="space-y-2">
            {settledDebts.map((debt: { id: string; title: string; totalAmount: number; recoveredAmount: number; updatedAt: string }) => (
              <div key={debt.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <div>
                  <p className="text-sm font-medium text-foreground">{debt.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(new Date(debt.updatedAt))}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-500">+{formatCurrency(debt.recoveredAmount)}</p>
                  <p className="text-xs text-muted-foreground">Settled</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PersonDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl">
      <Skeleton className="h-4 w-24" />
      <Card><CardContent className="pt-5 pb-5"><Skeleton className="h-24 w-full" /></CardContent></Card>
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}><CardContent className="pt-4 pb-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
      ))}
    </div>
  )
}
