import { createHash } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { AutomationDocumentType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
]

function getDocumentRoot(): string {
  return process.env.DOCUMENTS_STORAGE_ROOT || '/data/documents'
}

function getFolderByType(type: AutomationDocumentType): string {
  switch (type) {
    case 'SALES_STATEMENT':
      return 'sales-statement'
    case 'PURCHASE_STATEMENT':
      return 'purchase-statement'
    case 'IMPORT_INVOICE':
      return 'import-invoice'
    case 'IMPORT_DECLARATION':
      return 'import-declaration'
  }
}

function parseDocumentType(raw: FormDataEntryValue | null): AutomationDocumentType | null {
  if (!raw || typeof raw !== 'string') return null
  const t = raw.trim().toUpperCase()
  if (t === 'SALES_STATEMENT' || t === 'PURCHASE_STATEMENT' || t === 'IMPORT_INVOICE' || t === 'IMPORT_DECLARATION') {
    return t
  }
  return null
}

export async function POST(request: NextRequest) {
  const { error, auth } = await requireRole(request, ['ADMIN', 'STAFF'])
  if (error || !auth) return error

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const documentType = parseDocumentType(formData.get('documentType'))

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }
    if (!documentType) {
      return NextResponse.json({ error: 'documentType is required' }, { status: 400 })
    }
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: 'only pdf/excel/text files are allowed' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'file is too large (max 20MB)' }, { status: 400 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const checksum = createHash('sha256').update(bytes).digest('hex')

    const now = new Date()
    const folder = join(
      getDocumentRoot(),
      getFolderByType(documentType),
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    )
    await mkdir(folder, { recursive: true })

    const safeName = `${now.getTime()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const storagePath = join(folder, safeName)
    await writeFile(storagePath, bytes)

    const doc = await prisma.automationDocument.create({
      data: {
        type: documentType,
        sourceFileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        storagePath,
        checksum,
        createdById: auth.user.id,
      },
    })

    return NextResponse.json({ success: true, documentId: doc.id, parseStatus: doc.parseStatus })
  } catch (e) {
    console.error('automation upload failed', e)
    return NextResponse.json({ error: 'failed to upload file' }, { status: 500 })
  }
}
