'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  CreditCard,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  TrendingUp,
  Wallet,
  Building2,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'Transactions',
    href: '/dashboard/transactions',
    icon: ArrowLeftRight,
    badge: 'unassigned',
  },
  {
    label: 'People',
    href: '/dashboard/people',
    icon: Users,
  },
  {
    label: 'Personal',
    href: '/dashboard/personal',
    icon: Tag,
  },
  {
    label: 'Debts',
    href: '/dashboard/debts',
    icon: CreditCard,
  },
  {
    label: 'Accounts',
    href: '/dashboard/accounts',
    icon: Building2,
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: FileText,
  },
]

const BOTTOM_ITEMS = [
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, unreadNotifications } = useUIStore()

  const isActive = (item: (typeof NAV_ITEMS)[0]) => {
    if (item.exact) return pathname === item.href
    return pathname.startsWith(item.href)
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 240 : 72 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex flex-col h-full bg-card border-r border-border flex-shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border min-h-[65px]">
        <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
          <span className="text-white font-bold text-base">₹</span>
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <span className="text-foreground font-bold text-base tracking-tight whitespace-nowrap">
                ReimburseMe
              </span>
              <p className="text-muted-foreground text-[10px] leading-none mt-0.5">
                Expense Recovery
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'sidebar-nav-item group',
                  active && 'active',
                  !sidebarOpen && 'justify-center px-0'
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 flex-shrink-0 transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap overflow-hidden flex-1"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {sidebarOpen && item.badge === 'unassigned' && unreadNotifications > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-auto text-xs h-5 px-1.5 bg-primary/20 text-primary border-primary/30"
                  >
                    {unreadNotifications}
                  </Badge>
                )}
                {active && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute left-0 w-0.5 h-5 bg-primary rounded-r-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Divider */}
        <div className="my-4 h-px bg-border" />

        {/* Bottom nav */}
        <nav className="space-y-1">
          {BOTTOM_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'sidebar-nav-item group',
                  active && 'active',
                  !sidebarOpen && 'justify-center px-0'
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className={cn('h-4 w-4 flex-shrink-0 transition-colors', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className={cn(
          'absolute bottom-6 -right-3 z-10',
          'w-6 h-6 rounded-full',
          'bg-card border border-border',
          'flex items-center justify-center',
          'text-muted-foreground hover:text-foreground',
          'hover:border-primary/50 transition-colors',
          'shadow-sm'
        )}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <motion.div
          animate={{ rotate: sidebarOpen ? 0 : 180 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronLeft className="h-3 w-3" />
        </motion.div>
      </button>
    </motion.aside>
  )
}
