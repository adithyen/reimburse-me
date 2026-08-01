'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Download, Share2, Clock, QrCode, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function ReportsPage() {
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  const { data: people, isLoading } = useQuery({
    queryKey: ['people-list'],
    queryFn: async () => {
      const res = await fetch('/api/people')
      return (await res.json()).data
    },
  })

  const selectedPerson = people?.find((p: { id: string }) => p.id === selectedPersonId)

  const handleGenerateReport = async (personId: string) => {
    setIsGenerating(true)
    const toastId = toast.loading('Generating PDF receipt...')
    try {
      // Direct navigation — Chrome uses Content-Disposition filename from server
      const safeName = (selectedPerson?.name || 'receipt').replace(/[^a-zA-Z0-9]/g, '_')
      const link = document.createElement('a')
      link.href = `/api/reports/person/${personId}`
      link.download = `receipt_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.dismiss(toastId)
      toast.success('Receipt downloaded!')
    } catch (e: unknown) {
      toast.dismiss(toastId)
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(`Failed: ${msg}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Reports & Receipts</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Generate PDF receipts to share with contacts</p>
      </div>

      {/* Report Generator */}
      <Card className="finance-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate Debt Receipt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate a professional PDF receipt for a contact showing all pending debts and a UPI QR code for easy payment.
          </p>

          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Select Contact</label>
            {isLoading ? (
              <Skeleton className="h-10 w-full rounded-lg" />
            ) : (
              <Select value={selectedPersonId} onValueChange={(val) => setSelectedPersonId(val || '')}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Choose a contact..." />
                </SelectTrigger>
                <SelectContent>
                  {people?.filter((p: { totalOutstanding: number }) => p.totalOutstanding > 0).map((p: { id: string; name: string; totalOutstanding: number; relationship: string | null }) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.totalOutstanding)} pending
                    </SelectItem>
                  ))}
                  {people?.filter((p: { totalOutstanding: number }) => p.totalOutstanding > 0).length === 0 && (
                    <SelectItem value="none" disabled>No pending debts</SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button
            onClick={() => selectedPersonId && handleGenerateReport(selectedPersonId)}
            disabled={!selectedPersonId || isGenerating}
            className="gradient-brand text-white border-0 gap-2"
          >
            {isGenerating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
              : <><Download className="h-4 w-4" /> Download PDF Receipt</>}
          </Button>
        </CardContent>
      </Card>

      {/* Receipt features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: <FileText className="h-5 w-5 text-primary" />,
            title: 'Professional PDF',
            desc: 'Itemized list of all expenses with dates and amounts',
          },
          {
            icon: <QrCode className="h-5 w-5 text-violet-500" />,
            title: 'UPI QR Code',
            desc: 'Auto-generated UPI QR for instant payment',
          },
          {
            icon: <Share2 className="h-5 w-5 text-emerald-500" />,
            title: 'WhatsApp Ready',
            desc: 'Share directly on WhatsApp with a pre-filled message',
          },
        ].map((f) => (
          <Card key={f.title} className="finance-card">
            <CardContent className="pt-4 pb-4">
              <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <p className="font-medium text-foreground text-sm mb-1">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Import History */}
      <Card className="finance-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Import History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            Import history will appear here after importing bank statements.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
