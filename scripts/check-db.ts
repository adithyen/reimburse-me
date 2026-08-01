import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDb() {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          transactions: true,
          people: true,
          debtRecords: true,
          accounts: true,
        },
      },
    },
  })

  console.log('=== USERS IN DATABASE ===')
  console.log(JSON.stringify(users, null, 2))

  const totalPeople = await prisma.person.count()
  const totalTxns = await prisma.transaction.count()
  const totalDebts = await prisma.debtRecord.count()
  const totalAccounts = await prisma.account.count()

  console.log('\n=== TOTAL DATABASE RECORDS ===')
  console.log({ totalPeople, totalTxns, totalDebts, totalAccounts })

  const allPeople = await prisma.person.findMany({ select: { id: true, name: true, userId: true } })
  console.log('\n=== ALL PEOPLE ===')
  console.log(JSON.stringify(allPeople, null, 2))
}

checkDb()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
