import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_CATEGORIES } from '@/lib/categorize'

export async function getOrCreateAuthUser(authUserParam?: any) {
  let authUser = authUserParam

  if (!authUser) {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      authUser = user
    } catch (e) {
      console.error('Error fetching Supabase auth user:', e)
      return null
    }
  }

  if (!authUser) return null

  const metadata = authUser.user_metadata || {}
  const googleAvatar = metadata.avatar_url || metadata.picture || null
  const googleName = metadata.name || metadata.full_name || authUser.email?.split('@')[0] || 'User'

  try {
    // 1. Try finding user by authId (Supabase auth.users.id)
    let user = await prisma.user.findUnique({
      where: { authId: authUser.id },
      include: { settings: true },
    })

    // 2. If not found by authId, search by email to link account
    if (!user && authUser.email) {
      user = await prisma.user.findFirst({
        where: { email: { equals: authUser.email, mode: 'insensitive' as const } },
        include: { settings: true },
      })

      if (user) {
        // Sync authId so that all queries find this user record
        try {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              authId: authUser.id,
              ...(googleAvatar ? { avatarUrl: googleAvatar } : {}),
              ...(googleName && (!user.name || user.name === 'User') ? { name: googleName } : {}),
            },
            include: { settings: true },
          })
        } catch (e) {
          console.error('Failed to link authId:', e)
        }
      }
    }

    // 3. If still not found, create new user record
    if (!user && authUser.email) {
      try {
        user = await prisma.user.create({
          data: {
            authId: authUser.id,
            email: authUser.email,
            name: googleName,
            avatarUrl: googleAvatar,
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
          include: { settings: true },
        })

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
      } catch (e) {
        console.error('Error creating user record:', e)
        user = await prisma.user.findFirst({
          where: { OR: [{ authId: authUser.id }, { email: authUser.email }] },
          include: { settings: true },
        })
      }
    } else if (user) {
      // 4. Update avatar or name if Google profile data is available
      const updates: Record<string, any> = {}
      if (googleAvatar && user.avatarUrl !== googleAvatar) {
        updates.avatarUrl = googleAvatar
      }
      if (googleName && (!user.name || user.name === 'User')) {
        updates.name = googleName
      }

      if (Object.keys(updates).length > 0) {
        try {
          user = await prisma.user.update({
            where: { id: user.id },
            data: updates,
            include: { settings: true },
          })
        } catch (e) {
          console.error('Error updating user profile metadata:', e)
        }
      }
    }

    // 5. Ensure user settings exist
    if (user && !user.settings) {
      try {
        const settings = await prisma.userSettings.create({
          data: {
            userId: user.id,
            theme: 'dark',
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            targetBalance: 0,
            onboardingDone: false,
          },
        })
        user = { ...user, settings }
      } catch (e) {
        console.error('Failed to create user settings:', e)
      }
    }

    return user
  } catch (err) {
    console.error('getOrCreateAuthUser root exception:', err)
    return null
  }
}
