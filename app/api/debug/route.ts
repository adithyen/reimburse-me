import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const supabaseCookies = allCookies.filter(c => c.name.includes('supabase') || c.name.includes('sb-'))
    
    let supabaseUser = null
    let supabaseError = null
    
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.auth.getUser()
      supabaseUser = data?.user ? {
        id: data.user.id,
        email: data.user.email,
        provider: data.user.app_metadata?.provider,
      } : null
      supabaseError = error?.message || null
    } catch (e: any) {
      supabaseError = e?.message || 'Failed to get user'
    }
    
    let dbUsers: any[] = []
    let dbUserCount = 0
    try {
      dbUserCount = await prisma.user.count()
      dbUsers = await prisma.user.findMany({
        select: { id: true, authId: true, email: true, name: true }
      })
    } catch (e: any) {
      dbUsers = [{ error: e?.message }]
    }
    
    return NextResponse.json({
      supabaseUser,
      supabaseError,
      dbUserCount,
      dbUsers,
      cookieCount: allCookies.length,
      supabaseCookieNames: supabaseCookies.map(c => c.name),
    })
  } catch (e: any) {
    return NextResponse.json({ 
      fatalError: e?.message || 'Unknown error',
      stack: e?.stack?.split('\n').slice(0, 5)
    }, { status: 500 })
  }
}
