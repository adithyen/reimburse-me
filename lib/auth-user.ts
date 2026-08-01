import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_CATEGORIES } from '@/lib/categorize'

export async function getOrCreateAuthUser() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null

  const metadata = authUser.user_metadata || {}
  const googleAvatar = metadata.avatar_url || metadata.picture || null
  const googleName = metadata.name || metadata.full_name || authUser.email?.split('@')[0] || 'User'

  // 1. Try finding user by authId (Supabase auth.users.id)
  let user = await prisma.user.findUnique({
    where: { authId: authUser.id },
    include: { settings: true },
  })

  // 2. If not found by authId, try finding user by email to link accounts
  if (!user && authUser.email) {
    user = await prisma.user.findUnique({
      where: { email: authUser.email },
      include: { settings: true },
    })

    if (user) {
      // Link the new Google OAuth authId to the existing database user
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
        console.error('Error linking authId to existing user:', e)
      }
    }
  }

  // 3. If still not found, create a new user record
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
    } catch (e) {
      console.error('Error auto-creating user in getOrCreateAuthUser:', e)
      // Fallback: try finding by authId or email once more
      user = await prisma.user.findFirst({
        where: { OR: [{ authId: authUser.id }, { email: authUser.email }] },
        include: { settings: true },
      })
    }
  } else if (user) {
    // 4. Update avatar or name if needed
    const needsAvatarUpdate = googleAvatar && user.avatarUrl !== googleAvatar
    const needsNameUpdate = googleName && (!user.name || user.name === 'User')

    if (needsAvatarUpdate || needsNameUpdate) {
      try {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            ...(needsAvatarUpdate ? { avatarUrl: googleAvatar } : {}),
            ...(needsNameUpdate ? { name: googleName } : {}),
          },
          include: { settings: true },
        })
      } catch (e) {
        console.error('Error updating user avatar/name in getOrCreateAuthUser:', e)
      }
    }
  }

  return user
}
