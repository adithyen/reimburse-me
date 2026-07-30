'use client'

import { useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, CheckCircle2, AlertCircle, Loader2, X, Eye, EyeOff,
  Lock, RefreshCw, CheckSquare, Square, ArrowRight, ChevronLeft, Info,
  ShieldCheck, Trash2,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency, formatDateShort, cn } from '@/lib/utils'
import { toast } from 'sonner'

type Step = 'upload' | 'preview' | 'confirm' | 'done'

type PreviewRow = {
  id: string
  date: string
  rawDate: string
  merchant: string
  rawNarration: string
  amount: number
  type: 'DEBIT' | 'CREDIT'
  runningBalance?: number
  categorySlug?: string
  referenceNumber?: string
  bankTxnId?: string
  confidence: number
  warning?: string
  isSelected: boolean
  isDuplicate: boolean
  isEdited: boolean
}

type ParseResult = {
  previewRows: PreviewRow[]
  parserName: string
  bankDetected: string
  totalFound: number
  duplicates: number
  warnings: string[]
  errors: string[]
  dateRange: { from: string; to: string } | null
}

export function ImportWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [importResult, setImportResult] = useState<{ importedCount: number; skippedCount: number } | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)

  const reset = () => {
    setStep('upload')
    setFile(null)
    setPassword('')
    setNeedsPassword(false)
    setIsLoading(false)
    setParseResult(null)
    setRows([])
    setImportResult(null)
    setIsDragging(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const parseFile = async (targetFile: File, pwd?: string) => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', targetFile)
      if (pwd) formData.append('password', pwd)

      const res = await fetch('/api/import/parse', { method: 'POST', body: formData })
      const json = await res.json()

      if (!res.ok) {
        if (json.error === 'NEEDS_PASSWORD') {
          setNeedsPassword(true)
          setIsLoading(false)
          return
        }
        if (json.error === 'WRONG_PASSWORD') {
          toast.error('Incorrect password. Please try again.')
          setIsLoading(false)
          return
        }
        throw new Error(json.message || json.error || 'Parse failed')
      }

      setParseResult(json.data)
      setRows(json.data.previewRows)
      setStep('preview')
    } catch (e) {
      toast.error(String(e))
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); parseFile(f) }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); parseFile(f) }
  }

  const handlePasswordSubmit = () => {
    if (file && password) {
      setNeedsPassword(false)
      parseFile(file, password)
    }
  }

  const toggleRow = (id: string) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, isSelected: !r.isSelected } : r))
  }

  const toggleAll = () => {
    const allSelected = rows.filter((r) => !r.isDuplicate).every((r) => r.isSelected)
    setRows((prev) => prev.map((r) => r.isDuplicate ? r : { ...r, isSelected: !allSelected }))
  }

  const selectedRows = rows.filter((r) => r.isSelected)
  const selectedCount = selectedRows.length

  const handleConfirm = async () => {
    if (selectedCount === 0) {
      toast.error('No rows selected for import')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: selectedRows,
          accountId: selectedAccountId || null,
          fileName: file?.name,
          fileType: file?.name.split('.').pop(),
          bankDetected: parseResult?.bankDetected,
          parserUsed: parseResult?.parserName,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setImportResult(json.data)
      setStep('done')

      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e) {
      toast.error(String(e))
    } finally {
      setIsLoading(false)
    }
  }

  const totalDebits = selectedRows.filter((r) => r.type === 'DEBIT').reduce((s, r) => s + r.amount, 0)
  const totalCredits = selectedRows.filter((r) => r.type === 'CREDIT').reduce((s, r) => s + r.amount, 0)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl w-full max-h-[92vh] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Import Bank Statement
            </DialogTitle>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {(['upload', 'preview', 'done'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  'h-1.5 rounded-full transition-all duration-500',
                  step === s ? 'w-6 bg-primary' : steps_completed(step, s) ? 'w-3 bg-primary/50' : 'w-3 bg-border'
                )} />
                {i < 2 && <div className="h-px w-2 bg-border" />}
              </div>
            ))}
            <span className="ml-2 text-xs text-muted-foreground capitalize">{step}</span>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {/* UPLOAD STEP */}
            {step === 'upload' && !needsPassword && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 h-full"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <div className="text-center">
                      <p className="font-medium text-foreground">Parsing statement...</p>
                      <p className="text-sm text-muted-foreground mt-1">Detecting bank format and extracting transactions</p>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'border-2 border-dashed rounded-2xl p-10 cursor-pointer',
                      'flex flex-col items-center text-center transition-all duration-200',
                      isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-card'
                    )}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                      <Upload className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Drop your statement here</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      or click to browse files
                    </p>
                    <div className="flex gap-2">
                      {['PDF', 'CSV', 'XLSX'].map((fmt) => (
                        <Badge key={fmt} variant="outline" className="text-xs">{fmt}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                  <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Your statement is processed locally. Passwords are used only to unlock the file and are never stored.
                  </p>
                </div>

                {/* Supported banks */}
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Supported banks:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['SBI', 'HDFC', 'ICICI', 'Axis', 'Federal', 'Airtel', 'Canara', 'PNB', '+ many more'].map((b) => (
                      <span key={b} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{b}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* PASSWORD STEP */}
            {needsPassword && (
              <motion.div
                key="password"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6"
              >
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                    <Lock className="h-7 w-7 text-amber-500" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">Password Protected</h3>
                  <p className="text-sm text-muted-foreground">
                    {file?.name} is password protected. Enter the password to continue.
                  </p>
                  {file?.name.toLowerCase().includes('.pdf') && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Tip: SBI/HDFC statements are often protected with your date of birth (DDMMYYYY)
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                      placeholder="Enter file password..."
                      autoFocus
                      className="w-full px-4 py-3 pr-12 text-sm rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setNeedsPassword(false)} className="flex-1">Cancel</Button>
                    <Button
                      onClick={handlePasswordSubmit}
                      disabled={!password || isLoading}
                      className="flex-1 gradient-brand text-white border-0"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock & Parse'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PREVIEW STEP */}
            {step === 'preview' && parseResult && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
                style={{ height: '100%' }}
              >
                {/* Parse summary */}
                <div className="px-6 py-3 border-b border-border bg-card flex-shrink-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {parseResult.bankDetected !== 'Generic' ? (
                          <span>🏦 {parseResult.bankDetected} detected — {parseResult.totalFound} transactions found</span>
                        ) : (
                          <span>{parseResult.totalFound} transactions found</span>
                        )}
                      </p>
                      {parseResult.dateRange && (
                        <p className="text-xs text-muted-foreground">
                          {formatDateShort(new Date(parseResult.dateRange.from))} — {formatDateShort(new Date(parseResult.dateRange.to))}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {parseResult.duplicates > 0 && (
                        <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">
                          {parseResult.duplicates} duplicates hidden
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{selectedCount} selected</span>
                    </div>
                  </div>

                  {/* Warnings */}
                  {parseResult.warnings.length > 0 && (
                    <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-600">{parseResult.warnings[0]}</p>
                    </div>
                  )}
                </div>

                {/* Transaction table - SCROLLABLE */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div className="p-2">
                    {/* Header row */}
                    <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-muted-foreground font-medium">
                      <button onClick={toggleAll} className="flex-shrink-0">
                        {rows.filter((r) => !r.isDuplicate).every((r) => r.isSelected)
                          ? <CheckSquare className="h-4 w-4 text-primary" />
                          : <Square className="h-4 w-4" />}
                      </button>
                      <span className="w-24 flex-shrink-0">DATE</span>
                      <span className="flex-1">MERCHANT / NARRATION</span>
                      <span className="w-28 text-right flex-shrink-0">AMOUNT</span>
                    </div>

                    {rows.map((row) => (
                      <div
                        key={row.id}
                        className={cn(
                          'flex items-center gap-2 px-2 py-2 rounded-lg transition-colors',
                          row.isDuplicate && 'opacity-40',
                          row.isSelected && !row.isDuplicate && 'bg-primary/5',
                          !row.isDuplicate && 'hover:bg-accent cursor-pointer'
                        )}
                        onClick={() => !row.isDuplicate && toggleRow(row.id)}
                      >
                        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {row.isDuplicate ? (
                            <span className="text-[10px] text-muted-foreground/60 w-4">DUP</span>
                          ) : row.isSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground/30" />
                          )}
                        </div>

                        <span className="w-24 text-[11px] text-muted-foreground flex-shrink-0">
                          {formatDateShort(new Date(row.date))}
                        </span>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{row.merchant}</p>
                          {row.rawNarration !== row.merchant && (
                            <p className="text-[10px] text-muted-foreground truncate">{row.rawNarration}</p>
                          )}
                          {row.warning && (
                            <p className="text-[10px] text-amber-500 flex items-center gap-1 mt-0.5">
                              <AlertCircle className="h-2.5 w-2.5" /> {row.warning}
                            </p>
                          )}
                        </div>

                        <div className="w-28 text-right flex-shrink-0">
                          <p className={cn(
                            'text-xs font-bold',
                            row.type === 'CREDIT' ? 'text-emerald-500' : 'text-foreground'
                          )}>
                            {row.type === 'CREDIT' ? '+' : '-'}{formatCurrency(row.amount)}
                          </p>
                          {row.categorySlug && (
                            <p className="text-[10px] text-muted-foreground">{row.categorySlug}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer summary */}
                <div className="px-6 py-4 border-t border-border bg-card/50 flex-shrink-0">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex gap-4 text-sm">
                      <span>
                        <span className="text-muted-foreground">Debits:</span>{' '}
                        <span className="font-semibold text-foreground">{formatCurrency(totalDebits)}</span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Credits:</span>{' '}
                        <span className="font-semibold text-emerald-500">{formatCurrency(totalCredits)}</span>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setStep('upload'); setParseResult(null); setRows([]) }}
                        className="gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" /> Back
                      </Button>
                      <Button
                        onClick={handleConfirm}
                        disabled={selectedCount === 0 || isLoading}
                        className="gap-2 gradient-brand text-white border-0"
                        size="sm"
                      >
                        {isLoading
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <><ArrowRight className="h-4 w-4" /> Import {selectedCount} Transactions</>}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* DONE STEP */}
            {step === 'done' && importResult && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Import Successful!</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  {importResult.importedCount} transactions imported.
                  {importResult.skippedCount > 0 && ` ${importResult.skippedCount} duplicates skipped.`}
                </p>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={reset} className="gap-2">
                    <Upload className="h-4 w-4" /> Import Another
                  </Button>
                  <Button onClick={handleClose} className="gradient-brand text-white border-0">
                    View Transactions →
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function steps_completed(current: Step, target: Step): boolean {
  const order: Step[] = ['upload', 'preview', 'confirm', 'done']
  return order.indexOf(current) > order.indexOf(target)
}
