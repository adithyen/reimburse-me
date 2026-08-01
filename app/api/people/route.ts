import { NextResponse } from 'next/server'
import { getOrCreateAuthUser } from '@/lib/auth-user'
import { prisma } from '@/lib/prisma'

// GET /api/people
export async function GET(request: Request) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const includeArchived = searchParams.get('includeArchived') === 'true'

  const people = await prisma.person.findMany({
    where: {
      userId: user.id,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    orderBy: { name: 'asc' },
    include: {
      debtRecords: {
        where: { status: { in: ['PENDING', 'PARTIAL'] } },
        select: { outstandingAmount: true },
      },
    },
  })

  const peopleWithSummary = people.map((p) => ({
    ...p,
    totalOutstanding: p.debtRecords.reduce((sum, d) => sum + d.outstandingAmount, 0),
    pendingDebts: p.debtRecords.length,
    debtRecords: undefined,
  }))

  return NextResponse.json({ success: true, data: peopleWithSummary })
}

// POST /api/people
export async function POST(request: Request) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, relationship, phone, email, upiId, color, notes, tags } = body

  if (!name || name.trim().length < 1) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const person = await prisma.person.create({
    data: {
      userId: user.id,
      name: name.trim(),
      relationship: relationship || null,
      phone: phone || null,
      email: email || null,
      upiId: upiId || null,
      color: color || '#8b5cf6',
      notes: notes || null,
      tags: tags || [],
    },
  })

  return NextResponse.json({ success: true, data: person }, { status: 201 })
}
