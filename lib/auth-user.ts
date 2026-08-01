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
    // Merge any duplicate users sharing the same email
    if (authUser.email) {
      await mergeDuplicateUsersByEmail(authUser, googleAvatar, googleName)
    }

    // Now find the unified user record
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { authId: authUser.id },
          ...(authUser.email ? [{ email: authUser.email }] : []),
        ],
      },
      include: { settings: true },
    })

    if (!user && authUser.email) {
      // Create new user if still none exists
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
      // Update authId, avatar, or name if needed
      const needsAuthIdUpdate = user.authId !== authUser.id
      const needsAvatarUpdate = googleAvatar && user.avatarUrl !== googleAvatar
      const needsNameUpdate = googleName && (!user.name || user.name === 'User')

      if (needsAuthIdUpdate || needsAvatarUpdate || needsNameUpdate) {
        try {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              ...(needsAuthIdUpdate ? { authId: authUser.id } : {}),
              ...(needsAvatarUpdate ? { avatarUrl: googleAvatar } : {}),
              ...(needsNameUpdate ? { name: googleName } : {}),
            },
            include: { settings: true },
          })
        } catch (e) {
          console.error('Error updating user metadata:', e)
        }
      }
    }

    return user
  } catch (err) {
    console.error('getOrCreateAuthUser root exception:', err)
    return null
  }
}

async function mergeDuplicateUsersByEmail(authUser: any, googleAvatar: string | null, googleName: string) {
  try {
    const matchingUsers = await prisma.user.findMany({
      where: {
        OR: [{ authId: authUser.id }, { email: authUser.email }],
      },
      include: {
        _count: {
          select: {
            transactions: true,
            people: true,
            debtRecords: true,
            accounts: true,
          },
        },
      },
    })

    if (matchingUsers.length <= 1) return

    // Sort by count of records (most data first), then by authId match, then oldest
    matchingUsers.sort((a, b) => {
      const countA = a._count.transactions + a._count.people + a._count.debtRecords + a._count.accounts
      const countB = b._count.transactions + b._count.people + b._count.debtRecords + b._count.accounts
      if (countA !== countB) return countB - countA
      if (a.authId === authUser.id) return -1
      if (b.authId === authUser.id) return 1
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    const primaryUser = matchingUsers[0]

    for (let i = 1; i < matchingUsers.length; i++) {
      const secondaryUser = matchingUsers[i]
      if (secondaryUser.id === primaryUser.id) continue

      console.log(`Merging secondary user ${secondaryUser.id} into primary user ${primaryUser.id}`)

      // Transfer all relations to primary user
      await prisma.transaction.updateMany({ where: { userId: secondaryUser.id }, data: { userId: primaryUser.id } })
      await prisma.person.updateMany({ where: { userId: secondaryUser.id }, data: { userId: primaryUser.id } })
      await prisma.account.updateMany({ where: { userId: secondaryUser.id }, data: { userId: primaryUser.id } })
      await prisma.debtRecord.updateMany({ where: { userId: secondaryUser.id }, data: { userId: primaryUser.id } })
      await prisma.settlement.updateMany({ where: { userId: secondaryUser.id }, data: { userId: primaryUser.id } })
      await prisma.importBatch.updateMany({ where: { userId: secondaryUser.id }, data: { userId: primaryUser.id } })
      await prisma.notification.updateMany({ where: { userId: secondaryUser.id }, data: { userId: primaryUser.id } })
      await prisma.auditLog.updateMany({ where: { userId: secondaryUser.id }, data: { userId: primaryUser.id } })
      await prisma.attachment.updateMany({ where: { userId: secondaryUser.id }, data: { userId: primaryUser.id } })
      await prisma.personalLabel.updateMany({ where: { userId: secondaryUser.id }, data: { userId: primaryUser.id } })

      // Clean up secondary user dependencies
      await prisma.category.deleteMany({ where: { userId: secondaryUser.id } })
      await prisma.userSettings.deleteMany({ where: { userId: secondaryUser.id } })
      await prisma.user.delete({ where: { id: secondaryUser.id } }).catch(() => {})
    }

    // Ensure primary user is linked to authId & updated
    await prisma.user.update({
      where: { id: primaryUser.id },
      data: {
        authId: authUser.id,
        email: authUser.email,
        ...(googleAvatar ? { avatarUrl: googleAvatar } : {}),
        ...(googleName ? { name: googleName } : {}),
      },
    })
  } catch (e) {
    console.error('Error merging duplicate users:', e)
  }
}
