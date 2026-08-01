/**
 * PDF Receipt Generator using pdf-lib
 * Generates a professional, branded PDF receipt for debt collection.
 * Includes:
 * - Header with brand logo and generated date
 * - Person details (Prepared For) with clean alignment
 * - Total outstanding summary
 * - Itemized debt records table with multi-line description & bank narration support
 * - Settlements & UPI QR code (if UPI ID provided)
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
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

  const margin = 45
  const contentWidth = width - 2 * margin

  // Palette
  const BRAND_PRIMARY = rgb(0.38, 0.40, 0.95) // Indigo
  const DARK = rgb(0.08, 0.09, 0.12)
  const MUTED = rgb(0.45, 0.47, 0.55)
  const BORDER = rgb(0.88, 0.89, 0.93)
  const SUCCESS_COLOR = rgb(0.12, 0.72, 0.35)
  const BG_LIGHT = rgb(0.97, 0.97, 0.99)

  let y = height - margin

  // ---- HEADER BACKGROUND ----
  page.drawRectangle({
    x: 0,
    y: height - 110,
    width,
    height: 110,
    color: BRAND_PRIMARY,
  })

  // ---- BRAND LOGO BADGE ----
  page.drawRoundedRectangle({
    x: margin,
    y: height - 72,
    width: 38,
    height: 38,
    borderWidth: 0,
    color: rgb(1, 1, 1),
  })

  page.drawText('RM', {
    x: margin + 8,
    y: height - 60,
    size: 16,
    font: boldFont,
    color: BRAND_PRIMARY,
  })

  page.drawText('ReimburseMe', {
    x: margin + 48,
    y: height - 52,
    size: 18,
    font: boldFont,
    color: rgb(1, 1, 1),
  })

  page.drawText('Personal Expense Recovery', {
    x: margin + 48,
    y: height - 67,
    size: 9,
    font: regularFont,
    color: rgb(0.85, 0.87, 1.0),
  })

  // ---- RECEIPT TITLE & METADATA ----
  page.drawText('EXPENSE RECEIPT', {
    x: width - margin - 140,
    y: height - 48,
    size: 14,
    font: boldFont,
    color: rgb(1, 1, 1),
  })

  page.drawText(`Generated: ${formatDate(generatedAt)}`, {
    x: width - margin - 140,
    y: height - 64,
    size: 8.5,
    font: regularFont,
    color: rgb(0.85, 0.87, 1.0),
  })

  if (generatedBy) {
    page.drawText(`By: ${generatedBy}`, {
      x: width - margin - 140,
      y: height - 78,
      size: 8.5,
      font: regularFont,
      color: rgb(0.85, 0.87, 1.0),
    })
  }

  y = height - 130

  // ---- PREPARED FOR SECTION (Clean Alignment) ----
  const preparedForHeight = 65
  page.drawRectangle({
    x: margin,
    y: y - preparedForHeight,
    width: contentWidth,
    height: preparedForHeight,
    color: BG_LIGHT,
  })
  page.drawRectangle({
    x: margin,
    y: y - preparedForHeight,
    width: 4,
    height: preparedForHeight,
    color: BRAND_PRIMARY,
  })

  page.drawText('PREPARED FOR', {
    x: margin + 14,
    y: y - 18,
    size: 8,
    font: boldFont,
    color: MUTED,
  })

  page.drawText(person.name, {
    x: margin + 14,
    y: y - 36,
    size: 15,
    font: boldFont,
    color: DARK,
  })

  const contactParts = [person.relationship, person.phone, person.email].filter(Boolean)
  if (contactParts.length > 0) {
    page.drawText(contactParts.join('  ·  '), {
      x: margin + 14,
      y: y - 52,
      size: 9,
      font: regularFont,
      color: MUTED,
    })
  }

  y -= preparedForHeight + 25

  // ---- TOTAL OUTSTANDING SECTION (Clean Alignment) ----
  const totalOutstanding = debts.reduce((s, d) => s + d.outstandingAmount, 0)

  page.drawText('TOTAL OUTSTANDING AMOUNT', {
    x: margin,
    y: y,
    size: 9,
    font: boldFont,
    color: MUTED,
  })

  y -= 22

  page.drawText(formatCurrency(totalOutstanding), {
    x: margin,
    y: y,
    size: 26,
    font: boldFont,
    color: BRAND_PRIMARY,
  })

  y -= 25

  // ---- DIVIDER ----
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: BORDER,
  })
  y -= 20

  // ---- DEBT RECORDS TABLE ----
  page.drawText('ITEMIZED EXPENSES', {
    x: margin,
    y,
    size: 9,
    font: boldFont,
    color: MUTED,
  })

  y -= 16

  // Table Columns
  const cols = {
    date: margin,
    desc: margin + 75,
    category: margin + 355,
    amount: width - margin - 75,
  }
  const descWidth = cols.category - cols.desc - 10 // ~270pt for description column

  // Table Header Bar
  page.drawRectangle({
    x: margin,
    y: y - 16,
    width: contentWidth,
    height: 20,
    color: BRAND_PRIMARY,
  })

  ;[
    { text: 'DATE', x: cols.date + 6 },
    { text: 'DESCRIPTION & NARRATION', x: cols.desc + 6 },
    { text: 'CATEGORY', x: cols.category + 6 },
    { text: 'AMOUNT', x: cols.amount + 10 },
  ].forEach(({ text, x }) => {
    page.drawText(text, {
      x,
      y: y - 12,
      size: 8,
      font: boldFont,
      color: rgb(1, 1, 1),
    })
  })

  y -= 22

  // Table Rows (with multi-line text wrapping)
  let rowIndex = 0
  for (const debt of debts) {
    if (y < 120) break

    // Linked bank narration if available and distinct from title
    const rawNarration = debt.debtTransactions?.[0]?.transaction?.rawNarration
    const displayNarration = rawNarration && rawNarration !== debt.title ? rawNarration : null

    // Wrap label lines and narration lines
    const titleLines = wrapText(debt.title, 42)
    const narrationLines = displayNarration ? wrapText(displayNarration, 54) : []

    const labelHeight = titleLines.length * 11
    const narrationHeight = narrationLines.length * 9
    const rowHeight = Math.max(24, labelHeight + (displayNarration ? narrationHeight + 4 : 0) + 10)

    // Row zebra striping
    if (rowIndex % 2 === 0) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight + 4,
        width: contentWidth,
        height: rowHeight,
        color: BG_LIGHT,
      })
    }

    const dateStr = formatDate(new Date(debt.createdAt))
    const catStr = debt.category?.name || 'General'
    const amtStr = formatCurrency(debt.outstandingAmount)

    // Date
    page.drawText(dateStr, {
      x: cols.date + 6,
      y: y - 10,
      size: 8,
      font: regularFont,
      color: DARK,
    })

    // Category
    page.drawText(catStr, {
      x: cols.category + 6,
      y: y - 10,
      size: 8,
      font: regularFont,
      color: MUTED,
    })

    // Amount
    page.drawText(amtStr, {
      x: cols.amount + 10,
      y: y - 10,
      size: 8.5,
      font: boldFont,
      color: DARK,
    })

    // Description & Narration (Multi-line)
    let descY = y - 10
    for (const line of titleLines) {
      page.drawText(line, {
        x: cols.desc + 6,
        y: descY,
        size: 8.5,
        font: boldFont,
        color: DARK,
      })
      descY -= 11
    }

    if (displayNarration) {
      descY -= 2
      for (const line of narrationLines) {
        page.drawText(line, {
          x: cols.desc + 6,
          y: descY,
          size: 7.5,
          font: regularFont,
          color: MUTED,
        })
        descY -= 9
      }
    }

    y -= rowHeight
    rowIndex++
  }

  // ---- TOTAL SUMMARY ROW ----
  page.drawLine({
    start: { x: margin, y: y + 4 },
    end: { x: width - margin, y: y + 4 },
    thickness: 0.5,
    color: BORDER,
  })
  y -= 6

  page.drawRectangle({
    x: margin,
    y: y - 18,
    width: contentWidth,
    height: 22,
    color: rgb(0.92, 0.93, 0.98),
  })
  page.drawText('TOTAL OUTSTANDING', {
    x: margin + 6,
    y: y - 13,
    size: 9,
    font: boldFont,
    color: BRAND_PRIMARY,
  })
  page.drawText(formatCurrency(totalOutstanding), {
    x: cols.amount + 10,
    y: y - 13,
    size: 11,
    font: boldFont,
    color: BRAND_PRIMARY,
  })

  y -= 40

  // ---- UPI QR CODE SECTION ----
  if (upiId && y > 140) {
    page.drawText('PAYMENT QR CODE', {
      x: margin,
      y,
      size: 9,
      font: boldFont,
      color: MUTED,
    })
    y -= 14

    try {
      const qrDataUrl = await generateUPIQR({
        upiId,
        name: generatedBy || 'ReimburseMe',
        amount: totalOutstanding,
        note: `Payment to ${generatedBy} via ReimburseMe`,
      })

      const base64 = qrDataUrl.split(',')[1]
      const qrImageBytes = Buffer.from(base64, 'base64')
      const qrImage = await pdfDoc.embedPng(qrImageBytes)

      const qrSize = 85
      page.drawImage(qrImage, {
        x: margin,
        y: y - qrSize,
        width: qrSize,
        height: qrSize,
      })

      page.drawText(`UPI ID: ${upiId}`, {
        x: margin + qrSize + 14,
        y: y - 24,
        size: 9,
        font: boldFont,
        color: DARK,
      })
      page.drawText('Scan with Google Pay, PhonePe, Paytm or any UPI App', {
        x: margin + qrSize + 14,
        y: y - 38,
        size: 8,
        font: regularFont,
        color: MUTED,
      })
      page.drawText(`Rs. ${totalOutstanding.toLocaleString('en-IN')}`, {
        x: margin + qrSize + 14,
        y: y - 54,
        size: 14,
        font: boldFont,
        color: SUCCESS_COLOR,
      })

      y -= qrSize + 20
    } catch {
      // QR fallback silently
    }
  }

  // ---- FOOTER ----
  const footerY = margin + 15
  page.drawLine({
    start: { x: margin, y: footerY },
    end: { x: width - margin, y: footerY },
    thickness: 0.5,
    color: BORDER,
  })

  page.drawText('Generated by ReimburseMe · Personal Expense Recovery Platform', {
    x: margin,
    y: footerY - 14,
    size: 8,
    font: regularFont,
    color: MUTED,
  })

  page.drawText(`Document generated on ${formatDate(generatedAt)}`, {
    x: width - margin - 170,
    y: footerY - 14,
    size: 8,
    font: regularFont,
    color: MUTED,
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

// ---- Helpers ----
function formatDate(date: Date): string {
  const d = new Date(date)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function formatCurrency(amount: number): string {
  return `Rs. ${Math.round(amount).toLocaleString('en-IN')}`
}

function wrapText(str: string, maxCharsPerLine: number): string[] {
  if (!str) return []
  const words = str.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim()
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines.length > 0 ? lines : [str]
}
