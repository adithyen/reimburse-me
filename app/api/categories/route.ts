import { NextResponse } from 'next/server'
import { getOrCreateAuthUser } from '@/lib/auth-user'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const categories = await prisma.category.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ success: true, data: categories })
}
