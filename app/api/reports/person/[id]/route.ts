import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generatePersonReceipt } from '@/lib/reports/pdf-generator'

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.user.findUnique({
    where: { authId: user.id },
    include: { settings: true },
  })
}

// GET /api/reports/person/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const person = await prisma.person.findFirst({
    where: { id, userId: user.id },
    include: {
      debtRecords: {
        where: { status: { in: ['PENDING', 'PARTIAL'] } },
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          debtTransactions: {
            include: { transaction: true },
          },
          settlements: { orderBy: { settledAt: 'desc' } },
        },
      },
    },
  })

  if (!person) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const pdfBytes = await generatePersonReceipt({
      person,
      debts: person.debtRecords,
      generatedBy: user.name || user.email,
      upiId: user.upiId || undefined,
      generatedAt: new Date(),
    })

    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt_${person.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (e) {
    console.error('PDF generation error:', e)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
