import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_CATEGORIES } from '@/lib/categorize'

export async function getOrCreateAuthUser() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null

  let user = await prisma.user.findUnique({
    where: { authId: authUser.id },
    include: { settings: true },
  })

  const metadata = authUser.user_metadata || {}
  const googleAvatar = metadata.avatar_url || metadata.picture || null
  const googleName = metadata.name || metadata.full_name || authUser.email?.split('@')[0] || 'User'

  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          authId: authUser.id,
          email: authUser.email!,
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
      user = await prisma.user.findUnique({
        where: { authId: authUser.id },
        include: { settings: true },
      })
    }
  } else {
    // If user exists, check if name or avatarUrl needs updating from Google metadata
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
