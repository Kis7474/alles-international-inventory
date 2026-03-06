import { mkdir, writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import { extname, join } from 'path'

export type UploadType = 'customs' | 'import-export'

const DATA_ROOT = process.env.DATA_ROOT || '/data'
const STORAGE_ROOT = process.env.FILE_STORAGE_ROOT || join(DATA_ROOT, 'uploads')
const PUBLIC_BASE_URL = process.env.FILE_PUBLIC_BASE_URL || '/uploads'

export const DOCUMENTS_STORAGE_ROOT = process.env.DOCUMENTS_STORAGE_ROOT || join(DATA_ROOT, 'documents')
export const BACKUP_ROOT = process.env.BACKUP_ROOT || join(DATA_ROOT, 'backups')

function sanitizeUploadType(type: string | null): UploadType {
  return type === 'customs' ? 'customs' : 'import-export'
}

function createStoredFileName(originalName: string): string {
  const normalizedExt = extname(originalName).toLowerCase() || '.pdf'
  return `${randomUUID()}${normalizedExt}`
}

export async function persistPdfFile(fileName: string, type: string | null, content: Uint8Array) {
  const uploadType = sanitizeUploadType(type)
  const storedName = createStoredFileName(fileName)
  const targetDir = join(STORAGE_ROOT, uploadType)

  await mkdir(targetDir, { recursive: true })

  const targetPath = join(targetDir, storedName)
  await writeFile(targetPath, content)

  return {
    uploadType,
    storedName,
    absolutePath: targetPath,
    publicPath: `${PUBLIC_BASE_URL}/${uploadType}/${storedName}`.replace(/\/+/g, '/'),
  }
}

export function isLikelyPdf(bytes: Uint8Array): boolean {
  return bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
}
