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
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock } from 'lucide-react'
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
      {/* Mobile Logo Header */}
      <div className="mb-8 lg:hidden flex justify-center">
        <Logo size={40} />
      </div>

      {/* Main Clean Card */}
      <div className="p-8 sm:p-9 rounded-2xl bg-[#111622]/90 border border-white/10 shadow-2xl backdrop-blur-xl">
        {/* Card Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Sign in
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            Access your expense recovery dashboard
          </p>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isSubmitting}
          className={cn(
            'w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-white',
            'bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-white/20',
            'transition-all duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed group'
          )}
        >
          {isGoogleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-muted-foreground/70 text-[11px] uppercase tracking-wider">
            or email
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium',
                  'bg-black/40 border border-white/10',
                  'text-white placeholder:text-muted-foreground/50',
                  'focus:outline-none focus:ring-1 focus:ring-cyan-500/60 focus:border-cyan-500/60',
                  'transition-all duration-150',
                  errors.email && 'border-rose-500/80 focus:ring-rose-500/40'
                )}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-rose-400">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-muted-foreground">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className={cn(
                  'w-full pl-10 pr-12 py-2.5 rounded-xl text-sm font-medium',
                  'bg-black/40 border border-white/10',
                  'text-white placeholder:text-muted-foreground/50',
                  'focus:outline-none focus:ring-1 focus:ring-cyan-500/60 focus:border-cyan-500/60',
                  'transition-all duration-150',
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
              <p className="mt-1.5 text-xs text-rose-400">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || isGoogleLoading}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl mt-2',
              'bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm',
              'transition-all duration-150 shadow-md shadow-cyan-500/20',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-cyan-400 font-medium hover:text-cyan-300 transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
