'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Users, Phone, Mail, ExternalLink, Edit2, Archive, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatCurrency, getInitials, getRandomColor, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'

const personSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  relationship: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  upiId: z.string().optional(),
  color: z.string(),
  notes: z.string().optional(),
})

type PersonForm = z.infer<typeof personSchema>

const RELATIONSHIPS = ['Mom', 'Dad', 'Sister', 'Brother', 'Friend', 'Roommate', 'Colleague', 'Client', 'Other']
const PERSON_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#14b8a6']

export default function PeoplePage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const res = await fetch('/api/people')
      return (await res.json()).data as Array<{
        id: string
        name: string
        relationship: string | null
        phone: string | null
        email: string | null
        upiId: string | null
        color: string
        totalOutstanding: number
        pendingDebts: number
        isArchived: boolean
      }>
    },
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<PersonForm>({
    resolver: zodResolver(personSchema),
    defaultValues: { color: getRandomColor() },
  })

  const selectedColor = watch('color')

  const saveMutation = useMutation({
    mutationFn: async (data: PersonForm) => {
      const method = editingId ? 'PATCH' : 'POST'
      const url = editingId ? `/api/people/${editingId}` : '/api/people'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] })
      toast.success(editingId ? 'Contact updated' : 'Contact added')
      setDialogOpen(false)
      setEditingId(null)
      reset({ color: getRandomColor() })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/people/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] })
      toast.success('Contact archived')
    },
  })

  const filtered = data?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.relationship?.toLowerCase().includes(search.toLowerCase())
  ) || []

  const totalOwed = data?.reduce((s, p) => s + p.totalOutstanding, 0) || 0

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">People</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Total owed: <span className="font-bold text-foreground">{formatCurrency(totalOwed)}</span>
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); reset({ color: getRandomColor() }) } }}>
          <DialogTrigger render={<button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium gradient-brand text-white border-0 shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all" />}>
            <Plus className="h-4 w-4" /> Add Person
          </DialogTrigger>
          <DialogContent className="sm:max-w-md p-4 grid gap-4">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-foreground mb-1 block">Name *</label>
                  <input {...register('name')} placeholder="Mom, Dad, Rahul..." className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Relationship</label>
                  <select {...register('relationship')} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">Select...</option>
                    {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Phone</label>
                  <input {...register('phone')} placeholder="+91 9876543210" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Email</label>
                  <input {...register('email')} type="email" placeholder="email@example.com" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">UPI ID</label>
                  <input {...register('upiId')} placeholder="person@upi" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">Avatar Color</label>
                <div className="flex gap-2 flex-wrap">
                  {PERSON_COLORS.map((c) => (
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

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Notes</label>
                <textarea {...register('notes')} placeholder="Optional notes..." rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); reset() }}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="gradient-brand text-white border-0">
                  {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Add Contact'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* People Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-foreground font-medium">{search ? 'No contacts found' : 'No contacts yet'}</p>
          {!search && (
            <p className="text-muted-foreground text-sm mt-1 mb-4">Add people who owe you money</p>
          )}
          {!search && (
            <Button onClick={() => setDialogOpen(true)} className="gradient-brand text-white border-0">
              <Plus className="h-4 w-4 mr-2" /> Add First Contact
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((person, i) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="finance-card card-hover group">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <Link href={`/dashboard/people/${person.id}`} className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base"
                        style={{ backgroundColor: person.color }}
                      >
                        {getInitials(person.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{person.name}</p>
                        {person.relationship && (
                          <p className="text-xs text-muted-foreground">{person.relationship}</p>
                        )}
                      </div>
                    </Link>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingId(person.id); setDialogOpen(true) }}
                        className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => archiveMutation.mutate(person.id)}
                        className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <Archive className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {person.totalOutstanding > 0 ? (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-primary/5 border border-primary/10">
                        <span className="text-xs text-muted-foreground">Owes you</span>
                        <span className="font-bold text-primary text-sm">{formatCurrency(person.totalOutstanding)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <span className="text-xs text-muted-foreground">All settled</span>
                        <span className="font-medium text-emerald-500 text-xs">✓ Clear</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      {person.phone && (
                        <a href={`tel:${person.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <Phone className="h-3 w-3" />
                        </a>
                      )}
                      {person.email && (
                        <a href={`mailto:${person.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <Mail className="h-3 w-3" />
                        </a>
                      )}
                      <Link
                        href={`/dashboard/people/${person.id}`}
                        className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View Details <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
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
