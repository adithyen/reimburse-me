/**
 * Shared TypeScript types for ReimburseMe.
 * These are the application-level types, distinct from Prisma model types.
 */

// ============================================================
// USER & SETTINGS
// ============================================================

export interface UserProfile {
  id: string
  authId: string
  email: string
  name: string | null
  phone: string | null
  upiId: string | null
  avatarUrl: string | null
  settings: UserSettings | null
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  currency: string
  timezone: string
  targetBalance: number
  defaultAccountId: string | null
  reminderDays: number
  onboardingDone: boolean
}

// ============================================================
// ACCOUNTS
// ============================================================

export interface Account {
  id: string
  userId: string
  name: string
  bank: string | null
  accountType: 'savings' | 'current' | 'cash_wallet' | 'credit'
  nickname: string | null
  accountNumber: string | null
  currentBalance: number
  targetBalance: number
  openingBalance: number
  color: string
  icon: string
  isDefault: boolean
  isActive: boolean
  lastSyncedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface AccountFormData {
  name: string
  bank?: string
  accountType: Account['accountType']
  nickname?: string
  accountNumber?: string
  currentBalance: number
  targetBalance: number
  color: string
  icon: string
  isDefault: boolean
}

// ============================================================
// TRANSACTIONS
// ============================================================

export type TransactionType = 'DEBIT' | 'CREDIT'
export type TransactionSource = 'AA' | 'CSV' | 'PDF' | 'EXCEL' | 'MANUAL'
export type TransactionStatus = 'UNASSIGNED' | 'ASSIGNED' | 'PERSONAL' | 'PARTIAL'

export interface Transaction {
  id: string
  userId: string
  accountId: string | null
  importBatchId: string | null
  date: Date
  time: string | null
  merchant: string | null
  rawNarration: string | null
  amount: number
  type: TransactionType
  runningBalance: number | null
  referenceNumber: string | null
  categoryId: string | null
  category: Category | null
  subcategory: string | null
  tags: string[]
  paymentMethod: string | null
  notes: string | null
  source: TransactionSource
  bankTxnId: string | null
  importedAt: Date | null
  status: TransactionStatus
  isRecoverable: boolean
  isPersonal: boolean
  receiptUrl: string | null
  createdAt: Date
  updatedAt: Date

  // Joined
  account?: Account
}

export interface TransactionFilters {
  search?: string
  dateFrom?: Date
  dateTo?: Date
  categoryId?: string
  accountId?: string
  type?: TransactionType
  source?: TransactionSource
  status?: TransactionStatus
  amountMin?: number
  amountMax?: number
  personId?: string
  page?: number
  pageSize?: number
}

// ============================================================
// PEOPLE
// ============================================================

export interface Person {
  id: string
  userId: string
  name: string
  relationship: string | null
  phone: string | null
  email: string | null
  upiId: string | null
  avatarUrl: string | null
  color: string
  notes: string | null
  tags: string[]
  isActive: boolean
  isArchived: boolean
  lastReminderAt: Date | null
  createdAt: Date
  updatedAt: Date

  // Computed (from debt records)
  totalOutstanding?: number
  totalDebt?: number
  totalRecovered?: number
  pendingDebts?: number
}

export interface PersonFormData {
  name: string
  relationship?: string
  phone?: string
  email?: string
  upiId?: string
  color: string
  notes?: string
  tags: string[]
}

// ============================================================
// DEBT RECORDS
// ============================================================

export type DebtStatus = 'PENDING' | 'PARTIAL' | 'SETTLED' | 'CANCELLED' | 'OVERDUE'

export interface DebtRecord {
  id: string
  userId: string
  personId: string
  person: Person
  title: string
  totalAmount: number
  recoveredAmount: number
  outstandingAmount: number
  status: DebtStatus
  dueDate: Date | null
  notes: string | null
  categoryId: string | null
  category: Category | null
  createdAt: Date
  updatedAt: Date

  // Relations
  debtTransactions?: DebtTransaction[]
  settlements?: Settlement[]
}

export interface DebtTransaction {
  id: string
  debtRecordId: string
  transactionId: string
  transaction: Transaction
  assignedAmount: number
  notes: string | null
  createdAt: Date
}

// ============================================================
// SETTLEMENTS
// ============================================================

export type SettlementMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'ADJUSTMENT' | 'MANUAL'

export interface Settlement {
  id: string
  userId: string
  debtRecordId: string
  amount: number
  method: SettlementMethod
  referenceId: string | null
  notes: string | null
  settledAt: Date
  createdAt: Date
}

export interface SettlementFormData {
  amount: number
  method: SettlementMethod
  referenceId?: string
  notes?: string
  settledAt: Date
}

// ============================================================
// CATEGORIES
// ============================================================

export interface Category {
  id: string
  userId: string | null
  name: string
  slug: string
  icon: string
  color: string
  isDefault: boolean
  isActive: boolean
  keywords: string[]
  createdAt: Date
}

// ============================================================
// IMPORT
// ============================================================

export type ImportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL'

export interface ImportBatch {
  id: string
  userId: string
  accountId: string | null
  fileName: string
  fileType: string
  bankDetected: string | null
  parserUsed: string | null
  totalRows: number
  importedRows: number
  skippedRows: number
  errorRows: number
  status: ImportStatus
  errorMessage: string | null
  importedAt: Date
  createdAt: Date
}

// ============================================================
// DASHBOARD / ANALYTICS
// ============================================================

export interface DashboardSummary {
  currentBalance: number
  pendingRecoveries: number
  projectedBalance: number
  targetBalance: number
  recoveredThisMonth: number
  totalExpensesThisMonth: number
  recoveryRate: number // 0-100
  unassignedCount: number
  largestPendingDebt: { person: string; amount: number } | null
  mostRecentExpense: Transaction | null
}

export interface PersonSummary {
  person: Person
  totalOutstanding: number
  totalDebt: number
  totalRecovered: number
  pendingDebts: number
  recoveryRate: number
  oldestDebt: Date | null
}

export interface MonthlyTrend {
  month: string // "Jul 2026"
  expenses: number
  recoveries: number
  net: number
}

export interface CategoryBreakdown {
  categorySlug: string
  categoryName: string
  color: string
  total: number
  count: number
  percentage: number
}

export interface DebtAgingBucket {
  label: string // "< 7 days" | "7-15 days" | "15-30 days" | "30+ days"
  count: number
  totalAmount: number
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export type NotificationType =
  | 'IMPORT_COMPLETE'
  | 'SETTLEMENT_RECEIVED'
  | 'DEBT_OVERDUE'
  | 'TARGET_REACHED'
  | 'LARGE_EXPENSE'
  | 'GENERAL'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  link: string | null
  isRead: boolean
  metadata: Record<string, unknown> | null
  createdAt: Date
}

// ============================================================
// API RESPONSES
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
