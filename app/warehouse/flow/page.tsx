'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'
import Autocomplete from '@/components/ui/Autocomplete'

interface Product {
  id: number
  name: string
  code: string | null
}

interface TimelineItem {
  id: number
  date: string
  type: 'IN' | 'OUT'
  quantity: number
  lotCode: string | null
  storageLocation: string | null
  unitCost: number
  reference?: string
  outboundType?: string | null
  vendorName?: string | null
  salespersonName?: string | null
  salesRecordId?: number | null
  notes?: string | null
}

interface FlowResponse {
  product: {
    id: number
    name: string
    code: string | null
    unit: string
  }
  timeline: TimelineItem[]
  summary: {
    totalIn: number
    totalOut: number
    currentStock: number
  }
}

export default function WarehouseFlowPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [storageLocation, setStorageLocation] = useState<'ALL' | 'WAREHOUSE' | 'OFFICE'>('ALL')
  const [flowData, setFlowData] = useState<FlowResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products', { cache: 'no-store' })
      const data = await res.json()
      setProducts(data)
    } catch (error) {
      console.error('Error fetching products:', error)
      alert('품목 조회 중 오류가 발생했습니다.')
    }
  }

  const handleSearch = async () => {
    if (!selectedProductId) {
      alert('품목을 선택해주세요.')
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({ productId: selectedProductId })
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (storageLocation !== 'ALL') params.append('storageLocation', storageLocation)

      const res = await fetch(`/api/warehouse/flow?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '입출고 흐름 조회에 실패했습니다.')
      }

      const data: FlowResponse = await res.json()
      setFlowData(data)
    } catch (error) {
      console.error('Error fetching flow:', error)
      alert(error instanceof Error ? error.message : '입출고 흐름 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">입출고 흐름</h1>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Autocomplete
            label="품목 선택"
            options={products.map((p) => ({ id: p.id, label: p.name, sublabel: p.code || '' }))}
            value={selectedProductId}
            onChange={setSelectedProductId}
            placeholder="품목을 검색하세요..."
          />

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">시작일</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">종료일</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-gray-900" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">보관위치</label>
            <select
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value as 'ALL' | 'WAREHOUSE' | 'OFFICE')}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            >
              <option value="ALL">전체</option>
              <option value="WAREHOUSE">창고</option>
              <option value="OFFICE">사무실</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleSearch}
            disabled={loading || !selectedProductId}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '조회 중...' : '조회'}
          </button>
        </div>
      </div>

      {flowData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow"><div className="text-sm text-gray-600">총 입고</div><div className="text-xl font-bold text-blue-600">{formatNumber(flowData.summary.totalIn, 2)} {flowData.product.unit}</div></div>
          <div className="bg-white p-4 rounded-lg shadow"><div className="text-sm text-gray-600">총 출고</div><div className="text-xl font-bold text-red-600">{formatNumber(flowData.summary.totalOut, 2)} {flowData.product.unit}</div></div>
          <div className="bg-white p-4 rounded-lg shadow"><div className="text-sm text-gray-600">현재 재고</div><div className="text-xl font-bold text-green-600">{formatNumber(flowData.summary.currentStock, 2)} {flowData.product.unit}</div></div>
        </div>
      )}

      {flowData && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📦 품목: {flowData.product.name} {flowData.product.code ? `(${flowData.product.code})` : ''}
          </h2>

          {flowData.timeline.length === 0 ? (
            <div className="text-center text-gray-500 py-8">해당 조건의 입출고 내역이 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {flowData.timeline.map((item) => (
                <div key={`${item.type}-${item.id}`} className={`p-4 rounded-lg border-l-4 ${item.type === 'IN' ? 'bg-blue-50 border-blue-500' : 'bg-red-50 border-red-500'}`}>
                  <div className="font-bold text-gray-900 mb-1">{formatDate(item.date)} - {item.type === 'IN' ? '입고' : '출고'}</div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>수량: {formatNumber(item.quantity, 2)} {flowData.product.unit}</div>
                    <div>LOT: {item.lotCode || '-'}</div>
                    {item.storageLocation && <div>보관위치: {item.storageLocation === 'WAREHOUSE' ? '창고' : '사무실'}</div>}
                    {item.type === 'IN' && item.reference && <div>참조: {item.reference}</div>}
                    {item.type === 'OUT' && item.outboundType && <div>출고유형: {item.outboundType === 'SALES' ? '판매출고' : '기타출고'}</div>}
                    {item.type === 'OUT' && item.vendorName && <div>거래처: {item.vendorName}</div>}
                    {item.type === 'OUT' && item.salespersonName && <div>담당자: {item.salespersonName}</div>}
                    {item.type === 'OUT' && item.salesRecordId && <div>연동 매출: #{item.salesRecordId}</div>}
                    {item.notes && <div>비고: {item.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!flowData && !loading && (
        <div className="bg-white p-12 rounded-lg shadow text-center text-gray-500">
          품목을 선택하고 조회 버튼을 클릭하세요.
        </div>
      )}
    </div>
  )
}
