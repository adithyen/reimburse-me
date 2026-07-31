import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/logo'
import { GoogleIcon } from '@/components/ui/google-icon'
import { ArrowRight, FileText, QrCode, ShieldCheck, Users2, Wallet } from 'lucide-react'

export const metadata = {
  title: 'ReimburseMe — Personal Expense Recovery Platform',
  description: 'Track money spent on behalf of others, manage reimbursements, import bank statements, and project your true balance after pending recoveries.',
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is already authenticated, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#07090E] text-foreground font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Navigation Header */}
      <header className="border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={38} showText={true} />
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-muted-foreground hover:text-white transition-colors px-3 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-xs font-bold px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black transition-all shadow-md shadow-cyan-500/20"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Personal Expense Recovery Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
            Track money spent for others with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400">ReimburseMe</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            ReimburseMe helps you manage personal expense recoveries. Easily log money spent on behalf of friends, family, and group trips, import bank statements, and know your true projected financial balance.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 hover:opacity-95 transition-all"
            >
              Start Free Today
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white font-semibold text-sm transition-all"
            >
              <GoogleIcon className="w-4 h-4" />
              Sign in with Google
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid (Purpose Statement for Google Reviewers) */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          <div className="p-6 rounded-2xl bg-[#0F1422]/80 border border-white/10 backdrop-blur-xl space-y-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Users2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Contact & Debt Management</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Organize contacts and assign shared expenses. Track who owes you money with individual balance ledgers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0F1422]/80 border border-white/10 backdrop-blur-xl space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Bank PDF Statement Parsing</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload bank PDF statements to extract transactions offline and assign them to specific people in one tap.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0F1422]/80 border border-white/10 backdrop-blur-xl space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">UPI QR Repayments</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Generate settlement summaries and instant UPI QR codes to receive payments back quickly and accurately.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0B0F19]/80 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo size={24} showText={true} />
            <span>© {new Date().getFullYear()} ReimburseMe. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
