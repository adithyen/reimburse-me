import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// CURRENCY FORMATTING
// ============================================================

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const INR_PRECISE = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(amount: number, precise = false): string {
  if (!isFinite(amount)) return '₹0'
  return precise ? INR_PRECISE.format(amount) : INR.format(amount)
}

/** Short format: 1,25,000 → ₹1.25L, 50,000 → ₹50K */
export function formatAmount(amount: number): string {
  if (amount >= 10_00_000) return `₹${(amount / 10_00_000).toFixed(1)}Cr`
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount.toFixed(0)}`
}

// ============================================================
// DATE FORMATTING
// ============================================================

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd MMM yyyy')
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'dd MMM')
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd MMM yyyy, hh:mm a')
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatMonthYear(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'MMM yyyy')
}

// ============================================================
// STRING UTILITIES
// ============================================================

export function truncate(str: string, maxLength: number): string {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '…'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// ============================================================
// COLOR UTILITIES
// ============================================================

export const PERSON_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#14b8a6', '#a855f7', '#d946ef',
]

export function getRandomColor(): string {
  return PERSON_COLORS[Math.floor(Math.random() * PERSON_COLORS.length)]
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ============================================================
// NUMBER UTILITIES
// ============================================================

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

export function roundTo(num: number, places: number): number {
  return Math.round(num * 10 ** places) / 10 ** places
}

// ============================================================
// DEBT STATUS UTILITIES
// ============================================================

export function getDebtStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: '#f59e0b',
    PARTIAL: '#3b82f6',
    SETTLED: '#22c55e',
    OVERDUE: '#ef4444',
    CANCELLED: '#94a3b8',
  }
  return map[status] || '#94a3b8'
}

export function getTransactionStatusLabel(status: string): string {
  const map: Record<string, string> = {
    UNASSIGNED: 'Unassigned',
    ASSIGNED: 'Assigned',
    PERSONAL: 'Personal',
    PARTIAL: 'Partial',
    SETTLED: 'Settled',
  }
  return map[status] || status
}

// ============================================================
// FILE SIZE FORMATTING
// ============================================================

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
