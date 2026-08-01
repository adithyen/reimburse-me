import { NextResponse } from 'next/server'
import { getOrCreateAuthUser } from '@/lib/auth-user'
import { prisma } from '@/lib/prisma'

// GET /api/people/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const person = await prisma.person.findFirst({
    where: { id, userId: user.id },
    include: {
      debtRecords: {
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          debtTransactions: {
            include: { transaction: { include: { category: true } } },
          },
          settlements: {
            orderBy: { settledAt: 'desc' },
          },
        },
      },
    },
  })

  if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Compute summary
  const totalDebt = person.debtRecords.reduce((s, d) => s + d.totalAmount, 0)
  const totalRecovered = person.debtRecords.reduce((s, d) => s + d.recoveredAmount, 0)
  const totalOutstanding = person.debtRecords
    .filter((d) => d.status !== 'SETTLED' && d.status !== 'CANCELLED')
    .reduce((s, d) => s + d.outstandingAmount, 0)

  return NextResponse.json({
    success: true,
    data: {
      ...person,
      summary: { totalDebt, totalRecovered, totalOutstanding },
    },
  })
}

// PATCH /api/people/[id]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await prisma.person.findFirst({ where: { id, userId: user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { name, relationship, phone, email, upiId, color, notes, tags, isArchived, isActive } = body

  const updated = await prisma.person.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(relationship !== undefined && { relationship }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(upiId !== undefined && { upiId }),
      ...(color !== undefined && { color }),
      ...(notes !== undefined && { notes }),
      ...(tags !== undefined && { tags }),
      ...(isArchived !== undefined && { isArchived }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  return NextResponse.json({ success: true, data: updated })
}

// DELETE /api/people/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await prisma.person.findFirst({ where: { id, userId: user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Soft delete
  await prisma.person.update({ where: { id }, data: { isArchived: true, isActive: false } })
  return NextResponse.json({ success: true })
}
