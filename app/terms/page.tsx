import React from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { ArrowLeft, FileText } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service | ReimburseMe',
  description: 'Terms of Service for ReimburseMe application.',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#07090E] text-foreground font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <header className="border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size={32} showText={true} />
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to App
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="p-8 sm:p-12 rounded-3xl bg-[#0F1422]/90 border border-white/10 shadow-2xl backdrop-blur-2xl space-y-8">
          <div className="border-b border-white/10 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3">
              <FileText className="w-3.5 h-3.5" /> Terms & Conditions
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Terms of Service</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <section className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <h2 className="text-lg font-bold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using ReimburseMe at <span className="text-white">reimburseme.adithyen.me</span>, you agree to be bound by these Terms of Service.
            </p>

            <h2 className="text-lg font-bold text-white pt-4">2. Description of Service</h2>
            <p>
              ReimburseMe provides a personal expense recovery tracker allowing users to log shared expenses, import bank statements, track debt balances, and generate PDF receipts.
            </p>

            <h2 className="text-lg font-bold text-white pt-4">3. User Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>

            <h2 className="text-lg font-bold text-white pt-4">4. Limitation of Liability</h2>
            <p>
              ReimburseMe is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. We are not liable for any financial inaccuracies resulting from user input errors or statement parsing.
            </p>

            <h2 className="text-lg font-bold text-white pt-4">5. Contact Information</h2>
            <p>
              For any questions regarding these Terms, contact us at <a href="mailto:adithyanh2006@gmail.com" className="text-cyan-400 hover:underline">adithyanh2006@gmail.com</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
