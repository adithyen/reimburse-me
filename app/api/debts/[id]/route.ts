import { NextResponse } from 'next/server'
import { getOrCreateAuthUser } from '@/lib/auth-user'
import { prisma } from '@/lib/prisma'

// PATCH /api/debts/[id] — update debt record title/notes
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await prisma.debtRecord.findFirst({ where: { id, userId: user.id } })
  if (!existing) return NextResponse.json({ error: 'Debt record not found' }, { status: 404 })

  const body = await request.json()
  const { title, notes, categoryId, dueDate } = body

  const updated = await prisma.debtRecord.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(notes !== undefined && { notes: notes ? notes.trim() : null }),
      ...(categoryId !== undefined && { categoryId }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    },
    include: {
      person: true,
      category: true,
      debtTransactions: {
        include: { transaction: true },
      },
    },
  })

  // If title was updated, also update merchant on linked transactions
  if (title && updated.debtTransactions.length > 0) {
    const transactionIds = updated.debtTransactions.map((dt) => dt.transactionId)
    await prisma.transaction.updateMany({
      where: { id: { in: transactionIds }, userId: user.id },
      data: { merchant: title.trim() },
    })
  }

  return NextResponse.json({ success: true, data: updated })
}

// DELETE /api/debts/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await prisma.debtRecord.findFirst({ where: { id, userId: user.id } })
  if (!existing) return NextResponse.json({ error: 'Debt record not found' }, { status: 404 })

  await prisma.debtRecord.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
