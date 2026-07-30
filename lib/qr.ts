import QRCode from 'qrcode'

export interface UPIQRParams {
  upiId: string
  name: string
  amount?: number
  note?: string
  currency?: string
}

export async function generateUPIQR(params: UPIQRParams): Promise<string> {
  const { upiId, name, amount, note, currency = 'INR' } = params

  let upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&cu=${currency}`

  if (amount && amount > 0) {
    upiString += `&am=${amount.toFixed(2)}`
  }

  if (note) {
    upiString += `&tn=${encodeURIComponent(note)}`
  }

  const dataUrl = await QRCode.toDataURL(upiString, {
    width: 280,
    margin: 2,
    color: {
      dark: '#1e1b4b',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  })

  return dataUrl
}

export function buildUPIDeepLink(params: UPIQRParams): string {
  const { upiId, name, amount, note, currency = 'INR' } = params
  let link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&cu=${currency}`
  if (amount) link += `&am=${amount.toFixed(2)}`
  if (note) link += `&tn=${encodeURIComponent(note)}`
  return link
}

export function buildWhatsAppMessage(params: {
  personName: string
  totalOwed: number
  upiId: string
  upiName: string
  includeLink?: boolean
}): string {
  const { personName, totalOwed, upiId, upiName, includeLink = true } = params

  const amount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(totalOwed)

  let message = `Hi ${personName}! 😊\n\nHere's the summary of what you owe me.\n*Total Outstanding: ${amount}*\n\nI've attached the detailed receipt for your reference.`

  if (includeLink && upiId) {
    const upiLink = buildUPIDeepLink({ upiId, name: upiName, amount: totalOwed })
    message += `\n\n💳 Pay via UPI: ${upiId}\n${upiLink}`
  }

  message += '\n\nThank you! 🙏'
  return message
}
