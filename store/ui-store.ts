'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  // Selected entities (for quick navigation)
  selectedPersonId: string | null
  setSelectedPersonId: (id: string | null) => void

  selectedAccountId: string | null
  setSelectedAccountId: (id: string | null) => void

  // Modal states
  importModalOpen: boolean
  setImportModalOpen: (open: boolean) => void

  addPersonModalOpen: boolean
  setAddPersonModalOpen: (open: boolean) => void

  addTransactionModalOpen: boolean
  setAddTransactionModalOpen: (open: boolean) => void

  addDebtModalOpen: boolean
  setAddDebtModalOpen: (open: boolean) => void

  // Transaction assignment
  assigningTransactionId: string | null
  setAssigningTransactionId: (id: string | null) => void

  // Global search
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  searchQuery: string
  setSearchQuery: (q: string) => void

  // Notification count (badge)
  unreadNotifications: number
  setUnreadNotifications: (count: number) => void
  decrementUnread: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Sidebar
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),

      // Theme
      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      // Selected entities
      selectedPersonId: null,
      setSelectedPersonId: (id) => set({ selectedPersonId: id }),

      selectedAccountId: null,
      setSelectedAccountId: (id) => set({ selectedAccountId: id }),

      // Modal states
      importModalOpen: false,
      setImportModalOpen: (open) => set({ importModalOpen: open }),

      addPersonModalOpen: false,
      setAddPersonModalOpen: (open) => set({ addPersonModalOpen: open }),

      addTransactionModalOpen: false,
      setAddTransactionModalOpen: (open) => set({ addTransactionModalOpen: open }),

      addDebtModalOpen: false,
      setAddDebtModalOpen: (open) => set({ addDebtModalOpen: open }),

      // Transaction assignment
      assigningTransactionId: null,
      setAssigningTransactionId: (id) => set({ assigningTransactionId: id }),

      // Global search
      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),
      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),

      // Notifications
      unreadNotifications: 0,
      setUnreadNotifications: (count) => set({ unreadNotifications: count }),
      decrementUnread: () => set({ unreadNotifications: Math.max(0, get().unreadNotifications - 1) }),
    }),
    {
      name: 'reimburse-ui-store',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
      }),
    }
  )
)
