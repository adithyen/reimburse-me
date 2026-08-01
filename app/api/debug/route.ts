import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // Count all users in DB for verification
  const userCount = await prisma.user.count()
  const allUsers = await prisma.user.findMany({
    select: { id: true, authId: true, email: true, name: true }
  })
  
  return NextResponse.json({
    supabaseUser: user ? {
      id: user.id,
      email: user.email,
      provider: user.app_metadata?.provider,
    } : null,
    supabaseError: error?.message || null,
    dbUserCount: userCount,
    dbUsers: allUsers,
  })
}
