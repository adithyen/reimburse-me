import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.user.findUnique({ where: { authId: user.id } })
}

// GET /api/accounts/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const account = await prisma.account.findFirst({
    where: { id, userId: user.id },
  })

  if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: account })
}

// PATCH /api/accounts/[id]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await request.json()
  const { name, bank, accountType, nickname, accountNumber, currentBalance, targetBalance, color, icon, isDefault, isActive } = body

  const existing = await prisma.account.findFirst({ where: { id, userId: user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (isDefault) {
    await prisma.account.updateMany({
      where: { userId: user.id, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    })
  }

  const updated = await prisma.account.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(bank !== undefined && { bank }),
      ...(accountType !== undefined && { accountType }),
      ...(nickname !== undefined && { nickname }),
      ...(accountNumber !== undefined && { accountNumber }),
      ...(currentBalance !== undefined && { currentBalance: parseFloat(currentBalance) }),
      ...(targetBalance !== undefined && { targetBalance: parseFloat(targetBalance) }),
      ...(color !== undefined && { color }),
      ...(icon !== undefined && { icon }),
      ...(isDefault !== undefined && { isDefault }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  return NextResponse.json({ success: true, data: updated })
}

// DELETE /api/accounts/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const existing = await prisma.account.findFirst({ where: { id, userId: user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Soft delete
  await prisma.account.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ success: true })
}
