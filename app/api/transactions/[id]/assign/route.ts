import { NextResponse } from 'next/server'
import { getOrCreateAuthUser } from '@/lib/auth-user'
import { prisma } from '@/lib/prisma'

// POST /api/transactions/[id]/assign
// Assigns a transaction to a person and creates/updates a debt record
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await request.json()
  const { personId, assignedAmount, debtRecordId, notes, title } = body

  if (!personId) return NextResponse.json({ error: 'personId is required' }, { status: 400 })

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
  })
  if (!transaction) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  const person = await prisma.person.findFirst({ where: { id: personId, userId: user.id } })
  if (!person) return NextResponse.json({ error: 'Person not found' }, { status: 404 })

  const amount = assignedAmount ? parseFloat(assignedAmount) : transaction.amount
  if (amount > transaction.amount) {
    return NextResponse.json({ error: 'Assigned amount cannot exceed transaction amount' }, { status: 400 })
  }

  // Use existing debt record or create new one
  let debtRecord
  if (debtRecordId) {
    debtRecord = await prisma.debtRecord.findFirst({
      where: { id: debtRecordId, userId: user.id, personId },
    })
    if (!debtRecord) return NextResponse.json({ error: 'Debt record not found' }, { status: 404 })

    // Update total
    await prisma.debtRecord.update({
      where: { id: debtRecordId },
      data: {
        totalAmount: { increment: amount },
        outstandingAmount: { increment: amount },
        status: 'PENDING',
      },
    })
  } else {
    // Create new debt record
    debtRecord = await prisma.debtRecord.create({
      data: {
        userId: user.id,
        personId,
        title: title || transaction.merchant || transaction.rawNarration || 'Expense',
        totalAmount: amount,
        recoveredAmount: 0,
        outstandingAmount: amount,
        status: 'PENDING',
        categoryId: transaction.categoryId,
        notes: notes || null,
      },
    })
  }

  // Link transaction to debt record
  await prisma.debtTransaction.upsert({
    where: {
      debtRecordId_transactionId: {
        debtRecordId: debtRecord.id,
        transactionId: id,
      },
    },
    create: {
      debtRecordId: debtRecord.id,
      transactionId: id,
      assignedAmount: amount,
      notes: notes || null,
    },
    update: { assignedAmount: amount, notes: notes || null },
  })

  // Update transaction status and merchant title
  const remainingAmount = transaction.amount - amount
  await prisma.transaction.update({
    where: { id },
    data: {
      status: remainingAmount <= 0 ? 'ASSIGNED' : 'PARTIAL',
      isRecoverable: true,
      ...(title ? { merchant: title.trim() } : {}),
    },
  })

  // Create notification
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'GENERAL',
      title: 'Transaction Assigned',
      message: `₹${amount.toLocaleString('en-IN')} assigned to ${person.name}`,
      isRead: false,
    },
  })

  return NextResponse.json({ success: true, data: debtRecord }, { status: 201 })
}
