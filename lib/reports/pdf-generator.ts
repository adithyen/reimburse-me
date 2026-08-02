/**
 * PDF Receipt Generator using pdf-lib
 * Generates a professional, branded PDF receipt for debt collection.
 * Features:
 * - Brand logo vector graphic with thick bold strokes & rounded card badge (matching website icon.svg / logo.tsx)
 * - Person details (Prepared For) with clean alignment
 * - Total outstanding summary
 * - Itemized expenses table with 4 columns: DATE | TRANSACTION DESCRIPTION | LABEL | AMOUNT
 * - Expenses sorted by transaction date ASCENDING (oldest date first)
 * - Display original transaction date (date when expense occurred, not assignment date)
 * - Category labeled as "Category: " under description
 * - Vector Rupee symbol '₹' displayed for currency amounts
 * - Detailed timestamp (date and time) in header and filename
 * - Em-dash / Hyphen '-' shown when label is not explicitly custom-set by user
 * - Pure ASCII text sanitization to guarantee 100% WinAnsi font compatibility without crash
 * - UPI QR code payment card
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

  // Sort debts by transaction date ASCENDING (oldest first)
  const sortedDebts = [...debts].sort((a, b) => {
    const dateA = new Date(a.debtTransactions?.[0]?.transaction?.date || a.createdAt).getTime()
    const dateB = new Date(b.debtTransactions?.[0]?.transaction?.date || b.createdAt).getTime()
    return dateA - dateB
  })

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const margin = 45
  const contentWidth = width - 2 * margin

  // Palette
  const BRAND_PRIMARY = rgb(0.38, 0.40, 0.95) // Indigo
  const CYAN_COLOR = rgb(0.0, 0.78, 0.86)      // #00C8DC brand cyan
  const LIME_COLOR = rgb(0.54, 0.88, 0.0)      // #8AE000 brand lime green
  const DOC_LINE_COLOR = rgb(0.34, 0.71, 0.78)  // #58B5C8 inner document line color
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

  // ---- BRAND LOGO BADGE (Matching icon.svg / logo.tsx with thick bold strokes) ----
  const logoX = margin
  const logoY = height - 76
  const logoSize = 42

  // White Rounded Card Background
  page.drawRectangle({
    x: logoX,
    y: logoY,
    width: logoSize,
    height: logoSize,
    borderWidth: 0,
    color: rgb(1, 1, 1),
  })

  // Vector Logo Elements (Scaled from 512x512 viewBox)
  const s = logoSize / 512
  const ox = logoX
  const oy = logoY + logoSize // invert Y for PDF coordinates

  // Cyan Refresh Arc (Thick bold stroke)
  page.drawSvgPath('M 215 105 C 130 135 100 240 140 325 C 180 410 280 435 365 390', {
    x: ox,
    y: oy,
    scale: s,
    borderColor: CYAN_COLOR,
    borderWidth: 42 * s,
  })

  // Lime Green Arc (Thick bold stroke)
  page.drawSvgPath('M 365 390 C 420 350 445 265 410 195', {
    x: ox,
    y: oy,
    scale: s,
    borderColor: LIME_COLOR,
    borderWidth: 42 * s,
  })

  // Arrow Head (Thick bold stroke)
  page.drawSvgPath('M 370 230 L 420 180 L 440 240', {
    x: ox,
    y: oy,
    scale: s,
    borderColor: LIME_COLOR,
    borderWidth: 42 * s,
  })

  // Document Container (Thick bold stroke)
  page.drawSvgPath('M 190 120 H 320 C 331 120 340 129 340 140 V 290 L 300 330 H 190 C 179 330 170 321 170 310 V 140 C 170 129 179 120 190 120 Z', {
    x: ox,
    y: oy,
    scale: s,
    borderColor: CYAN_COLOR,
    borderWidth: 32 * s,
  })

  // Folded Corner (Thick bold stroke)
  page.drawSvgPath('M 300 290 V 330 H 340', {
    x: ox,
    y: oy,
    scale: s,
    borderColor: CYAN_COLOR,
    borderWidth: 32 * s,
  })

  // Inner Document Header Bar & Lines
  page.drawRectangle({ x: ox + 215 * s, y: oy - (155 + 14) * s, width: 45 * s, height: 14 * s, color: CYAN_COLOR })
  page.drawRectangle({ x: ox + 215 * s, y: oy - (195 + 14) * s, width: 90 * s, height: 14 * s, color: DOC_LINE_COLOR })
  page.drawRectangle({ x: ox + 215 * s, y: oy - (228 + 14) * s, width: 90 * s, height: 14 * s, color: DOC_LINE_COLOR })
  page.drawRectangle({ x: ox + 215 * s, y: oy - (261 + 14) * s, width: 65 * s, height: 14 * s, color: DOC_LINE_COLOR })

  // ---- BRAND NAME & SUBTITLE ----
  page.drawText(cleanText('ReimburseMe'), {
    x: margin + 50,
    y: height - 52,
    size: 18,
    font: boldFont,
    color: rgb(1, 1, 1),
  })

  page.drawText(cleanText('Personal Expense Recovery Platform'), {
    x: margin + 50,
    y: height - 67,
    size: 9,
    font: regularFont,
    color: rgb(0.85, 0.87, 1.0),
  })

  // ---- RECEIPT TITLE & TIMESTAMP METADATA ----
  page.drawText(cleanText('EXPENSE RECEIPT'), {
    x: width - margin - 150,
    y: height - 46,
    size: 13,
    font: boldFont,
    color: rgb(1, 1, 1),
  })

  // Header timestamp with date and time AM/PM
  const timestampHeaderStr = formatTimestamp(generatedAt)
  page.drawText(cleanText(`Generated: ${timestampHeaderStr}`), {
    x: width - margin - 150,
    y: height - 62,
    size: 7.5,
    font: regularFont,
    color: rgb(0.85, 0.87, 1.0),
  })

  if (generatedBy) {
    page.drawText(cleanText(`By: ${generatedBy}`), {
      x: width - margin - 150,
      y: height - 76,
      size: 7.5,
      font: regularFont,
      color: rgb(0.85, 0.87, 1.0),
    })
  }

  y = height - 130

  // ---- PREPARED FOR SECTION ----
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

  page.drawText(cleanText('PREPARED FOR'), {
    x: margin + 14,
    y: y - 18,
    size: 8,
    font: boldFont,
    color: MUTED,
  })

  page.drawText(cleanText(person.name), {
    x: margin + 14,
    y: y - 36,
    size: 15,
    font: boldFont,
    color: DARK,
  })

  const contactParts = [person.relationship, person.phone, person.email].filter(Boolean)
  if (contactParts.length > 0) {
    page.drawText(cleanText(contactParts.join('  -  ')), {
      x: margin + 14,
      y: y - 52,
      size: 9,
      font: regularFont,
      color: MUTED,
    })
  }

  y -= preparedForHeight + 25

  // ---- TOTAL OUTSTANDING SECTION ----
  const totalOutstanding = sortedDebts.reduce((s, d) => s + d.outstandingAmount, 0)

  page.drawText(cleanText('TOTAL OUTSTANDING AMOUNT'), {
    x: margin,
    y: y,
    size: 9,
    font: boldFont,
    color: MUTED,
  })

  y -= 22

  // Vector Rupee Symbol + Amount
  drawRupeeSymbol(page, margin, y - 2, 16, BRAND_PRIMARY)
  page.drawText(cleanText(Math.round(totalOutstanding).toLocaleString('en-IN')), {
    x: margin + 16,
    y: y,
    size: 24,
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
  page.drawText(cleanText('ITEMIZED EXPENSES'), {
    x: margin,
    y,
    size: 9,
    font: boldFont,
    color: MUTED,
  })

  y -= 16

  // Table Columns
  const cols = {
    date: margin,           // 45
    desc: margin + 65,      // 110 (width ~205pt)
    label: margin + 315,    // 360 (width ~100pt)
    amount: width - margin - 75, // 475 (width ~75pt)
  }

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
    { text: 'TRANSACTION DESCRIPTION', x: cols.desc + 6 },
    { text: 'LABEL', x: cols.label + 6 },
    { text: 'AMOUNT', x: cols.amount + 6 },
  ].forEach(({ text, x }) => {
    page.drawText(cleanText(text), {
      x,
      y: y - 12,
      size: 8,
      font: boldFont,
      color: rgb(1, 1, 1),
    })
  })

  y -= 22

  // Table Rows (Sorted by transaction date ascending - oldest first)
  let rowIndex = 0
  for (const debt of sortedDebts) {
    if (y < 120) break

    const rawNarration = debt.debtTransactions?.[0]?.transaction?.rawNarration
    const merchant = debt.debtTransactions?.[0]?.transaction?.merchant
    const descriptionText = cleanText(rawNarration || debt.title || 'Transaction')

    // Display original transaction date (date when expense actually occurred)
    const txnDate = debt.debtTransactions?.[0]?.transaction?.date || debt.createdAt

    // Only display label if user explicitly set a custom label (not auto-copied bank narration)
    const hasCustomLabel = isUserCustomLabel(debt.title, rawNarration, merchant)
    const labelText = hasCustomLabel ? cleanText(debt.title) : '-'
    const catName = debt.category?.name ? cleanText(debt.category.name) : null

    // Wrap lines
    const descLines = wrapText(descriptionText, 38)
    const labelLines = wrapText(labelText, 18)

    const descHeight = descLines.length * 11 + (catName ? 12 : 0)
    const labelHeight = labelLines.length * 11
    const rowHeight = Math.max(26, Math.max(descHeight, labelHeight) + 10)

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

    const dateStr = formatDate(new Date(txnDate))

    // Date
    page.drawText(cleanText(dateStr), {
      x: cols.date + 6,
      y: y - 10,
      size: 8,
      font: regularFont,
      color: DARK,
    })

    // Vector Rupee + Amount
    drawRupeeSymbol(page, cols.amount + 6, y - 10, 7.5, DARK)
    page.drawText(cleanText(Math.round(debt.outstandingAmount).toLocaleString('en-IN')), {
      x: cols.amount + 15,
      y: y - 10,
      size: 8.5,
      font: boldFont,
      color: DARK,
    })

    // Description Column (Bank Narration + Category underneath)
    let descY = y - 10
    for (const line of descLines) {
      page.drawText(cleanText(line), {
        x: cols.desc + 6,
        y: descY,
        size: 8.5,
        font: boldFont,
        color: DARK,
      })
      descY -= 11
    }

    if (catName) {
      // Changed 'Cat: ' to 'Category: ' as requested
      page.drawText(cleanText(`Category: ${catName}`), {
        x: cols.desc + 6,
        y: descY - 1,
        size: 7.5,
        font: regularFont,
        color: MUTED,
      })
    }

    // Label Column (Turf or '-' if unassigned)
    let labelY = y - 10
    for (const line of labelLines) {
      page.drawText(cleanText(line), {
        x: cols.label + 6,
        y: labelY,
        size: 8.5,
        font: line === '-' ? regularFont : boldFont,
        color: line === '-' ? MUTED : BRAND_PRIMARY,
      })
      labelY -= 11
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
  page.drawText(cleanText('TOTAL OUTSTANDING'), {
    x: margin + 6,
    y: y - 13,
    size: 9,
    font: boldFont,
    color: BRAND_PRIMARY,
  })

  drawRupeeSymbol(page, cols.amount + 6, y - 13, 9, BRAND_PRIMARY)
  page.drawText(cleanText(Math.round(totalOutstanding).toLocaleString('en-IN')), {
    x: cols.amount + 17,
    y: y - 13,
    size: 11,
    font: boldFont,
    color: BRAND_PRIMARY,
  })

  y -= 40

  // ---- UPI QR CODE SECTION ----
  if (upiId && y > 140) {
    page.drawText(cleanText('PAYMENT QR CODE'), {
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
        name: cleanText(generatedBy || 'ReimburseMe'),
        amount: totalOutstanding,
        note: `Payment to ${cleanText(generatedBy || '')} via ReimburseMe`,
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

      page.drawText(cleanText(`UPI ID: ${upiId}`), {
        x: margin + qrSize + 14,
        y: y - 24,
        size: 9,
        font: boldFont,
        color: DARK,
      })
      page.drawText(cleanText('Scan with Google Pay, PhonePe, Paytm or any UPI App'), {
        x: margin + qrSize + 14,
        y: y - 38,
        size: 8,
        font: regularFont,
        color: MUTED,
      })

      drawRupeeSymbol(page, margin + qrSize + 14, y - 54, 11, SUCCESS_COLOR)
      page.drawText(cleanText(Math.round(totalOutstanding).toLocaleString('en-IN')), {
        x: margin + qrSize + 27,
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

  page.drawText(cleanText('Generated by ReimburseMe - Personal Expense Recovery Platform'), {
    x: margin,
    y: footerY - 14,
    size: 8,
    font: regularFont,
    color: MUTED,
  })

  page.drawText(cleanText(`Document generated on ${formatTimestamp(generatedAt)}`), {
    x: width - margin - 190,
    y: footerY - 14,
    size: 8,
    font: regularFont,
    color: MUTED,
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

// ---- Helpers ----
function isUserCustomLabel(title: string | null | undefined, rawNarration: string | null | undefined, merchant?: string | null): boolean {
  if (!title) return false
  const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
  if (!normTitle) return false

  const normNarration = (rawNarration || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim()
  const normMerchant = (merchant || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim()

  if (normTitle === normNarration || normTitle === normMerchant) return false
  if (normNarration.length > 4 && (normNarration.includes(normTitle) || normTitle.includes(normNarration))) return false
  if (normMerchant.length > 4 && (normMerchant.includes(normTitle) || normTitle.includes(normMerchant))) return false

  return true
}

function drawRupeeSymbol(page: any, x: number, y: number, size: number, color: any) {
  const scale = size / 10
  // Top bar
  page.drawLine({ start: { x, y: y + 8 * scale }, end: { x: x + 6.5 * scale, y: y + 8 * scale }, thickness: 1 * scale, color })
  // Middle bar
  page.drawLine({ start: { x, y: y + 5 * scale }, end: { x: x + 6 * scale, y: y + 5 * scale }, thickness: 1 * scale, color })
  // Vertical stem & curve
  page.drawLine({ start: { x: x + 1.2 * scale, y: y + 8 * scale }, end: { x: x + 1.2 * scale, y: y + 3 * scale }, thickness: 1 * scale, color })
  // Diagonal leg
  page.drawLine({ start: { x: x + 1.5 * scale, y: y + 3.5 * scale }, end: { x: x + 5.5 * scale, y: y }, thickness: 1 * scale, color })
}

function cleanText(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/[—–]/g, '-')
    .replace(/[··•]/g, ' - ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/₹/g, 'Rs. ')
    .replace(/[^\x20-\x7E]/g, '')
}

function formatDate(date: Date): string {
  const d = new Date(date)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function formatTimestamp(date: Date): string {
  const d = new Date(date)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const datePart = `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`
  const hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const seconds = d.getSeconds().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h12 = (hours % 12 || 12).toString().padStart(2, '0')
  return `${datePart}, ${h12}:${minutes}:${seconds} ${ampm}`
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
