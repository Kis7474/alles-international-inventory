'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'

interface Item {
  id: number
  code: string
  name: string
  unit: string
}

interface InventoryProduct {
  productId: number
  productName: string
  productCode: string | null
  unit: string
  purchaseVendor: string | null
  category: string | null
  totalQuantity: number
  avgUnitCost: number
  totalValue: number
  lotCount: number
}

interface OutboundDetail {
  lotId: number
  lotCode: string | null
  receivedDate: string
  quantity: number
  unitCost: number
  totalCost: number
  warehouseFee: number
  warehouseFeeApplied: number
  shippingCostPerUnit: number
  finalUnitCost: number
  finalTotalCost: number
}

interface OutboundHistory {
  id: number
  movementDate: string
  quantity: number
  unitCost: number
  totalCost: number
  item: {
    code: string
    name: string
  }
  lot: {
    lotCode: string | null
    receivedDate: string
  } | null
}

export default function OutboundPage() {
  const [items, setItems] = useState<Item[]>([])
  const [history, setHistory] = useState<OutboundHistory[]>([])
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([])
  const [selectedProductInfo, setSelectedProductInfo] = useState<InventoryProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [deletingMovementId, setDeletingMovementId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [selectedStorageLocation, setSelectedStorageLocation] = useState<'WAREHOUSE' | 'OFFICE'>('WAREHOUSE')
  
  // 필터 상태
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterItemId, setFilterItemId] = useState('')
  
  const [outboundResult, setOutboundResult] = useState<{
    totalQuantity: number
    totalCost: number
    totalWarehouseFee: number
    totalShippingCost: number
    totalFinalCost: number
    details: OutboundDetail[]
  } | null>(null)
  const [formData, setFormData] = useState({
    productId: '',
    itemId: '',
    quantity: '',
    outboundDate: new Date().toISOString().split('T')[0],
    shippingCost: '0', // 출고 운송비
  })

  useEffect(() => {
    fetchData()
    fetchInventoryProducts()
  }, [])

  useEffect(() => {
    fetchInventoryProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStorageLocation])

  const fetchData = async () => {
    try {
      const [itemsRes, historyRes] = await Promise.all([
        fetch('/api/items'),
        fetch('/api/outbound'),
      ])
      const [itemsData, historyData] = await Promise.all([
        itemsRes.json(),
        historyRes.json(),
      ])
      setItems(itemsData)
      setHistory(historyData)
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('데이터 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }
  
  const fetchInventoryProducts = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedStorageLocation) {
        params.append('storageLocation', selectedStorageLocation)
      }
      
      const res = await fetch(`/api/inventory?${params.toString()}`)
      const data: InventoryProduct[] = await res.json()
      // Filter to only products with inventory
      setInventoryProducts(data.filter((item) => item.totalQuantity > 0))
    } catch (error) {
      console.error('Error fetching inventory:', error)
    }
  }
  
  const handleProductSelect = (productId: string) => {
    const selected = inventoryProducts.find(p => p.productId === parseInt(productId))
    setFormData({ ...formData, productId, itemId: '' })
    setSelectedProductInfo(selected || null)
  }

  const handleFilter = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStartDate) params.append('startDate', filterStartDate)
      if (filterEndDate) params.append('endDate', filterEndDate)
      if (filterItemId) params.append('itemId', filterItemId)

      const res = await fetch(`/api/outbound?${params.toString()}`)
      const data = await res.json()
      setHistory(data)
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error filtering outbound:', error)
      alert('필터링 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      productId: formData.productId ? parseInt(formData.productId) : null,
      itemId: formData.itemId ? parseInt(formData.itemId) : null,
      quantity: parseFloat(formData.quantity),
      outboundDate: formData.outboundDate,
      shippingCost: parseFloat(formData.shippingCost) || 0,
    }

    try {
      const res = await fetch('/api/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        alert(result.error || '출고 처리 중 오류가 발생했습니다.')
        return
      }

      setOutboundResult(result)
      setShowResult(true)
      setShowForm(false)
      setFormData({
        productId: '',
        itemId: '',
        quantity: '',
        outboundDate: new Date().toISOString().split('T')[0],
        shippingCost: '0',
      })
      fetchData()
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error processing outbound:', error)
      alert('출고 처리 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (movementId: number) => {
    setDeletingMovementId(movementId)
  }

  const confirmDelete = async () => {
    if (!deletingMovementId) return

    try {
      const res = await fetch(`/api/outbound?id=${deletingMovementId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const result = await res.json()
        alert(result.error || '삭제 중 오류가 발생했습니다.')
        return
      }

      alert('출고 내역이 삭제되었습니다.')
      setDeletingMovementId(null)
      fetchData()
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error deleting outbound record:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
    } else {
      setSelectedIds(history.map(r => r.id))
    }
    setSelectAll(!selectAll)
  }

  const handleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.length}개 항목을 삭제하시겠습니까?`)) return
    
    try {
      const res = await fetch('/api/outbound', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '삭제 중 오류가 발생했습니다.')
        return
      }

      alert(`${selectedIds.length}개 항목이 삭제되었습니다.`)
      fetchData()
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error bulk deleting outbound records:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return <div>로딩 중...</div>
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-6 gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">출고 관리</h1>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-red-700 text-sm md:text-base min-h-[44px]"
            >
              선택 삭제 ({selectedIds.length}개)
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-blue-700 text-sm md:text-base min-h-[44px]"
          >
            + 출고 등록
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow mb-4 md:mb-6">
        <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4 text-gray-900">필터</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">시작일</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-3 md:py-2 border rounded-lg text-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">종료일</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-3 md:py-2 border rounded-lg text-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">품목</label>
            <select
              value={filterItemId}
              onChange={(e) => setFilterItemId(e.target.value)}
              className="w-full px-3 py-3 md:py-2 border rounded-lg text-gray-900"
            >
              <option value="">전체</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.code}] {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleFilter}
            className="bg-blue-600 text-white px-6 py-3 md:py-2 rounded-lg hover:bg-blue-700 min-h-[44px]"
          >
            필터 적용
          </button>
          <button
            onClick={() => {
              setFilterStartDate('')
              setFilterEndDate('')
              setFilterItemId('')
              fetchData()
            }}
            className="bg-gray-300 text-gray-700 px-6 py-3 md:py-2 rounded-lg hover:bg-gray-400 min-h-[44px]"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 출고 등록 폼 */}
      {showForm && (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">출고 등록</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 보관 위치 선택 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium mb-2 text-gray-700">출고 위치</label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="WAREHOUSE"
                    checked={selectedStorageLocation === 'WAREHOUSE'}
                    onChange={() => {
                      setSelectedStorageLocation('WAREHOUSE')
                      setFormData({ ...formData, productId: '', quantity: '' })
                      setSelectedProductInfo(null)
                    }}
                    className="mr-2"
                  />
                  <span className="text-gray-700">🏭 창고</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="OFFICE"
                    checked={selectedStorageLocation === 'OFFICE'}
                    onChange={() => {
                      setSelectedStorageLocation('OFFICE')
                      setFormData({ ...formData, productId: '', quantity: '' })
                      setSelectedProductInfo(null)
                    }}
                    className="mr-2"
                  />
                  <span className="text-gray-700">🏢 사무실</span>
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  품목 * <span className="text-xs text-blue-600">
                    ({selectedStorageLocation === 'WAREHOUSE' ? '창고' : '사무실'} 재고만 표시)
                  </span>
                </label>
                <select
                  required
                  value={formData.productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full px-3 py-3 md:py-2 border rounded-lg"
                >
                  <option value="">품목을 선택하세요</option>
                  {inventoryProducts.map((item) => (
                    <option key={item.productId} value={item.productId}>
                      {item.productName} (재고: {item.totalQuantity} {item.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  출고 수량 *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  className="w-full px-3 py-3 md:py-2 border rounded-lg"
                />
                {selectedProductInfo && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                    <div className="text-blue-800">
                      현재 재고: <span className="font-bold">{selectedProductInfo.totalQuantity}</span> {selectedProductInfo.unit}
                    </div>
                    <div className="text-blue-600 text-xs mt-1">
                      {selectedProductInfo.lotCount}개 LOT (FIFO 순서로 출고됩니다)
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  출고일 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.outboundDate}
                  onChange={(e) =>
                    setFormData({ ...formData, outboundDate: e.target.value })
                  }
                  className="w-full px-3 py-3 md:py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  출고 운송비 (₩)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.shippingCost}
                  onChange={(e) =>
                    setFormData({ ...formData, shippingCost: e.target.value })
                  }
                  className="w-full px-3 py-3 md:py-2 border rounded-lg"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">선택사항</p>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-yellow-800">
                💡 FIFO(선입선출) 방식으로 가장 오래된 LOT부터 자동으로 출고됩니다.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-3 md:py-2 rounded-lg hover:bg-blue-700 min-h-[44px]"
              >
                출고 처리
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-300 text-gray-700 px-6 py-3 md:py-2 rounded-lg hover:bg-gray-400 min-h-[44px]"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 출고 결과 */}
      {showResult && outboundResult && (
        <div className="bg-green-50 p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-green-800">
              출고가 완료되었습니다
            </h2>
            <button
              onClick={() => setShowResult(false)}
              className="text-gray-600 hover:text-gray-800"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">총 출고 수량</div>
                <div className="text-2xl font-bold">
                  {formatNumber(outboundResult.totalQuantity, 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">입고 원가</div>
                <div className="text-xl font-bold">
                  ₩{formatNumber(outboundResult.totalCost, 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">창고료</div>
                <div className="text-xl font-bold text-orange-600">
                  ₩{formatNumber(outboundResult.totalWarehouseFee || 0, 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">운송비</div>
                <div className="text-xl font-bold text-blue-600">
                  ₩{formatNumber(outboundResult.totalShippingCost || 0, 0)}
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <div className="text-lg font-medium text-gray-700">최종 출고 원가</div>
                <div className="text-3xl font-bold text-green-600">
                  ₩{formatNumber(outboundResult.totalFinalCost || outboundResult.totalCost, 0)}
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">LOT별 출고 내역:</div>
              <div className="space-y-2">
                {outboundResult.details.map((detail, index) => (
                  <div
                    key={index}
                    className="bg-white p-3 rounded border border-green-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium">
                          LOT: {detail.lotCode || `#${detail.lotId}`}
                        </span>
                        <span className="text-sm text-gray-600 ml-2">
                          (입고일:{' '}
                          {new Date(detail.receivedDate).toLocaleDateString(
                            'ko-KR'
                          )}
                          )
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">수량:</span> {formatNumber(detail.quantity, 0)}
                      </div>
                      <div>
                        <span className="text-gray-600">입고단가:</span> ₩{formatNumber(detail.unitCost, 2)}
                      </div>
                      <div>
                        <span className="text-gray-600">입고원가:</span> ₩{formatNumber(detail.totalCost, 0)}
                      </div>
                      {detail.warehouseFeeApplied > 0 && (
                        <div>
                          <span className="text-gray-600">창고료:</span> ₩{formatNumber(detail.warehouseFeeApplied, 0)}
                        </div>
                      )}
                      {detail.shippingCostPerUnit > 0 && (
                        <div>
                          <span className="text-gray-600">운송비:</span> ₩{formatNumber(detail.shippingCostPerUnit * detail.quantity, 0)}
                        </div>
                      )}
                      <div className="col-span-2 pt-2 border-t">
                        <span className="text-gray-700 font-medium">최종 원가:</span>{' '}
                        <span className="text-green-600 font-bold">₩{formatNumber(detail.finalTotalCost || detail.totalCost, 0)}</span>
                        {' '}
                        <span className="text-gray-500 text-xs">
                          (단가: ₩{formatNumber(detail.finalUnitCost || detail.unitCost, 2)})
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 출고 이력 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 md:px-6 py-3 md:py-4 border-b">
          <h2 className="text-lg md:text-xl font-bold">출고 이력</h2>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  출고일
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  품목
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  LOT 코드
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  수량
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  단가
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  총액
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {history.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(record.id)}
                      onChange={() => handleSelect(record.id)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                  <td className="px-4 py-4">
                    {new Date(record.movementDate).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-4">
                    [{record.item.code}] {record.item.name}
                  </td>
                  <td className="px-4 py-4">
                    {record.lot?.lotCode || '-'}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {formatNumber(record.quantity, 0)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    ₩{formatNumber(record.unitCost, 2)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    ₩{formatNumber(record.totalCost, 0)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    출고 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          <div className="p-4 border-b bg-gray-50">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded mr-2"
              />
              <span className="text-sm text-gray-700">전체 선택</span>
            </label>
          </div>
          <div className="divide-y divide-gray-200">
            {history.map((record) => (
              <div key={record.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(record.id)}
                      onChange={() => handleSelect(record.id)}
                      className="w-4 h-4 rounded mr-2"
                    />
                    <span className="text-xs text-gray-600">
                      {new Date(record.movementDate).toLocaleDateString('ko-KR')}
                    </span>
                  </label>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="text-red-600 hover:text-red-900 text-sm px-3 py-1 min-h-[32px]"
                  >
                    삭제
                  </button>
                </div>
                <div className="font-bold text-gray-900 mb-2">
                  [{record.item.code}] {record.item.name}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">LOT:</span>
                    <span className="text-gray-900">{record.lot?.lotCode || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">수량:</span>
                    <span className="text-gray-900">{formatNumber(record.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">단가:</span>
                    <span className="text-gray-900">₩{formatNumber(record.unitCost, 2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-gray-600 font-medium">총액:</span>
                    <span className="font-bold text-gray-900">₩{formatNumber(record.totalCost, 0)}</span>
                  </div>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                출고 내역이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {deletingMovementId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              출고 내역 삭제
            </h2>
            <p className="text-gray-700 mb-6">
              정말 이 출고 내역을 삭제하시겠습니까?<br/>
              관련된 재고 수량도 함께 조정됩니다.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeletingMovementId(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
