import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const dbUser = await prisma.user.findUnique({ where: { authId: user.id } })
  return dbUser
}

// GET /api/accounts — list all accounts
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accounts = await prisma.account.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json({ success: true, data: accounts })
}

// POST /api/accounts — create account
export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, bank, accountType, nickname, accountNumber, currentBalance, targetBalance, color, icon, isDefault } = body

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  // If setting as default, unset other defaults
  if (isDefault) {
    await prisma.account.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    })
  }

  const account = await prisma.account.create({
    data: {
      userId: user.id,
      name,
      bank: bank || null,
      accountType: accountType || 'savings',
      nickname: nickname || null,
      accountNumber: accountNumber || null,
      currentBalance: parseFloat(currentBalance) || 0,
      targetBalance: parseFloat(targetBalance) || 0,
      openingBalance: parseFloat(currentBalance) || 0,
      color: color || '#6366f1',
      icon: icon || 'bank',
      isDefault: isDefault || false,
    },
  })

  return NextResponse.json({ success: true, data: account }, { status: 201 })
}
