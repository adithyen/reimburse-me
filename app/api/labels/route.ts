import { NextResponse } from 'next/server'
import { getOrCreateAuthUser } from '@/lib/auth-user'
import { prisma } from '@/lib/prisma'

// GET /api/labels
export async function GET(request: Request) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const labels = await prisma.personalLabel.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ success: true, data: labels })
}

// POST /api/labels
export async function POST(request: Request) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, color, icon } = body

  if (!name || name.trim().length < 1) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const label = await prisma.personalLabel.upsert({
    where: {
      userId_name: {
        userId: user.id,
        name: name.trim(),
      }
    },
    update: {
      color: color || '#64748b',
      icon: icon || 'tag',
    },
    create: {
      userId: user.id,
      name: name.trim(),
      color: color || '#64748b',
      icon: icon || 'tag',
    },
  })

  return NextResponse.json({ success: true, data: label })
}
