import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { StatementParserFactory, extractPdfText, parseExcelToText } from '@/lib/parsers/factory'

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.user.findUnique({ where: { authId: user.id } })
}

/**
 * POST /api/import/detect
 * Detects file type, bank, and whether password is required.
 * Does NOT parse transactions — just metadata.
 */
export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name

    const detection = await StatementParserFactory.detect(fileName, buffer)

    return NextResponse.json({ success: true, data: detection })
  } catch (e) {
    console.error('Import detect error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
