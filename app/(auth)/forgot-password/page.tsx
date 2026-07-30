'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
})

type Form = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Form) => {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-6">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">Reset link sent</h1>
        <p className="text-muted-foreground text-sm mb-2">
          We sent a password reset link to
        </p>
        <p className="text-foreground font-medium text-sm mb-8">{getValues('email')}</p>
        <p className="text-muted-foreground text-xs mb-6">
          Check your spam folder if you don&apos;t see it within a few minutes.
        </p>
        <Link href="/login" className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:text-primary/80 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="h-4 w-4" /> Back to Login
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Forgot your password?</h1>
        <p className="text-muted-foreground text-sm">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            className={cn(
              'w-full px-4 py-3 rounded-xl text-sm bg-card border border-border',
              'text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all',
              errors.email && 'border-destructive'
            )}
          />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl',
            'gradient-brand text-white font-semibold text-sm',
            'hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
        </button>
      </form>
    </div>
  )
}
