import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.user.findUnique({ where: { authId: user.id } })
}

// POST /api/transactions/[id]/unassign
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
    include: { debtTransactions: true }
  })
  
  if (!transaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  if (transaction.debtTransactions.length === 0) {
    // Just update the status if it's already empty
    await prisma.transaction.update({
      where: { id },
      data: { status: 'UNASSIGNED', isRecoverable: false }
    })
    return NextResponse.json({ success: true })
  }

  // Iterate over all debt transactions linked to this transaction and decrement the debt record
  for (const dt of transaction.debtTransactions) {
    const debt = await prisma.debtRecord.findUnique({ where: { id: dt.debtRecordId } })
    if (debt) {
      await prisma.debtRecord.update({
        where: { id: dt.debtRecordId },
        data: {
          totalAmount: { decrement: dt.assignedAmount },
          outstandingAmount: { decrement: dt.assignedAmount },
        }
      })
    }
  }

  // Delete all DebtTransaction links
  await prisma.debtTransaction.deleteMany({
    where: { transactionId: id }
  })

  // Set transaction back to unassigned
  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      status: 'UNASSIGNED',
      isRecoverable: false
    }
  })

  return NextResponse.json({ success: true, data: updated })
}
