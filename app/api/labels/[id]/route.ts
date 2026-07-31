import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.user.findUnique({ where: { authId: user.id } })
}

// PUT /api/labels/[id]
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { name, color, icon } = body

  if (!name || name.trim().length < 1) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // Ensure label exists and belongs to user
  const existing = await prisma.personalLabel.findUnique({
    where: { id }
  })
  
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 })
  }

  try {
    const updated = await prisma.personalLabel.update({
      where: { id },
      data: {
        name: name.trim(),
        color,
        icon,
      },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    // Catch unique constraint violations if they rename to an existing label
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A label with this name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update label' }, { status: 500 })
  }
}

// DELETE /api/labels/[id]
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Ensure label exists and belongs to user
  const existing = await prisma.personalLabel.findUnique({
    where: { id }
  })
  
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Label not found' }, { status: 404 })
  }

  await prisma.personalLabel.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}
