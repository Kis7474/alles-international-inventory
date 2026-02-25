'use client'

import { useEffect, useState } from 'react'

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

export default function MonthlyVendorStatementPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)

  const [vendorId, setVendorId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [type, setType] = useState<'ALL' | 'SALES' | 'PURCHASE'>('ALL')
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))

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
      const params = new URLSearchParams({ vendorId, startDate, endDate, type })
      if (categoryId) params.set('categoryId', categoryId)

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
      const res = await fetch('/api/documents/monthly-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: parseInt(vendorId),
          recipientName: selectedVendor?.name,
          startDate,
          endDate,
          categoryId: categoryId ? parseInt(categoryId) : undefined,
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

      <div className="bg-white p-4 rounded-lg shadow grid grid-cols-1 md:grid-cols-5 gap-4">
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
          <label className="block text-sm mb-1">카테고리</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full border rounded px-3 py-2">
            <option value="">전체</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.nameKo}</option>
            ))}
          </select>
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
          <label className="block text-sm mb-1">시작일</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">종료일</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded px-3 py-2" />
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
