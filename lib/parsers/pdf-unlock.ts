/**
 * PDF Unlock Utility
 * Uses pdf-lib to remove password protection from PDF files.
 * The password is never stored — it's used once to decrypt and immediately discarded.
 */

import { PDFDocument } from 'pdf-lib'

export async function unlockPdf(encryptedBuffer: Buffer, password: string): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(encryptedBuffer, {
      password,
      ignoreEncryption: false,
    } as any)

    // Save the document without encryption
    const unlockedBytes = await pdfDoc.save({
      useObjectStreams: false,
    })

    return Buffer.from(unlockedBytes)
  } catch (e) {
    const msg = String(e).toLowerCase()
    if (msg.includes('password') || msg.includes('invalid') || msg.includes('incorrect')) {
      throw new Error('WRONG_PASSWORD')
    }
    throw new Error(`Failed to unlock PDF: ${String(e)}`)
  }
}

export async function isPdfPasswordProtected(buffer: Buffer): Promise<boolean> {
  try {
    // Try to load without password — if it throws with encryption error, it's protected
    await PDFDocument.load(buffer, { ignoreEncryption: false })
    return false
  } catch (e) {
    const msg = String(e).toLowerCase()
    return msg.includes('password') || msg.includes('encrypt') || msg.includes('crypt')
  }
}
