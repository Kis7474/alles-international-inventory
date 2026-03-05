'use client'

import { useEffect, useMemo, useState } from 'react'

interface Vendor {
  id: number
  name: string
}

interface Category {
  id: number
  nameKo: string
}

interface Row {
  id: number
  type: 'SALES' | 'PURCHASE'
  date: string
  productName: string
  specification: string | null
  quantity: number
  unitPrice: number
  amount: number
}

interface Summary {
  salesSubtotal: number
  purchaseSubtotal: number
  grandTotal: number
}

const RECIPIENT_REF_PRESETS = ['구매팀', '영업팀', '관리부', '정산 담당자']
const PAYMENT_TERMS_PRESETS = ['월합 정산', '정기 결제', '당월 마감 익월 결제']

function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split('-').map((v) => parseInt(v, 10))
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

export default function MonthlyVendorStatementPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)

  const [vendorId, setVendorId] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [searchText, setSearchText] = useState('')
  const [type, setType] = useState<'ALL' | 'SALES' | 'PURCHASE'>('ALL')

  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), [])
  const [targetMonth, setTargetMonth] = useState(currentMonth)

  const monthRange = useMemo(() => getMonthRange(targetMonth), [targetMonth])
  const [recipientRefPreset, setRecipientRefPreset] = useState('')
  const [recipientRef, setRecipientRef] = useState('')
  const [paymentTermsPreset, setPaymentTermsPreset] = useState('월합 정산')
  const [paymentTerms, setPaymentTerms] = useState('월합 정산')

  useEffect(() => {
    const init = async () => {
      const [vendorRes, categoryRes] = await Promise.all([
        fetch('/api/vendors'),
        fetch('/api/categories'),
      ])
      const [vendorData, categoryData] = await Promise.all([vendorRes.json(), categoryRes.json()])
      setVendors(vendorData)
      setCategories(categoryData)
    }
    init()
  }, [])

  const handleSearch = async () => {
    if (!vendorId) {
      alert('거래처를 선택해주세요.')
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({ vendorId, month: targetMonth, type })
      if (categoryIds.length > 0) params.set('categoryIds', categoryIds.join(','))
      if (searchText.trim()) params.set('searchText', searchText.trim())

      const res = await fetch(`/api/documents/monthly-vendor?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '조회 중 오류가 발생했습니다.')
        return
      }

      setRows(data.rows)
      setSummary(data.summary)
    } catch (error) {
      console.error('Error searching monthly statements:', error)
      alert('조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (docType: 'SALES' | 'PURCHASE') => {
    if (!vendorId) {
      alert('거래처를 선택해주세요.')
      return
    }

    try {
      const selectedVendor = vendors.find((v) => String(v.id) === vendorId)
      const resolvedRef = recipientRef.trim() ? recipientRef.trim() : undefined
      const resolvedTerms = paymentTerms.trim() ? paymentTerms.trim() : undefined

      const res = await fetch('/api/documents/monthly-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: parseInt(vendorId, 10),
          recipientName: selectedVendor?.name,
          recipientRef: resolvedRef,
          paymentTerms: resolvedTerms,
          month: targetMonth,
          startDate: monthRange.startDate,
          endDate: monthRange.endDate,
          categoryIds: categoryIds.length > 0 ? categoryIds.map((id) => parseInt(id, 10)) : undefined,
          searchText: searchText.trim() || undefined,
          type: docType,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '생성 중 오류가 발생했습니다.')
        return
      }

      alert(`월합명세서가 생성되었습니다. 문서번호: ${data.statementNumber}`)
      window.open(`/documents/transaction-statement/${data.id}`, '_blank')
    } catch (error) {
      console.error('Error generating monthly statement:', error)
      alert('생성 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">거래처 월합명세서 자동 생성</h1>

      <div className="bg-white p-4 rounded-lg shadow grid grid-cols-1 md:grid-cols-7 gap-4">
        <div>
          <label className="block text-sm mb-1">거래처 *</label>
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className="w-full border rounded px-3 py-2">
            <option value="">선택</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">조회 월 *</label>
          <input
            type="month"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          <p className="text-xs text-gray-500 mt-1">선택 월로 월합 조회/생성됩니다.</p>
        </div>
        <div>
          <label className="block text-sm mb-1">카테고리(복수 선택)</label>
          <select
            multiple
            value={categoryIds}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, (option) => option.value)
              setCategoryIds(values)
            }}
            className="w-full border rounded px-3 py-2 h-[104px]"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.nameKo}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Ctrl/Cmd 키로 여러 카테고리를 동시에 선택할 수 있습니다.</p>
        </div>
        <div>
          <label className="block text-sm mb-1">텍스트 검색</label>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="품목명/규격 검색"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">구분</label>
          <select value={type} onChange={(e) => setType(e.target.value as 'ALL' | 'SALES' | 'PURCHASE')} className="w-full border rounded px-3 py-2">
            <option value="ALL">매입+매출</option>
            <option value="SALES">매출</option>
            <option value="PURCHASE">매입</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">자동 기간(시작)</label>
          <input type="date" value={monthRange.startDate} readOnly className="w-full border rounded px-3 py-2 bg-gray-50" />
        </div>
        <div>
          <label className="block text-sm mb-1">자동 기간(종료)</label>
          <input type="date" value={monthRange.endDate} readOnly className="w-full border rounded px-3 py-2 bg-gray-50" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">참조 선택</label>
          <select
            value={recipientRefPreset}
            onChange={(e) => {
              const value = e.target.value
              setRecipientRefPreset(value)
              if (value) setRecipientRef(value)
            }}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">직접 입력</option>
            {RECIPIENT_REF_PRESETS.map((preset) => (
              <option key={preset} value={preset}>{preset}</option>
            ))}
          </select>
          <input
            type="text"
            value={recipientRef}
            onChange={(e) => setRecipientRef(e.target.value)}
            placeholder="참조를 입력하거나 위에서 선택"
            className="w-full border rounded px-3 py-2 mt-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">지불조건 선택</label>
          <select
            value={paymentTermsPreset}
            onChange={(e) => {
              const value = e.target.value
              setPaymentTermsPreset(value)
              setPaymentTerms(value)
            }}
            className="w-full border rounded px-3 py-2"
          >
            {PAYMENT_TERMS_PRESETS.map((preset) => (
              <option key={preset} value={preset}>{preset}</option>
            ))}
            <option value="">직접 입력</option>
          </select>
          <input
            type="text"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            placeholder="지불조건을 입력하거나 위에서 선택"
            className="w-full border rounded px-3 py-2 mt-2"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleSearch} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" disabled={loading}>
          {loading ? '조회 중...' : '조회'}
        </button>
        <button onClick={() => handleGenerate('SALES')} className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">매출 월합명세서 생성</button>
        <button onClick={() => handleGenerate('PURCHASE')} className="px-4 py-2 rounded bg-emerald-700 text-white hover:bg-emerald-800">매입 월합명세서 생성</button>
      </div>

      {summary && (
        <div className="bg-white p-4 rounded-lg shadow grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 rounded bg-blue-50">매출 합계: <strong>{summary.salesSubtotal.toLocaleString()}원</strong></div>
          <div className="p-3 rounded bg-green-50">매입 합계: <strong>{summary.purchaseSubtotal.toLocaleString()}원</strong></div>
          <div className="p-3 rounded bg-gray-100">총합: <strong>{summary.grandTotal.toLocaleString()}원</strong></div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">구분</th>
              <th className="px-3 py-2 text-left">납품날짜</th>
              <th className="px-3 py-2 text-left">제품명</th>
              <th className="px-3 py-2 text-left">규격</th>
              <th className="px-3 py-2 text-right">수량</th>
              <th className="px-3 py-2 text-right">단가</th>
              <th className="px-3 py-2 text-right">금액</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">조회된 데이터가 없습니다.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{row.type === 'SALES' ? '매출' : '매입'}</td>
                  <td className="px-3 py-2">{row.date}</td>
                  <td className="px-3 py-2">{row.productName}</td>
                  <td className="px-3 py-2">{row.specification || '-'}</td>
                  <td className="px-3 py-2 text-right">{row.quantity.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{row.unitPrice.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-medium">{row.amount.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
