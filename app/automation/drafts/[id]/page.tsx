'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface DraftLine {
  id: number
  lineNo: number
  rawItemName: string
  quantity: number
  unitPrice: number
  amount: number
  matchScore: number
  matchedProduct: { id: number; name: string; unit: string } | null
}

interface DraftDetail {
  id: string
  status: string
  vendorName: string | null
  statementDate: string | null
  totalAmount: number | null
  document: { id: string; sourceFileName: string; parseStatus: string }
  lines: DraftLine[]
  approvedAt: string | null
}

export default function AutomationDraftDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [draft, setDraft] = useState<DraftDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/automation/drafts/${id}`)
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || '초안 조회 실패')
      setLoading(false)
      return
    }
    setDraft(data)
    setError('')
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function approveDraft() {
    if (!confirm('승인하면 전표/출고가 확정 반영됩니다. 진행할까요?')) return
    setApproving(true)
    const res = await fetch(`/api/automation/drafts/${id}/approve`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error || '승인 실패')
      setApproving(false)
      return
    }
    await load()
    setApproving(false)
  }

  if (loading) return <div className="p-6">로딩 중...</div>
  if (error || !draft) return <div className="p-6 text-red-600">{error || '초안을 찾을 수 없습니다.'}</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">자동화 Draft 상세</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 border rounded" onClick={() => router.back()}>뒤로</button>
          <button
            onClick={approveDraft}
            disabled={draft.status !== 'DRAFT' || approving}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:bg-gray-400"
          >
            {approving ? '승인 중...' : 'Approve & Post'}
          </button>
        </div>
      </div>

      <div className="rounded border bg-white p-4 space-y-1 text-sm">
        <p><b>Draft ID:</b> {draft.id}</p>
        <p><b>상태:</b> {draft.status}</p>
        <p><b>원본파일:</b> {draft.document.sourceFileName} ({draft.document.parseStatus})</p>
        <p><b>거래처:</b> {draft.vendorName || '-'}</p>
        <p><b>문서일자:</b> {draft.statementDate ? new Date(draft.statementDate).toLocaleDateString('ko-KR') : '-'}</p>
        <p><b>총금액:</b> {draft.totalAmount?.toLocaleString() || '-'}</p>
      </div>

      <div className="rounded border bg-white overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">문서 품목명</th>
              <th className="px-3 py-2 text-right">수량</th>
              <th className="px-3 py-2 text-right">단가</th>
              <th className="px-3 py-2 text-right">금액</th>
              <th className="px-3 py-2 text-left">매칭 결과</th>
              <th className="px-3 py-2 text-right">점수</th>
            </tr>
          </thead>
          <tbody>
            {draft.lines.map((line) => (
              <tr key={line.id} className="border-t">
                <td className="px-3 py-2">{line.lineNo}</td>
                <td className="px-3 py-2">{line.rawItemName}</td>
                <td className="px-3 py-2 text-right">{line.quantity}</td>
                <td className="px-3 py-2 text-right">{line.unitPrice.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{line.amount.toLocaleString()}</td>
                <td className="px-3 py-2">{line.matchedProduct ? `${line.matchedProduct.name} (${line.matchedProduct.unit})` : '미매칭'}</td>
                <td className="px-3 py-2 text-right">{line.matchScore.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
