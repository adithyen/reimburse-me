import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { ArrowUpRight, FileText, QrCode, Users2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Authentication | ReimburseMe',
  description: 'Track money spent for others and manage your personal expense recoveries.',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full flex bg-[#090C15] text-foreground selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden font-sans">
      {/* Background Glow Accents */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
      </div>

      {/* Container */}
      <div className="relative z-10 flex w-full min-h-screen">
        {/* Left Side: Auth Form */}
        <div className="w-full lg:w-[50%] xl:w-[45%] flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-[#0B0F19]/80 backdrop-blur-xl border-r border-white/5">
          {/* Header Logo */}
          <div className="flex items-center justify-between w-full mb-8">
            <Logo size={36} showText={true} />
            <span className="text-xs text-muted-foreground/80 font-medium px-3 py-1 rounded-full bg-white/5 border border-white/10">
              Personal Expense Recovery
            </span>
          </div>

          {/* Form Children */}
          <div className="my-auto py-6">
            {children}
          </div>

          {/* Minimal Footer */}
          <div className="pt-6 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground/60">
            <span>ReimburseMe © {new Date().getFullYear()}</span>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Minimal Feature Overview (NO FALSE CLAIMS) */}
        <div className="hidden lg:flex lg:w-[50%] xl:w-[55%] relative flex-col justify-between p-12 lg:p-16 bg-gradient-to-br from-[#0B0E17] via-[#080B12] to-[#05070D]">
          {/* Header */}
          <div className="space-y-4 max-w-xl">
            <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Track money you spend for friends, family, and group expenses.
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Keep a clear record of pending recoveries, import bank statements, and know your true projected balance after settlements.
            </p>
          </div>

          {/* Clean Minimal Core Features (Truthful & Relevant) */}
          <div className="my-8 space-y-4 max-w-lg">
            <FeatureCard
              icon={<Users2 className="w-5 h-5 text-cyan-400" />}
              title="People & Debt Tracking"
              description="Assign shared transactions to contacts and track outstanding balances in one place."
            />
            <FeatureCard
              icon={<FileText className="w-5 h-5 text-blue-400" />}
              title="Statement PDF Import"
              description="Upload bank PDF statements to extract and assign expenses directly."
            />
            <FeatureCard
              icon={<QrCode className="w-5 h-5 text-emerald-400" />}
              title="Instant Repayments"
              description="Generate UPI QR codes and PDF summary reports for quick settlements."
            />
          </div>

          {/* Bottom Info Note */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 max-w-lg text-xs text-muted-foreground">
            <span className="text-white font-medium">Simple & Private:</span> Designed for personal expense tracking with seamless offline document parsing.
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-4 rounded-2xl bg-[#121622]/60 border border-white/10 backdrop-blur-xl flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
