'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tag, X, Edit2, Check, Trash2, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Label = {
  id: string
  name: string
  color: string
  icon: string
}

export function PersonalLabelsDialog({
  open,
  onOpenChange,
  txnId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  txnId: string | null
}) {
  const queryClient = useQueryClient()
  const [isManaging, setIsManaging] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // State for creating or editing
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#64748b')
  const [editIcon, setEditIcon] = useState('tag')

  const { data: labels, isLoading } = useQuery({
    queryKey: ['labels-list'],
    queryFn: async () => {
      const res = await fetch('/api/labels')
      return (await res.json()).data as Label[]
    },
  })

  const markPersonalMutation = useMutation({
    mutationFn: async ({ labelIds }: { labelIds: string[] }) => {
      if (!txnId) return
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
      toast.success('Marked as personal')
      onOpenChange(false)
    },
    onError: (e) => toast.error(e.message)
  })

  const saveLabelMutation = useMutation({
    mutationFn: async () => {
      const isNew = editingId === 'NEW'
      const url = isNew ? '/api/labels' : `/api/labels/${editingId}`
      const method = isNew ? 'POST' : 'PUT'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, color: editColor, icon: editIcon || 'tag' })
      })
      if (!res.ok) throw new Error((await res.json()).error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels-list'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setEditingId(null)
      toast.success('Label saved')
    },
    onError: (e) => toast.error(e.message)
  })

  const deleteLabelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/labels/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels-list'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      toast.success('Label deleted')
    }
  })

  const createDefaultsMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/labels', { method: 'POST', body: JSON.stringify({ name: 'Self Expense', color: '#8b5cf6', icon: '👤' }) })
      await fetch('/api/labels', { method: 'POST', body: JSON.stringify({ name: 'Business', color: '#f59e0b', icon: '💼' }) })
      await fetch('/api/labels', { method: 'POST', body: JSON.stringify({ name: 'Ignore', color: '#64748b', icon: '🙈' }) })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels-list'] })
    }
  })

  const startEdit = (label: Label) => {
    setEditingId(label.id)
    setEditName(label.name)
    setEditColor(label.color)
    setEditIcon(label.icon === 'tag' ? '' : label.icon)
  }

  const startCreate = () => {
    setEditingId('NEW')
    setEditName('')
    setEditColor('#3b82f6')
    setEditIcon('')
  }

  const renderIcon = (iconStr: string) => {
    if (!iconStr || iconStr === 'tag') return <Tag className="h-4 w-4" />
    // If it's short, it's likely an emoji
    if (iconStr.length <= 2) return <span>{iconStr}</span>
    return <Tag className="h-4 w-4" />
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      onOpenChange(v)
      if (!v) {
        setTimeout(() => { setIsManaging(false); setEditingId(null) }, 200)
      }
    }}>
      <DialogContent className="sm:max-w-md p-5 flex flex-col gap-5">
        <DialogHeader className="px-0 pb-0 flex-shrink-0 flex flex-row items-center justify-between space-y-0">
          <DialogTitle>{isManaging ? 'Manage Labels' : 'Mark as Personal'}</DialogTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs font-medium px-2"
            onClick={() => { setIsManaging(!isManaging); setEditingId(null) }}
          >
            {isManaging ? 'Done' : 'Manage'}
          </Button>
        </DialogHeader>
        
        <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-1 pb-2">
          {labels?.map((label) => (
            <div key={label.id} className="relative group">
              {editingId === label.id ? (
                <div className="flex flex-col gap-3 p-3 rounded-xl border border-border bg-card shadow-sm mb-2">
                  <div className="flex items-center gap-3">
                    <Input 
                      type="color" 
                      value={editColor} 
                      onChange={e => setEditColor(e.target.value)} 
                      className="w-10 h-10 p-1 rounded-lg shrink-0 cursor-pointer"
                    />
                    <Input 
                      placeholder="Emoji (e.g. 🍔)" 
                      value={editIcon} 
                      onChange={e => setEditIcon(e.target.value)}
                      maxLength={2}
                      className="w-16 h-10 text-center"
                    />
                    <Input 
                      placeholder="Label name" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)}
                      className="flex-1 h-10"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button size="sm" onClick={() => saveLabelMutation.mutate()} disabled={!editName || saveLabelMutation.isPending}>Save</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!isManaging && txnId) {
                        markPersonalMutation.mutate({ labelIds: [label.id] })
                      }
                    }}
                    disabled={isManaging}
                    className={cn(
                      "flex-1 flex items-center gap-3 p-3 rounded-xl transition-colors border border-transparent",
                      isManaging ? "bg-muted/50 opacity-80 cursor-default" : "hover:bg-accent hover:border-primary/20 cursor-pointer"
                    )}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                      style={{ backgroundColor: label.color }}
                    >
                      {renderIcon(label.icon)}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-foreground text-sm">{label.name}</p>
                    </div>
                  </button>
                  
                  {isManaging && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" onClick={() => startEdit(label)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => {
                        if(confirm('Delete this label? Transactions will lose it.')) deleteLabelMutation.mutate(label.id)
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {editingId === 'NEW' && (
            <div className="flex flex-col gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5 shadow-sm mb-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">New Label</p>
              <div className="flex items-center gap-3">
                <Input 
                  type="color" 
                  value={editColor} 
                  onChange={e => setEditColor(e.target.value)} 
                  className="w-10 h-10 p-1 rounded-lg shrink-0 cursor-pointer"
                />
                <Input 
                  placeholder="Emoji 🍔" 
                  value={editIcon} 
                  onChange={e => setEditIcon(e.target.value)}
                  maxLength={2}
                  className="w-20 h-10 text-center"
                />
                <Input 
                  placeholder="Label name" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)}
                  className="flex-1 h-10"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 mt-1">
                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button size="sm" onClick={() => saveLabelMutation.mutate()} disabled={!editName || saveLabelMutation.isPending}>Create</Button>
              </div>
            </div>
          )}

          {(!labels || labels.length === 0) && !isLoading && editingId !== 'NEW' && (
            <div className="text-center py-6 px-4">
              <p className="text-sm text-muted-foreground mb-4">No personal labels found.</p>
              <Button 
                variant="outline" 
                onClick={() => createDefaultsMutation.mutate()}
                disabled={createDefaultsMutation.isPending}
                className="w-full mb-2"
              >
                Create Default Labels
              </Button>
            </div>
          )}

          {isManaging && editingId !== 'NEW' && (
             <Button variant="outline" className="w-full mt-2 border-dashed gap-2" onClick={startCreate}>
               <Plus className="h-4 w-4" /> Create Custom Label
             </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
