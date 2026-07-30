import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.user.findUnique({ where: { authId: user.id } })
}

// POST /api/settlements — record a payment/settlement
export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { debtRecordId, amount, method, referenceId, notes, settledAt } = body

  if (!debtRecordId || !amount) {
    return NextResponse.json({ error: 'debtRecordId and amount are required' }, { status: 400 })
  }

  const debt = await prisma.debtRecord.findFirst({
    where: { id: debtRecordId, userId: user.id },
  })

  if (!debt) return NextResponse.json({ error: 'Debt record not found' }, { status: 404 })

  const settleAmount = Math.min(parseFloat(amount), debt.outstandingAmount)

  // Create settlement record
  const settlement = await prisma.settlement.create({
    data: {
      userId: user.id,
      debtRecordId,
      amount: settleAmount,
      method: method || 'CASH',
      referenceId: referenceId || null,
      notes: notes || null,
      settledAt: settledAt ? new Date(settledAt) : new Date(),
    },
  })

  // Update debt record
  const newRecovered = debt.recoveredAmount + settleAmount
  const newOutstanding = Math.max(0, debt.outstandingAmount - settleAmount)
  const newStatus = newOutstanding <= 0 ? 'SETTLED' : 'PARTIAL'

  await prisma.debtRecord.update({
    where: { id: debtRecordId },
    data: {
      recoveredAmount: newRecovered,
      outstandingAmount: newOutstanding,
      status: newStatus,
    },
  })

  // Create notification
  const person = await prisma.person.findUnique({
    where: { id: debt.personId },
    select: { name: true },
  })

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'SETTLEMENT_RECEIVED',
      title: 'Payment Recorded',
      message: `₹${settleAmount.toLocaleString('en-IN')} received from ${person?.name || 'Unknown'}`,
      isRead: false,
    },
  })

  return NextResponse.json({ success: true, data: settlement }, { status: 201 })
}

// GET /api/settlements
export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const debtRecordId = searchParams.get('debtRecordId')

  const settlements = await prisma.settlement.findMany({
    where: {
      userId: user.id,
      ...(debtRecordId && { debtRecordId }),
    },
    orderBy: { settledAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: settlements })
}
