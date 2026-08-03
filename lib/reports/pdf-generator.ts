/**
 * PDF Receipt Generator using pdf-lib
 * Generates a professional, branded PDF receipt for debt collection.
 * Features:
 * - Brand logo vector graphic with thick bold strokes & rounded card badge (matching website icon.svg / logo.tsx)
 * - Person details (Prepared For) with clean alignment
 * - Total outstanding summary with official Indian Rupee vector glyph
 * - Itemized expenses table with 4 columns: DATE | TRANSACTION DESCRIPTION | LABEL | AMOUNT
 * - Expenses sorted by transaction date ASCENDING (oldest date first)
 * - Display original transaction date (date when expense occurred, not assignment date)
 * - Category labeled as "Category: " under description
 * - Vector FontAwesome 6 Rupee symbol '₹' displayed with exact proportions for currency amounts
 * - Detailed timestamp (date and time) in header, footer, and filename
 * - Full multi-page support: automatically paginates 16+ transactions across multiple pages with repeated table headers
 * - Page numbers (Page X of Y) on all pages
 * - Accurate label resolution displaying merchant or custom label (e.g., 'Kerala S', 'Tata Play', 'Movie') instead of blank '-'
 * - Pure ASCII text sanitization to guarantee 100% WinAnsi font compatibility without crash
 * - UPI QR code payment card with automatic page-break detection
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
    transaction: {
      date: Date
      merchant: string | null
      rawNarration: string | null
      personalLabels?: Array<{ id: string; name: string }>
      category?: { name: string } | null
    }
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

// FontAwesome 6 Indian Rupee Sign vector path (viewBox 0 0 320 512)
const FA_RUPEE_SVG =
  'M0 64C0 46.3 14.3 32 32 32l256 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L179.2 96c6 13.7 9.8 28.5 11.4 44L288 140c17.7 0 32 14.3 32 32s-14.3 32-32 32l-97.4 0c-8.6 63.8-59.2 114-123.6 122.9l121.2 142.3c11.5 13.5 9.9 33.7-3.6 45.2s-33.7 9.9-45.2-3.6L6.8 338.8C.9 331.9 -1.4 322.6 .8 313.6s7.9-16.1 16.8-17.6c43.6-7.3 77.9-42.5 83.8-88L32 208c-17.7 0-32-14.3-32-32s14.3-32 32-32l70.4 0C100.8 128.5 96.6 113.8 88 96L32 96C14.3 96 0 81.7 0 64z'

export async function generatePersonReceipt(input: ReportInput): Promise<Buffer> {
  const { person, debts, generatedBy, upiId, generatedAt } = input

  // Sort debts by transaction date ASCENDING (oldest first)
  const sortedDebts = [...debts].sort((a, b) => {
    const dateA = new Date(a.debtTransactions?.[0]?.transaction?.date || a.createdAt).getTime()
    const dateB = new Date(b.debtTransactions?.[0]?.transaction?.date || b.createdAt).getTime()
    return dateA - dateB
  })

  const pdfDoc = await PDFDocument.create()
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const width = 595
  const height = 842 // A4
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

  // Table Columns layout
  const cols = {
    date: margin,                // 45
    desc: margin + 62,           // 107
    label: margin + 265,         // 310
    amount: width - margin - 80, // 470
  }

  function drawTableHeader(targetPage: any, currentY: number) {
    targetPage.drawRectangle({
      x: margin,
      y: currentY - 16,
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
      targetPage.drawText(cleanText(text), {
        x,
        y: currentY - 12,
        size: 8,
        font: boldFont,
        color: rgb(1, 1, 1),
      })
    })
  }

  function drawContinuationHeader(targetPage: any): number {
    targetPage.drawRectangle({
      x: 0,
      y: height - 42,
      width,
      height: 42,
      color: BRAND_PRIMARY,
    })

    targetPage.drawText(cleanText('ReimburseMe - Expense Receipt (Contd.)'), {
      x: margin,
      y: height - 26,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    })

    targetPage.drawText(cleanText(`Prepared for: ${person.name}`), {
      x: width - margin - 170,
      y: height - 26,
      size: 8.5,
      font: regularFont,
      color: rgb(0.85, 0.87, 1.0),
    })

    const headerY = height - 60
    drawTableHeader(targetPage, headerY)
    return headerY - 22
  }

  let currentPage = pdfDoc.addPage([width, height])
  let y = height - margin

  // ---- PAGE 1 HEADER BACKGROUND ----
  currentPage.drawRectangle({
    x: 0,
    y: height - 110,
    width,
    height: 110,
    color: BRAND_PRIMARY,
  })

  // ---- BRAND LOGO BADGE ----
  const logoX = margin
  const logoY = height - 76
  const logoSize = 42

  currentPage.drawRectangle({
    x: logoX,
    y: logoY,
    width: logoSize,
    height: logoSize,
    borderWidth: 0,
    color: rgb(1, 1, 1),
  })

  const s = logoSize / 512
  const ox = logoX
  const oy = logoY + logoSize

  currentPage.drawSvgPath('M 215 105 C 130 135 100 240 140 325 C 180 410 280 435 365 390', {
    x: ox,
    y: oy,
    scale: s,
    borderColor: CYAN_COLOR,
    borderWidth: 42 * s,
  })

  currentPage.drawSvgPath('M 365 390 C 420 350 445 265 410 195', {
    x: ox,
    y: oy,
    scale: s,
    borderColor: LIME_COLOR,
    borderWidth: 42 * s,
  })

  currentPage.drawSvgPath('M 370 230 L 420 180 L 440 240', {
    x: ox,
    y: oy,
    scale: s,
    borderColor: LIME_COLOR,
    borderWidth: 42 * s,
  })

  currentPage.drawSvgPath('M 190 120 H 320 C 331 120 340 129 340 140 V 290 L 300 330 H 190 C 179 330 170 321 170 310 V 140 C 170 129 179 120 190 120 Z', {
    x: ox,
    y: oy,
    scale: s,
    borderColor: CYAN_COLOR,
    borderWidth: 32 * s,
  })

  currentPage.drawSvgPath('M 300 290 V 330 H 340', {
    x: ox,
    y: oy,
    scale: s,
    borderColor: CYAN_COLOR,
    borderWidth: 32 * s,
  })

  currentPage.drawRectangle({ x: ox + 215 * s, y: oy - (155 + 14) * s, width: 45 * s, height: 14 * s, color: CYAN_COLOR })
  currentPage.drawRectangle({ x: ox + 215 * s, y: oy - (195 + 14) * s, width: 90 * s, height: 14 * s, color: DOC_LINE_COLOR })
  currentPage.drawRectangle({ x: ox + 215 * s, y: oy - (228 + 14) * s, width: 90 * s, height: 14 * s, color: DOC_LINE_COLOR })
  currentPage.drawRectangle({ x: ox + 215 * s, y: oy - (261 + 14) * s, width: 65 * s, height: 14 * s, color: DOC_LINE_COLOR })

  // ---- BRAND NAME & SUBTITLE ----
  currentPage.drawText(cleanText('ReimburseMe'), {
    x: margin + 50,
    y: height - 52,
    size: 18,
    font: boldFont,
    color: rgb(1, 1, 1),
  })

  currentPage.drawText(cleanText('Personal Expense Recovery Platform'), {
    x: margin + 50,
    y: height - 67,
    size: 9,
    font: regularFont,
    color: rgb(0.85, 0.87, 1.0),
  })

  // ---- RECEIPT TITLE & TIMESTAMP METADATA ----
  currentPage.drawText(cleanText('EXPENSE RECEIPT'), {
    x: width - margin - 155,
    y: height - 46,
    size: 13,
    font: boldFont,
    color: rgb(1, 1, 1),
  })

  const timestampHeaderStr = formatTimestamp(generatedAt)
  currentPage.drawText(cleanText(`Generated: ${timestampHeaderStr}`), {
    x: width - margin - 155,
    y: height - 62,
    size: 7.5,
    font: regularFont,
    color: rgb(0.85, 0.87, 1.0),
  })

  if (generatedBy) {
    currentPage.drawText(cleanText(`By: ${generatedBy}`), {
      x: width - margin - 155,
      y: height - 76,
      size: 7.5,
      font: regularFont,
      color: rgb(0.85, 0.87, 1.0),
    })
  }

  y = height - 130

  // ---- PREPARED FOR SECTION ----
  const preparedForHeight = 65
  currentPage.drawRectangle({
    x: margin,
    y: y - preparedForHeight,
    width: contentWidth,
    height: preparedForHeight,
    color: BG_LIGHT,
  })
  currentPage.drawRectangle({
    x: margin,
    y: y - preparedForHeight,
    width: 4,
    height: preparedForHeight,
    color: BRAND_PRIMARY,
  })

  currentPage.drawText(cleanText('PREPARED FOR'), {
    x: margin + 14,
    y: y - 18,
    size: 8,
    font: boldFont,
    color: MUTED,
  })

  currentPage.drawText(cleanText(person.name), {
    x: margin + 14,
    y: y - 36,
    size: 15,
    font: boldFont,
    color: DARK,
  })

  const contactParts = [person.relationship, person.phone, person.email].filter(Boolean)
  if (contactParts.length > 0) {
    currentPage.drawText(cleanText(contactParts.join('  -  ')), {
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

  currentPage.drawText(cleanText('TOTAL OUTSTANDING AMOUNT'), {
    x: margin,
    y,
    size: 9,
    font: boldFont,
    color: MUTED,
  })

  y -= 22

  const largeRupeeW = drawRupeeSymbol(currentPage, margin, y, 22, BRAND_PRIMARY)
  currentPage.drawText(cleanText(Math.round(totalOutstanding).toLocaleString('en-IN')), {
    x: margin + largeRupeeW + 5,
    y,
    size: 24,
    font: boldFont,
    color: BRAND_PRIMARY,
  })

  y -= 25

  // ---- DIVIDER ----
  currentPage.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: BORDER,
  })
  y -= 20

  // ---- DEBT RECORDS TABLE ----
  currentPage.drawText(cleanText('ITEMIZED EXPENSES'), {
    x: margin,
    y,
    size: 9,
    font: boldFont,
    color: MUTED,
  })

  y -= 16
  drawTableHeader(currentPage, y)
  y -= 22

  // Table Rows (Sorted by transaction date ascending - oldest first)
  let rowIndex = 0
  for (const debt of sortedDebts) {
    const rawNarration = debt.debtTransactions?.[0]?.transaction?.rawNarration || ''
    const merchant = debt.debtTransactions?.[0]?.transaction?.merchant || ''
    const descriptionText = cleanText(rawNarration || debt.title || 'Transaction')

    // Display original transaction date (date when expense actually occurred)
    const txnDate = debt.debtTransactions?.[0]?.transaction?.date || debt.createdAt

    // Resolve human-readable Label (e.g. 'Kerala S', 'Tata Play', 'Movie')
    const resolvedLabel = resolveDebtLabel(debt)
    const labelText = cleanText(resolvedLabel)
    const catName = debt.category?.name ? cleanText(debt.category.name) : null

    // Wrap lines
    const descLines = wrapText(descriptionText, 34)
    const labelLines = wrapText(labelText, 16)

    const descHeight = descLines.length * 11 + (catName ? 12 : 0)
    const labelHeight = labelLines.length * 11
    const rowHeight = Math.max(26, Math.max(descHeight, labelHeight) + 10)

    // Check if new page is needed!
    if (y - rowHeight < 65) {
      currentPage = pdfDoc.addPage([width, height])
      y = drawContinuationHeader(currentPage)
    }

    // Row zebra striping
    if (rowIndex % 2 === 0) {
      currentPage.drawRectangle({
        x: margin,
        y: y - rowHeight + 4,
        width: contentWidth,
        height: rowHeight,
        color: BG_LIGHT,
      })
    }

    const dateStr = formatDate(new Date(txnDate))

    // Date
    currentPage.drawText(cleanText(dateStr), {
      x: cols.date + 6,
      y: y - 10,
      size: 8,
      font: regularFont,
      color: DARK,
    })

    // Vector Rupee + Amount
    const rW = drawRupeeSymbol(currentPage, cols.amount + 6, y - 10, 8, DARK)
    currentPage.drawText(cleanText(Math.round(debt.outstandingAmount).toLocaleString('en-IN')), {
      x: cols.amount + 6 + rW + 3,
      y: y - 10,
      size: 8.5,
      font: boldFont,
      color: DARK,
    })

    // Description Column (Bank Narration + Category underneath)
    let descY = y - 10
    for (const line of descLines) {
      currentPage.drawText(cleanText(line), {
        x: cols.desc + 6,
        y: descY,
        size: 8.5,
        font: boldFont,
        color: DARK,
      })
      descY -= 11
    }

    if (catName) {
      currentPage.drawText(cleanText(`Category: ${catName}`), {
        x: cols.desc + 6,
        y: descY - 1,
        size: 7.5,
        font: regularFont,
        color: MUTED,
      })
    }

    // Label Column (Custom title / Merchant or '-' if unassigned)
    let labelY = y - 10
    for (const line of labelLines) {
      currentPage.drawText(cleanText(line), {
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

  // ---- CHECK SPACE FOR TOTAL SUMMARY ROW ----
  if (y - 30 < 65) {
    currentPage = pdfDoc.addPage([width, height])
    y = drawContinuationHeader(currentPage)
  }

  // ---- TOTAL SUMMARY ROW ----
  currentPage.drawLine({
    start: { x: margin, y: y + 4 },
    end: { x: width - margin, y: y + 4 },
    thickness: 0.5,
    color: BORDER,
  })
  y -= 6

  currentPage.drawRectangle({
    x: margin,
    y: y - 18,
    width: contentWidth,
    height: 22,
    color: rgb(0.92, 0.93, 0.98),
  })
  currentPage.drawText(cleanText('TOTAL OUTSTANDING'), {
    x: margin + 6,
    y: y - 13,
    size: 9,
    font: boldFont,
    color: BRAND_PRIMARY,
  })

  const totRupeeW = drawRupeeSymbol(currentPage, cols.amount + 6, y - 13, 10, BRAND_PRIMARY)
  currentPage.drawText(cleanText(Math.round(totalOutstanding).toLocaleString('en-IN')), {
    x: cols.amount + 6 + totRupeeW + 4,
    y: y - 13,
    size: 11,
    font: boldFont,
    color: BRAND_PRIMARY,
  })

  y -= 35

  // ---- UPI QR CODE SECTION ----
  if (upiId) {
    if (y - 105 < 65) {
      currentPage = pdfDoc.addPage([width, height])
      y = drawContinuationHeader(currentPage)
    }

    currentPage.drawText(cleanText('PAYMENT QR CODE'), {
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
      currentPage.drawImage(qrImage, {
        x: margin,
        y: y - qrSize,
        width: qrSize,
        height: qrSize,
      })

      currentPage.drawText(cleanText(`UPI ID: ${upiId}`), {
        x: margin + qrSize + 14,
        y: y - 24,
        size: 9,
        font: boldFont,
        color: DARK,
      })
      currentPage.drawText(cleanText('Scan with Google Pay, PhonePe, Paytm or any UPI App'), {
        x: margin + qrSize + 14,
        y: y - 38,
        size: 8,
        font: regularFont,
        color: MUTED,
      })

      const qrRupeeW = drawRupeeSymbol(currentPage, margin + qrSize + 14, y - 54, 11, SUCCESS_COLOR)
      currentPage.drawText(cleanText(Math.round(totalOutstanding).toLocaleString('en-IN')), {
        x: margin + qrSize + 14 + qrRupeeW + 4,
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

  // ---- FOOTER & PAGE NUMBERS ON ALL PAGES ----
  const allPages = pdfDoc.getPages()
  allPages.forEach((p, idx) => {
    const footerY = margin + 15
    p.drawLine({
      start: { x: margin, y: footerY },
      end: { x: width - margin, y: footerY },
      thickness: 0.5,
      color: BORDER,
    })

    p.drawText(cleanText('Generated by ReimburseMe - Personal Expense Recovery Platform'), {
      x: margin,
      y: footerY - 14,
      size: 8,
      font: regularFont,
      color: MUTED,
    })

    p.drawText(cleanText(`Page ${idx + 1} of ${allPages.length}  -  ${formatTimestamp(generatedAt)}`), {
      x: width - margin - 180,
      y: footerY - 14,
      size: 8,
      font: regularFont,
      color: MUTED,
    })
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

// ---- Helpers ----

function resolveDebtLabel(debt: DebtForReport): string {
  const rawNarration = (debt.debtTransactions?.[0]?.transaction?.rawNarration || '').trim()
  const merchant = (debt.debtTransactions?.[0]?.transaction?.merchant || '').trim()
  const title = (debt.title || '').trim()

  // 1. If user set custom title not equal to raw narration and not generic placeholder
  if (title && title !== rawNarration && title.toLowerCase() !== 'expense' && title.toLowerCase() !== 'transaction') {
    return title
  }
  // 2. If merchant is extracted and not equal to raw narration
  if (merchant && merchant !== rawNarration) {
    return merchant
  }
  // 3. If transaction has personal labels
  const pLabels = debt.debtTransactions?.[0]?.transaction?.personalLabels
  if (pLabels && pLabels.length > 0) {
    return pLabels.map(l => l.name).join(', ')
  }
  // 4. Fallback to title if not identical to raw narration
  if (title && title !== rawNarration) {
    return title
  }
  return '-'
}

function drawRupeeSymbol(page: any, x: number, y: number, size: number, color: any): number {
  const scale = size / 480
  page.drawSvgPath(FA_RUPEE_SVG, {
    x,
    y: y + size * 0.92,
    scale,
    color,
  })
  return 320 * scale
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
