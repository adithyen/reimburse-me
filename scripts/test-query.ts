import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testQuery() {
  const users = await prisma.user.findMany({
    include: {
      transactions: { select: { id: true, merchant: true, amount: true } },
      people: { select: { id: true, name: true } },
      debtRecords: { select: { id: true, title: true } },
    },
  })

  console.log('=== ALL USERS IN DB ===')
  for (const u of users) {
    console.log({
      id: u.id,
      authId: u.authId,
      email: u.email,
      name: u.name,
      txCount: u.transactions.length,
      peopleCount: u.people.length,
      peopleNames: u.people.map((p) => p.name),
      debtsCount: u.debtRecords.length,
    })
  }

  // Check if there are any orphaned transactions or people
  const unlinkedPeople = await prisma.person.findMany({
    where: { userId: { notIn: users.map((u) => u.id) } },
  })
  console.log('Unlinked people count:', unlinkedPeople.length)
}

testQuery()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
