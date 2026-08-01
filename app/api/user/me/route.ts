import { NextResponse } from 'next/server'
import { getOrCreateAuthUser } from '@/lib/auth-user'

export async function GET() {
  const user = await getOrCreateAuthUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      settings: user.settings,
    },
  })
}
