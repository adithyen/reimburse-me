'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Logo } from '@/components/ui/logo'
import { GoogleIcon } from '@/components/ui/google-icon'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Welcome back!')
    router.push('/dashboard')
    router.refresh()
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      toast.error(error.message)
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Mobile Logo Branding Header */}
      <div className="mb-8 lg:hidden flex justify-center">
        <Logo size={42} />
      </div>

      {/* Main Glassmorphic Form Card */}
      <div className="p-8 sm:p-9 rounded-3xl bg-[#111726]/80 border border-white/10 shadow-2xl backdrop-blur-2xl">
        {/* Card Header */}
        <div className="mb-7">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Welcome Back
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sign in to ReimburseMe
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
            Enter your credentials or use single sign-on to access your dashboard.
          </p>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isSubmitting}
          className={cn(
            'w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl font-medium text-sm text-white',
            'bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/20',
            'transition-all duration-200 shadow-md hover:shadow-lg',
            'disabled:opacity-50 disabled:cursor-not-allowed group'
          )}
        >
          {isGoogleLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          ) : (
            <GoogleIcon className="h-5 w-5 transition-transform group-hover:scale-110 duration-200" />
          )}
          <span>Sign in with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-muted-foreground/80 text-xs uppercase tracking-wider font-semibold">
            or email
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={cn(
                  'w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium',
                  'bg-black/30 border border-white/10',
                  'text-white placeholder:text-muted-foreground/60',
                  'focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/80',
                  'transition-all duration-200',
                  errors.email && 'border-rose-500/80 focus:ring-rose-500/40'
                )}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className={cn(
                  'w-full pl-10 pr-12 py-3 rounded-xl text-sm font-medium',
                  'bg-black/30 border border-white/10',
                  'text-white placeholder:text-muted-foreground/60',
                  'focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/80',
                  'transition-all duration-200',
                  errors.password && 'border-rose-500/80 focus:ring-rose-500/40'
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || isGoogleLoading}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl mt-2',
              'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-bold text-sm',
              'hover:opacity-95 active:scale-[0.99] shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Sign in to Dashboard
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-cyan-400 font-semibold hover:text-cyan-300 transition-colors underline-offset-4 hover:underline">
            Create one for free
          </Link>
        </p>
      </div>
    </div>
  )
}
