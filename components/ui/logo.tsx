'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface LogoProps {
  size?: number
  showText?: boolean
  variant?: 'auto' | 'light' | 'dark'
  className?: string
  textClassName?: string
  withCard?: boolean
}

export function LogoIcon({
  size = 36,
  variant = 'auto',
  withCard = true,
  className,
}: {
  size?: number
  variant?: 'auto' | 'light' | 'dark'
  withCard?: boolean
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('select-none flex-shrink-0 transition-transform duration-200', className)}
    >
      {/* Background Card */}
      {withCard && (
        <>
          {variant === 'light' ? (
            <rect x="16" y="16" width="480" height="480" rx="128" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="8" />
          ) : variant === 'dark' ? (
            <rect x="16" y="16" width="480" height="480" rx="128" fill="#121720" stroke="#1E2633" strokeWidth="8" />
          ) : (
            <rect
              x="16"
              y="16"
              width="480"
              height="480"
              rx="128"
              className="fill-white dark:fill-[#121720] stroke-black/10 dark:stroke-white/10"
              strokeWidth="8"
            />
          )}
        </>
      )}

      {/* Refresh Arc (Cyan) */}
      <path
        d="M 215 105 C 130 135 100 240 140 325 C 180 410 280 435 365 390"
        fill="none"
        className={cn(
          variant === 'light'
            ? 'stroke-[#00B8C8]'
            : variant === 'dark'
            ? 'stroke-[#00C8DC]'
            : 'stroke-[#00B8C8] dark:stroke-[#00C8DC]'
        )}
        strokeWidth="26"
        strokeLinecap="round"
      />

      {/* Refresh Arc (Lime Green) */}
      <path
        d="M 365 390 C 420 350 445 265 410 195"
        fill="none"
        stroke="#8AE000"
        strokeWidth="26"
        strokeLinecap="round"
      />

      {/* Arrow Head */}
      <path
        d="M 370 230 L 420 180 L 440 240"
        fill="none"
        stroke="#8AE000"
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Document Frame */}
      <path
        d="M 190 120 H 320 C 331 120 340 129 340 140 V 290 L 300 330 H 190 C 179 330 170 321 170 310 V 140 C 170 129 179 120 190 120 Z"
        fill="none"
        className={cn(
          variant === 'light'
            ? 'stroke-[#005B6A]'
            : variant === 'dark'
            ? 'stroke-[#00C8DC]'
            : 'stroke-[#005B6A] dark:stroke-[#00C8DC]'
        )}
        strokeWidth="18"
        strokeLinejoin="round"
      />

      {/* Folded Corner */}
      <path
        d="M 300 290 V 330 H 340"
        fill="none"
        className={cn(
          variant === 'light'
            ? 'stroke-[#005B6A]'
            : variant === 'dark'
            ? 'stroke-[#00C8DC]'
            : 'stroke-[#005B6A] dark:stroke-[#00C8DC]'
        )}
        strokeWidth="18"
        strokeLinejoin="round"
      />

      {/* Inner Lines */}
      <rect
        x="215"
        y="155"
        width="45"
        height="14"
        rx="7"
        className={cn(
          variant === 'light'
            ? 'fill-[#005B6A]'
            : variant === 'dark'
            ? 'fill-[#00C8DC]'
            : 'fill-[#005B6A] dark:fill-[#00C8DC]'
        )}
      />
      <rect
        x="215"
        y="195"
        width="90"
        height="14"
        rx="7"
        className={cn(
          variant === 'light'
            ? 'fill-[#88D4E5]'
            : variant === 'dark'
            ? 'fill-[#58B5C8]'
            : 'fill-[#88D4E5] dark:fill-[#58B5C8]'
        )}
      />
      <rect
        x="215"
        y="228"
        width="90"
        height="14"
        rx="7"
        className={cn(
          variant === 'light'
            ? 'fill-[#88D4E5]'
            : variant === 'dark'
            ? 'fill-[#58B5C8]'
            : 'fill-[#88D4E5] dark:fill-[#58B5C8]'
        )}
      />
      <rect
        x="215"
        y="261"
        width="65"
        height="14"
        rx="7"
        className={cn(
          variant === 'light'
            ? 'fill-[#88D4E5]'
            : variant === 'dark'
            ? 'fill-[#58B5C8]'
            : 'fill-[#88D4E5] dark:fill-[#58B5C8]'
        )}
      />
    </svg>
  )
}

export function LogoText({
  variant = 'auto',
  className,
}: {
  variant?: 'auto' | 'light' | 'dark'
  className?: string
}) {
  return (
    <span className={cn('font-bold tracking-tight text-xl font-sans', className)}>
      <span
        className={cn(
          variant === 'light'
            ? 'text-[#004F60]'
            : variant === 'dark'
            ? 'text-white'
            : 'text-[#004F60] dark:text-white'
        )}
      >
        Reimburse
      </span>
      <span className="text-[#00A3FF]">Me</span>
    </span>
  )
}

export function Logo({
  size = 36,
  showText = true,
  variant = 'auto',
  withCard = true,
  className,
  textClassName,
}: LogoProps) {
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoIcon size={size} variant={variant} withCard={withCard} />
      {showText && <LogoText variant={variant} className={textClassName} />}
    </div>
  )
}
