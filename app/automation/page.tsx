'use client'

import { FormEvent, useState } from 'react'

const documentTypes = [
  { value: 'SALES_STATEMENT', label: '매출 거래명세서' },
  { value: 'PURCHASE_STATEMENT', label: '매입 명세서' },
  { value: 'IMPORT_INVOICE', label: '수입 인보이스' },
  { value: 'IMPORT_DECLARATION', label: '수입 신고서' },
]

export default function AutomationPage() {
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('SALES_STATEMENT')
  const [documentId, setDocumentId] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [draftId, setDraftId] = useState<string>('')

  async function upload(e: FormEvent) {
    e.preventDefault()
    if (!file) return

    const body = new FormData()
    body.append('file', file)
    body.append('documentType', documentType)

    const res = await fetch('/api/automation/documents/upload', { method: 'POST', body })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || '업로드 실패')
      return
    }

    setDocumentId(data.documentId)
    setStatus(data.parseStatus)
    setDraftId('')
  }

  async function refresh() {
    if (!documentId) return
    const res = await fetch(`/api/automation/documents/${documentId}`)
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || '조회 실패')
      return
    }

    setStatus(data.parseStatus)
    if (data.drafts?.length) {
      setDraftId(data.drafts[0].id)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">자동화 수신함 (업로드 기반 MVP)</h1>

      <form onSubmit={upload} className="rounded border bg-white p-4 flex items-center gap-3">
        <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="border rounded px-2 py-1">
          {documentTypes.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button className="px-4 py-2 rounded bg-blue-600 text-white" type="submit">문서 업로드</button>
      </form>

      {documentId && (
        <div className="rounded border bg-white p-4 space-y-2 text-sm">
          <p><b>Document:</b> {documentId}</p>
          <p><b>Parse Status:</b> {status}</p>
          <button onClick={refresh} className="px-3 py-1 border rounded">상태 새로고침</button>
          {draftId && (
            <p>
              생성된 Draft: <a className="text-blue-600 underline" href={`/automation/drafts/${draftId}`}>{draftId}</a>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
