import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})

async function test() {
  // The Google OAuth user ID from Supabase — try finding by different methods
  const email = 'adityenh@gmail.com'
  
  // 1. What's in the DB?
  const userByEmail = await prisma.user.findFirst({ 
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, authId: true, email: true, name: true }
  })
  console.log('User found by email:', userByEmail)
  
  // 2. Check if there are multiple users
  const allUsers = await prisma.user.findMany({
    select: { id: true, authId: true, email: true, name: true, createdAt: true }
  })
  console.log('\nAll users in DB:')
  allUsers.forEach(u => console.log(u))
  
  // 3. Test what happens if Google OAuth sent a NEW authId (UUID)
  // This simulates what happens at runtime when Google OAuth user logs in
  const testGoogleAuthId = 'GOOGLE-UUID-SIMULATION-123456'
  
  // Step 1: findUnique by authId (would fail — Google UUID doesn't match Email/Password UUID)
  const byAuthId = await prisma.user.findUnique({ where: { authId: testGoogleAuthId } })
  console.log('\nLookup by Google authId (expected null):', byAuthId?.id ?? 'null ✓')
  
  // Step 2: findFirst by email (should find the existing user)  
  const byEmailFallback = await prisma.user.findFirst({ 
    where: { email: { equals: email, mode: 'insensitive' } } 
  })
  console.log('Lookup by email fallback (expected to find user):', byEmailFallback?.id ?? 'null ✗')
  
  if (byEmailFallback) {
    console.log('\n✅ Email fallback works! User has', byEmailFallback.id)
    console.log('   But updating authId to Google UUID might cause issues on next login...')
    console.log('   Current authId:', byEmailFallback.authId)
  } else {
    console.log('\n❌ Email fallback FAILED — cannot find user by email!')
  }
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
