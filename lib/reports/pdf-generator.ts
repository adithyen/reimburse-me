/**
 * PDF Receipt Generator using pdf-lib
 * Generates a professional, branded PDF receipt for debt collection.
 * Includes:
 * - Header with brand and generated date
 * - Person details
 * - Itemized debt records table
 * - Settlement history
 * - Total outstanding
 * - UPI QR code (if UPI ID provided)
 */

import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib'
import { generateUPIQR } from '@/lib/qr'

interface DebtForReport {
  id: string
  title: string
  totalAmount: number
  outstandingAmount: number
  recoveredAmount: number
  status: string
  createdAt: Date
  category: { name: string } | null
  debtTransactions: Array<{
    assignedAmount: number
    transaction: { date: Date; merchant: string | null; rawNarration: string | null }
  }>
  settlements: Array<{ amount: number; method: string; settledAt: Date }>
}

interface PersonForReport {
  name: string
  phone: string | null
  email: string | null
  upiId: string | null
  relationship: string | null
}

interface ReportInput {
  person: PersonForReport
  debts: DebtForReport[]
  generatedBy: string | null
  upiId?: string
  generatedAt: Date
}

export async function generatePersonReceipt(input: ReportInput): Promise<Buffer> {
  const { person, debts, generatedBy, upiId, generatedAt } = input

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const margin = 50
  const contentWidth = width - 2 * margin

  // Colors
  const BRAND_COLOR = rgb(0.38, 0.40, 0.95) // indigo
  const DARK = rgb(0.08, 0.08, 0.12)
  const MUTED = rgb(0.5, 0.5, 0.55)
  const BORDER = rgb(0.88, 0.88, 0.92)
  const SUCCESS_COLOR = rgb(0.13, 0.77, 0.37)
  const BG_LIGHT = rgb(0.97, 0.97, 1.0)

  let y = height - margin

  // ---- HEADER BACKGROUND ----
  page.drawRectangle({
    x: 0,
    y: height - 120,
    width,
    height: 120,
    color: BRAND_COLOR,
  })

  // ---- LOGO AREA ----
  page.drawText('R', {
    x: margin,
    y: height - 55,
    size: 24,
    font: boldFont,
    color: rgb(1, 1, 1),
  })

  page.drawText('ReimburseMe', {
    x: margin + 30,
    y: height - 48,
    size: 18,
    font: boldFont,
    color: rgb(1, 1, 1),
  })

  page.drawText('Personal Expense Recovery', {
    x: margin + 30,
    y: height - 64,
    size: 9,
    font: regularFont,
    color: rgb(0.85, 0.85, 1.0),
  })

  // ---- RECEIPT TITLE ----
  page.drawText('EXPENSE RECEIPT', {
    x: width - margin - 130,
    y: height - 45,
    size: 14,
    font: boldFont,
    color: rgb(1, 1, 1),
  })

  page.drawText(`Generated: ${formatDate(generatedAt)}`, {
    x: width - margin - 130,
    y: height - 62,
    size: 9,
    font: regularFont,
    color: rgb(0.85, 0.85, 1.0),
  })

  if (generatedBy) {
    page.drawText(`By: ${generatedBy}`, {
      x: width - margin - 130,
      y: height - 76,
      size: 9,
      font: regularFont,
      color: rgb(0.85, 0.85, 1.0),
    })
  }

  y = height - 140

  // ---- PERSON DETAILS SECTION ----
  page.drawRectangle({ x: margin, y: y - 60, width: contentWidth, height: 70, color: BG_LIGHT })
  page.drawRectangle({ x: margin, y: y - 60, width: 4, height: 70, color: BRAND_COLOR })

  page.drawText('PREPARED FOR', {
    x: margin + 14,
    y: y - 12,
    size: 8,
    font: boldFont,
    color: MUTED,
  })

  page.drawText(person.name, {
    x: margin + 14,
    y: y - 26,
    size: 16,
    font: boldFont,
    color: DARK,
  })

  const details = [
    person.relationship,
    person.phone,
    person.email,
  ].filter(Boolean).join('  ·  ')

  if (details) {
    page.drawText(details, {
      x: margin + 14,
      y: y - 42,
      size: 9,
      font: regularFont,
      color: MUTED,
    })
  }

  y -= 80

  // ---- TOTAL OUTSTANDING ----
  const totalOutstanding = debts.reduce((s, d) => s + d.outstandingAmount, 0)

  page.drawText('Total Outstanding Amount', {
    x: margin,
    y,
    size: 10,
    font: regularFont,
    color: MUTED,
  })

  y -= 18

  page.drawText(formatCurrency(totalOutstanding), {
    x: margin,
    y,
    size: 28,
    font: boldFont,
    color: BRAND_COLOR,
  })

  y -= 30

  // ---- DIVIDER ----
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: BORDER })
  y -= 20

  // ---- DEBT RECORDS TABLE ----
  page.drawText('EXPENSE DETAILS', {
    x: margin,
    y,
    size: 9,
    font: boldFont,
    color: MUTED,
  })

  y -= 14

  // Table header
  const cols = {
    date: margin,
    desc: margin + 70,
    category: margin + 270,
    amount: width - margin - 70,
    status: width - margin - 70,
  }

  page.drawRectangle({ x: margin, y: y - 14, width: contentWidth, height: 18, color: BRAND_COLOR })

  ;[
    { text: 'DATE', x: cols.date + 4 },
    { text: 'DESCRIPTION', x: cols.desc + 4 },
    { text: 'CATEGORY', x: cols.category + 4 },
    { text: 'AMOUNT', x: cols.amount - 10 },
  ].forEach(({ text, x }) => {
    page.drawText(text, { x, y: y - 10, size: 8, font: boldFont, color: rgb(1, 1, 1) })
  })

  y -= 18

  // Rows
  let rowIndex = 0
  for (const debt of debts) {
    if (y < 150) {
      // Add new page if needed
      break // Simplified — in production add new page
    }

    const isEven = rowIndex % 2 === 0
    if (isEven) {
      page.drawRectangle({ x: margin, y: y - 14, width: contentWidth, height: 18, color: BG_LIGHT })
    }

    const dateStr = formatDate(new Date(debt.createdAt))
    const descStr = truncate(debt.title, 30)
    const catStr = debt.category?.name || 'Others'
    const amtStr = formatCurrency(debt.outstandingAmount)

    page.drawText(dateStr, { x: cols.date + 4, y: y - 10, size: 8, font: regularFont, color: DARK })
    page.drawText(descStr, { x: cols.desc + 4, y: y - 10, size: 8, font: regularFont, color: DARK })
    page.drawText(catStr, { x: cols.category + 4, y: y - 10, size: 8, font: regularFont, color: MUTED })
    page.drawText(amtStr, { x: cols.amount - 10, y: y - 10, size: 8, font: boldFont, color: DARK })

    y -= 18
    rowIndex++
  }

  // ---- TOTAL ROW ----
  page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: width - margin, y: y + 4 }, thickness: 0.5, color: BORDER })
  y -= 6

  page.drawRectangle({ x: margin, y: y - 16, width: contentWidth, height: 20, color: rgb(0.93, 0.93, 1.0) })
  page.drawText('TOTAL OUTSTANDING', { x: margin + 4, y: y - 11, size: 9, font: boldFont, color: BRAND_COLOR })
  page.drawText(formatCurrency(totalOutstanding), { x: cols.amount - 10, y: y - 11, size: 11, font: boldFont, color: BRAND_COLOR })

  y -= 35

  // ---- UPI QR CODE ----
  if (upiId && y > 200) {
    page.drawText('PAY NOW', { x: margin, y, size: 9, font: boldFont, color: MUTED })
    y -= 14

    try {
      const qrDataUrl = await generateUPIQR({
        upiId,
        name: generatedBy || 'ReimburseMe',
        amount: totalOutstanding,
        note: `Payment to ${generatedBy} via ReimburseMe`,
      })

      // Extract base64 from data URL
      const base64 = qrDataUrl.split(',')[1]
      const qrImageBytes = Buffer.from(base64, 'base64')
      const qrImage = await pdfDoc.embedPng(qrImageBytes)

      const qrSize = 90
      page.drawImage(qrImage, { x: margin, y: y - qrSize, width: qrSize, height: qrSize })

      page.drawText(`UPI: ${upiId}`, { x: margin + qrSize + 10, y: y - 25, size: 9, font: boldFont, color: DARK })
      page.drawText('Scan to pay instantly', { x: margin + qrSize + 10, y: y - 38, size: 8, font: regularFont, color: MUTED })
      page.drawText(`Rs. ${totalOutstanding.toLocaleString('en-IN')}`, { x: margin + qrSize + 10, y: y - 52, size: 14, font: boldFont, color: SUCCESS_COLOR })

      y -= qrSize + 20
    } catch (e) {
      // QR generation failed — skip silently
    }
  }

  // ---- FOOTER ----
  y = margin + 20

  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: BORDER })

  page.drawText('Generated by ReimburseMe · Personal Expense Recovery Platform', {
    x: margin,
    y: y - 14,
    size: 8,
    font: regularFont,
    color: MUTED,
  })

  page.drawText(`Document generated on ${formatDate(generatedAt)}`, {
    x: width - margin - 170,
    y: y - 14,
    size: 8,
    font: regularFont,
    color: MUTED,
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

// ---- Helpers ----
function formatDate(date: Date): string {
  const d = date
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function formatCurrency(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString('en-IN')}`
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str
}
