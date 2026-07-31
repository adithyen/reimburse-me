import type { Metadata } from 'next'
import { Logo } from '@/components/ui/logo'
import { ShieldCheck, Zap, ArrowUpRight, CheckCircle2, TrendingUp, Wallet, Smartphone } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Authentication | ReimburseMe',
  description: 'Track money spent for others, manage reimbursements, and project your true balance.',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full flex bg-[#07090E] text-foreground selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden font-sans">
      {/* Dynamic Background Mesh Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-cyan-600/10 blur-[140px] animate-pulse duration-1000" />
        <div className="absolute top-1/3 -right-40 w-[650px] h-[650px] rounded-full bg-indigo-600/10 blur-[160px]" />
        <div className="absolute -bottom-40 left-1/3 w-[700px] h-[700px] rounded-full bg-emerald-600/10 blur-[180px]" />
        {/* Subtle Grid overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
      </div>

      {/* Main Content Split */}
      <div className="relative z-10 flex w-full min-h-screen">
        {/* Left Side: Auth Form Container */}
        <div className="w-full lg:w-[50%] xl:w-[45%] flex flex-col justify-between p-6 sm:p-10 lg:p-14 border-r border-white/5 bg-[#0A0E17]/60 backdrop-blur-xl">
          {/* Top Brand Header */}
          <div className="flex items-center justify-between w-full mb-8">
            <Logo size={38} showText={true} />
            <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>RBI AA Framework Ready</span>
            </div>
          </div>

          {/* Form Content */}
          <div className="my-auto py-6">
            {children}
          </div>

          {/* Footer Copyright */}
          <div className="pt-6 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground/70">
            <span>© {new Date().getFullYear()} ReimburseMe Inc.</span>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
        </div>

        {/* Right Side: High-End Live Platform Preview Showcase */}
        <div className="hidden lg:flex lg:w-[50%] xl:w-[55%] relative flex-col justify-between p-12 lg:p-16 overflow-hidden bg-gradient-to-br from-[#0B101C] via-[#080B14] to-[#04060A]">
          {/* Ambient Glow accents */}
          <div className="absolute top-1/4 right-10 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Tagline */}
          <div className="relative z-10 space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold tracking-wide uppercase">
              <Zap className="w-3.5 h-3.5" /> Smart Expense Recovery
            </div>
            <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Never lose track of money you spent for others again.
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              Connect bank accounts, upload statements, and auto-track outstanding settlements with instant WhatsApp PDF receipts.
            </p>
          </div>

          {/* Interactive Live Financial Dashboard Showcase Card */}
          <div className="relative z-10 my-8 space-y-4 max-w-lg">
            {/* Card 1: Balance Projection */}
            <div className="p-5 rounded-2xl bg-[#111726]/80 border border-white/10 shadow-2xl backdrop-blur-2xl transition-transform hover:scale-[1.01] duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">True Financial Outlook</p>
                    <h4 className="text-sm font-semibold text-white">Projected Recovery Balance</h4>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +₹18,400 Pending
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-black/30 border border-white/5">
                <div>
                  <span className="text-[11px] text-muted-foreground block mb-0.5">Bank Balance</span>
                  <span className="text-base font-bold text-white">₹42,500</span>
                </div>
                <div className="border-l border-white/10 pl-3">
                  <span className="text-[11px] text-emerald-400/90 block mb-0.5">Expected After Recovery</span>
                  <span className="text-base font-bold text-emerald-400">₹60,900</span>
                </div>
              </div>
            </div>

            {/* Card 2: Recent Activity Snippet */}
            <div className="p-4 rounded-2xl bg-[#111726]/60 border border-white/10 shadow-xl backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-white">Goa Trip & Dinner Split</p>
                  <p className="text-[11px] text-muted-foreground">Assigned to Mom, Rahul & 3 others</p>
                </div>
              </div>
              <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/20">
                ₹12,400
              </span>
            </div>
          </div>

          {/* Social Proof Footer */}
          <div className="relative z-10 p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md max-w-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 border-2 border-[#0B101C] flex items-center justify-center text-xs font-bold text-white">
                    A
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 border-2 border-[#0B101C] flex items-center justify-center text-xs font-bold text-white">
                    R
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 border-2 border-[#0B101C] flex items-center justify-center text-xs font-bold text-white">
                    S
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-white">4.9/5 Rating</span>
                    <span className="text-yellow-400 text-xs">★★★★★</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Trusted by 2,500+ students & professionals</p>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-xs text-muted-foreground/90 italic leading-relaxed">
              "No more awkward manual calculations or forgetting who paid for group bills. Everything is tracked transparently!"
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
