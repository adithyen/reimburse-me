import React from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy | ReimburseMe',
  description: 'Privacy Policy for ReimburseMe application.',
}

export default function PrivacyPolicyPage() {
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
              <ShieldCheck className="w-3.5 h-3.5" /> Privacy & Data Protection
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <section className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <h2 className="text-lg font-bold text-white">1. Overview</h2>
            <p>
              ReimburseMe (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and safeguarded when you use our application located at <span className="text-white">reimburseme.adithyen.me</span>.
            </p>

            <h2 className="text-lg font-bold text-white pt-4">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Account Information:</strong> Name, email address, and profile details provided when signing in via Google OAuth or email signup.</li>
              <li><strong className="text-white">Expense & Debt Data:</strong> Shared expenses, personal label categories, transaction amounts, and contacts you add.</li>
              <li><strong className="text-white">Uploaded Documents:</strong> Bank PDF statements uploaded for offline transaction parsing. Documents are parsed to extract line items for your review.</li>
            </ul>

            <h2 className="text-lg font-bold text-white pt-4">3. How We Use Google User Data</h2>
            <p>
              When you sign in using Google OAuth, we access your basic profile information (email address, full name, and avatar image) solely to authenticate your account and personalize your user dashboard. We do not store Google passwords, and we do not sell or share your Google profile data with third parties.
            </p>

            <h2 className="text-lg font-bold text-white pt-4">4. Data Storage & Security</h2>
            <p>
              Your data is stored securely using industry-standard encrypted databases hosted on Supabase (PostgreSQL with Row Level Security). All communications between your browser and our servers use HTTPS/TLS encryption.
            </p>

            <h2 className="text-lg font-bold text-white pt-4">5. Data Sharing & Third Parties</h2>
            <p>
              We do not sell, rent, or trade your personal data. Data is only processed through secure infrastructure providers necessary to run the service (Supabase for authentication and database storage).
            </p>

            <h2 className="text-lg font-bold text-white pt-4">6. Your Rights</h2>
            <p>
              You have the right to view, edit, or delete your account and associated financial records at any time from your settings or by contacting support.
            </p>

            <h2 className="text-lg font-bold text-white pt-4">7. Contact Us</h2>
            <p>
              If you have any questions or concerns regarding this Privacy Policy, please reach out to us at <a href="mailto:adithyanh2006@gmail.com" className="text-cyan-400 hover:underline">adithyanh2006@gmail.com</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
