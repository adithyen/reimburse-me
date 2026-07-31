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
import { Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, User, Mail, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Include at least one uppercase letter')
      .regex(/[0-9]/, 'Include at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const password = watch('password', '')

  const passwordStrength = (pwd: string) => {
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    return score
  }

  const strength = passwordStrength(password)
  const strengthColors = ['', 'bg-rose-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500']
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong']

  const onSubmit = async (data: SignupForm) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { name: data.name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    setEmailSent(true)
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

  if (emailSent) {
    return (
      <div className="w-full max-w-md mx-auto text-center p-8 rounded-2xl bg-[#111622]/90 border border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
        <p className="text-muted-foreground text-xs leading-relaxed mb-6">
          We sent a verification link to your email address. Click it to activate your account.
        </p>
        <Link
          href="/login"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-500 text-black font-semibold text-sm hover:bg-cyan-400 transition-colors"
        >
          Return to login
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Mobile Logo Header */}
      <div className="mb-8 lg:hidden flex justify-center">
        <Logo size={40} />
      </div>

      {/* Main Clean Card */}
      <div className="p-8 sm:p-9 rounded-2xl bg-[#111622]/90 border border-white/10 shadow-2xl backdrop-blur-xl">
        {/* Card Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Create account
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            Get started with ReimburseMe
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
          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Full name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <input
                {...register('name')}
                type="text"
                placeholder="Adithyan H"
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium',
                  'bg-black/40 border border-white/10',
                  'text-white placeholder:text-muted-foreground/50',
                  'focus:outline-none focus:ring-1 focus:ring-cyan-500/60 focus:border-cyan-500/60',
                  'transition-all duration-150',
                  errors.name && 'border-rose-500/80 focus:ring-rose-500/40'
                )}
              />
            </div>
            {errors.name && (
              <p className="mt-1.5 text-xs text-rose-400">{errors.name.message}</p>
            )}
          </div>

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
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 chars (1 uppercase, 1 number)"
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
            {password && (
              <div className="mt-2">
                <div className="flex gap-1.5 mb-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-all duration-200',
                        strength >= i ? strengthColors[strength] : 'bg-white/10'
                      )}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Strength:{' '}
                  <span
                    className={cn(
                      'font-medium',
                      strength === 1 && 'text-rose-400',
                      strength === 2 && 'text-amber-400',
                      strength === 3 && 'text-yellow-400',
                      strength === 4 && 'text-emerald-400'
                    )}
                  >
                    {strengthLabels[strength]}
                  </span>
                </p>
              </div>
            )}
            {errors.password && (
              <p className="mt-1.5 text-xs text-rose-400">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <input
                {...register('confirmPassword')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium',
                  'bg-black/40 border border-white/10',
                  'text-white placeholder:text-muted-foreground/50',
                  'focus:outline-none focus:ring-1 focus:ring-cyan-500/60 focus:border-cyan-500/60',
                  'transition-all duration-150',
                  errors.confirmPassword && 'border-rose-500/80 focus:ring-rose-500/40'
                )}
              />
            </div>
            {errors.confirmPassword && (
              <p className="mt-1.5 text-xs text-rose-400">{errors.confirmPassword.message}</p>
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
                Create account
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-cyan-400 font-medium hover:text-cyan-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
