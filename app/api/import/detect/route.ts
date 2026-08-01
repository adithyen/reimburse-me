import { NextResponse } from 'next/server'
import { getOrCreateAuthUser } from '@/lib/auth-user'
import { prisma } from '@/lib/prisma'
import { StatementParserFactory, extractPdfText, parseExcelToText } from '@/lib/parsers/factory'

/**
 * POST /api/import/detect
 * Detects file type, bank, and whether password is required.
 * Does NOT parse transactions — just metadata.
 */
export async function POST(request: Request) {
  const user = await getOrCreateAuthUser()
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
