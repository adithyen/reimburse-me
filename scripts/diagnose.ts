import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnose() {
  // Show ALL users
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          transactions: true,
          people: true,
          debtRecords: true,
          accounts: true,
        }
      }
    }
  })

  console.log('=== ALL USERS ===')
  for (const u of users) {
    console.log({
      id: u.id,
      authId: u.authId,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      transactions: u._count.transactions,
      people: u._count.people,
      debts: u._count.debtRecords,
      accounts: u._count.accounts,
    })
  }
  
  console.log('\n=== TOTAL COUNTS ===')
  const counts = await Promise.all([
    prisma.transaction.count(),
    prisma.person.count(),
    prisma.debtRecord.count(),
    prisma.account.count(),
  ])
  console.log({ transactions: counts[0], people: counts[1], debts: counts[2], accounts: counts[3] })
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
