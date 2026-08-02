import { NextResponse } from 'next/server'
import { getOrCreateAuthUser } from '@/lib/auth-user'
import { prisma } from '@/lib/prisma'

// PATCH /api/transactions/[id]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await prisma.transaction.findFirst({ where: { id, userId: user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { status, isPersonal, categoryId, notes, merchant, tags, personalLabelIds } = body

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(isPersonal !== undefined && { isPersonal }),
      ...(categoryId !== undefined && { categoryId }),
      ...(notes !== undefined && { notes }),
      ...(merchant !== undefined && { merchant }),
      ...(tags !== undefined && { tags }),
      ...(personalLabelIds !== undefined && {
        personalLabels: {
          set: personalLabelIds.map((id: string) => ({ id })),
        },
      }),
    },
    include: {
      personalLabels: true,
    }
  })

  return NextResponse.json({ success: true, data: updated })
}

// DELETE /api/transactions/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
    include: { debtTransactions: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Adjust any linked debt records
  for (const dt of existing.debtTransactions) {
    const debt = await prisma.debtRecord.findUnique({ where: { id: dt.debtRecordId } })
    if (debt) {
      const newTotal = Math.max(0, debt.totalAmount - dt.assignedAmount)
      const newOutstanding = Math.max(0, debt.outstandingAmount - dt.assignedAmount)
      if (newTotal === 0 && debt.recoveredAmount === 0) {
        await prisma.debtRecord.delete({ where: { id: dt.debtRecordId } }).catch(() => {})
      } else {
        await prisma.debtRecord.update({
          where: { id: dt.debtRecordId },
          data: {
            totalAmount: newTotal,
            outstandingAmount: newOutstanding,
            ...(newOutstanding === 0 && { status: 'SETTLED' }),
          },
        }).catch(() => {})
      }
    }
  }

  // Delete linked debtTransactions
  await prisma.debtTransaction.deleteMany({ where: { transactionId: id } })

  // Delete transaction
  await prisma.transaction.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

// GET /api/transactions/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const txn = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
    include: { category: true, account: true },
  })

  if (!txn) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: txn })
}
