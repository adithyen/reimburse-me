import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
        {children}
      </div>

      {/* Right: Brand panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#1a0a3c] via-[#0d0d2b] to-[#07091a]">
        {/* Decorative circles */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-pink-600/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-16">
          {/* Logo */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center">
                <span className="text-white font-bold text-lg">₹</span>
              </div>
              <span className="text-white text-2xl font-bold tracking-tight">ReimburseMe</span>
            </div>
            <p className="text-violet-300/70 text-sm">Personal Expense Recovery Platform</p>
          </div>

          {/* Value props */}
          <div className="space-y-8">
            <FeaturePoint
              icon="💳"
              title="Track what others owe you"
              description="Import bank statements or add expenses manually. Assign to people in one tap."
            />
            <FeaturePoint
              icon="📊"
              title="See your true financial picture"
              description="Current balance + pending recoveries = your projected balance. Always know where you stand."
            />
            <FeaturePoint
              icon="📄"
              title="Get paid faster"
              description="Generate professional PDF receipts with UPI QR codes. Share on WhatsApp in seconds."
            />
          </div>

          {/* Social proof */}
          <div className="mt-12 p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex -space-x-2">
                {['#6366f1', '#8b5cf6', '#ec4899'].map((color, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-[#1a0a3c] flex items-center justify-center text-xs text-white font-bold"
                    style={{ backgroundColor: color }}
                  >
                    {['A', 'B', 'C'][i]}
                  </div>
                ))}
              </div>
              <span className="text-violet-200 text-sm font-medium">Trusted by students & professionals</span>
            </div>
            <p className="text-violet-300/60 text-xs">
              "Finally stopped losing track of money spent for family. ReimburseMe changed everything."
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeaturePoint({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-lg flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-white font-semibold text-sm mb-1">{title}</h3>
        <p className="text-violet-300/60 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
