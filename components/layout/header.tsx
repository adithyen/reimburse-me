'use client'

import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Search, Bell, Sun, Moon, Monitor, LogOut, User, Settings, Upload } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useUIStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

import { useEffect, useState } from 'react'

export function Header() {
  const router = useRouter()
  const supabase = createClient()
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])
  const { setSearchOpen, setImportModalOpen, unreadNotifications } = useUIStore()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
    toast.success('Signed out successfully')
  }

  const themeIcons = {
    light: <Sun className="h-4 w-4" />,
    dark: <Moon className="h-4 w-4" />,
    system: <Monitor className="h-4 w-4" />,
  }

  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'

  return (
    <header className="h-[65px] flex items-center justify-between px-6 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-20">
      {/* Left: Search */}
      <button
        onClick={() => setSearchOpen(true)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl',
          'border border-border bg-background/50',
          'text-muted-foreground text-sm',
          'hover:border-primary/30 hover:text-foreground',
          'transition-all duration-200',
          'w-64 group'
        )}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left text-xs">Search transactions, people...</span>
        <kbd className="text-[10px] border border-border rounded px-1.5 py-0.5 text-muted-foreground/60">
          ⌘K
        </kbd>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Import button */}
        <button
          onClick={() => setImportModalOpen(true)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium',
            'gradient-brand text-white',
            'hover:opacity-90 active:scale-95 transition-all',
            'shadow-sm shadow-primary/20'
          )}
          title="Import bank statement"
        >
          <Upload className="h-3.5 w-3.5" />
          Import
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(nextTheme)}
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center',
            'border border-border bg-card',
            'text-muted-foreground hover:text-foreground',
            'hover:border-primary/30 transition-all'
          )}
          title={`Switch to ${mounted ? nextTheme : 'system'} mode`}
        >
          {mounted ? (theme ? themeIcons[theme as keyof typeof themeIcons] || themeIcons.system : themeIcons.system) : themeIcons.system}
        </button>

        {/* Notifications */}
        <Link
          href="/dashboard/notifications"
          className={cn(
            'relative w-9 h-9 rounded-xl flex items-center justify-center',
            'border border-border bg-card',
            'text-muted-foreground hover:text-foreground',
            'hover:border-primary/30 transition-all'
          )}
        >
          <Bell className="h-4 w-4" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-white flex items-center justify-center font-bold">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-accent transition-colors border border-transparent hover:border-border">
            <Avatar className="h-7 w-7">
              <AvatarImage src="" />
              <AvatarFallback className="text-xs gradient-brand text-white font-bold">U</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground hidden sm:block">Account</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Link href="/dashboard/settings/profile" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
