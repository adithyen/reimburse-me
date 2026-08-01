'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Tag } from 'lucide-react'

type EditLabelModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: 'transaction' | 'debt'
  targetId: string | null
  initialLabel?: string | null
  rawNarration?: string | null
}

export function EditLabelModal({
  open,
  onOpenChange,
  targetType,
  targetId,
  initialLabel,
  rawNarration,
}: EditLabelModalProps) {
  const queryClient = useQueryClient()
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (open) {
      setLabel(initialLabel || '')
    }
  }, [open, initialLabel])

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!targetId) return

      const endpoint = targetType === 'transaction'
        ? `/api/transactions/${targetId}`
        : `/api/debts/${targetId}`

      const payload = targetType === 'transaction'
        ? { merchant: label.trim() || null }
        : { title: label.trim() || 'Expense' }

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update label')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['people'] })
      queryClient.invalidateQueries({ queryKey: ['person'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Label updated successfully!')
      onOpenChange(false)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Tag className="h-4 w-4 text-primary" />
            Edit Transaction Label
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {rawNarration && (
            <div className="p-2.5 rounded-lg bg-muted/60 border border-border">
              <p className="text-[11px] font-medium text-muted-foreground">Original Bank Narration:</p>
              <p className="text-xs text-foreground font-mono mt-0.5 break-all">{rawNarration}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Custom Label / Title
            </label>
            <input
              type="text"
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Movie Ticket, Medicine, Dinner with Friends"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              This label will be shown on transactions, contact ledgers, debt records, and generated PDF reports.
            </p>
          </div>

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
              disabled={updateMutation.isPending}
              className="gradient-brand text-white border-0"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Label'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
