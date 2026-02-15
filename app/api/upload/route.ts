import { NextRequest, NextResponse } from 'next/server'
import { isLikelyPdf, persistPdfFile } from '@/lib/file-storage'
import { requireRole } from '@/lib/auth'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['application/pdf']

export async function POST(request: NextRequest) {
  const { error } = await requireRole(request, ['ADMIN', 'STAFF'])
  if (error) return error

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null // 'customs' or 'import-export'

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!isLikelyPdf(bytes)) {
      return NextResponse.json({ error: 'Invalid PDF file signature' }, { status: 400 })
    }

    const uploadResult = await persistPdfFile(file.name, type, bytes)

    return NextResponse.json({
      success: true,
      fileName: file.name,
      filePath: uploadResult.publicPath,
      uploadedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
