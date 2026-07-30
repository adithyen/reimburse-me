import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_CATEGORIES } from '@/lib/categorize'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Ensure user exists in our DB
      await ensureUserExists(data.user.id, data.user.email!, data.user.user_metadata)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}

async function ensureUserExists(
  authId: string,
  email: string,
  metadata: Record<string, string>
) {
  try {
    let user = await prisma.user.findUnique({ where: { authId } })

    if (!user) {
      user = await prisma.user.create({
        data: {
          authId,
          email,
          name: metadata?.name || metadata?.full_name || null,
          avatarUrl: metadata?.avatar_url || null,
          settings: {
            create: {
              theme: 'dark',
              currency: 'INR',
              timezone: 'Asia/Kolkata',
              targetBalance: 0,
              onboardingDone: false,
            },
          },
        },
      })

      // Seed default categories for this user
      await prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((cat) => ({
          userId: user!.id,
          name: cat.name,
          slug: cat.slug,
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
          isActive: true,
        })),
        skipDuplicates: true,
      })
    }
  } catch (e) {
    console.error('Failed to create user record:', e)
    // Don't fail the auth flow — user can still log in
  }
}
