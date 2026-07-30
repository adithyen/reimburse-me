import type { Metadata, Viewport } from 'next'
import { Inter, Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import { Providers } from '@/components/providers'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'ReimburseMe — Personal Expense Recovery',
    template: '%s | ReimburseMe',
  },
  description:
    'Track money spent on behalf of others, monitor reimbursements, and project your true financial position after pending recoveries.',
  keywords: ['expense tracker', 'reimbursement', 'personal finance', 'debt tracker', 'UPI', 'India'],
  authors: [{ name: 'ReimburseMe' }],
  openGraph: {
    title: 'ReimburseMe — Personal Expense Recovery',
    description: 'Track recoverable expenses, assign to people, and get paid back faster.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#07091a' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
            richColors
          />
        </Providers>
      </body>
    </html>
  )
}
