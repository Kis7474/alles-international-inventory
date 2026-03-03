'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'

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
}

interface OutboundHistory {
  id: number
  movementDate: string
  quantity: number
  unitCost: number
  totalCost: number
  outboundType: string | null
  notes: string | null
  item: {
    code: string
    name: string
  } | null
  product: {
    code: string | null
    name: string
  } | null
  lot: {
    lotCode: string | null
    receivedDate: string
  } | null
  vendor: {
    id: number
    name: string
  } | null
  salesperson: {
    id: number
    name: string
  } | null
  salesRecord: {
    id: number
    amount: number
  } | null
}

export default function OutboundPage() {
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
  
  // Phase 4: 추가 상태
  const [vendors, setVendors] = useState<Array<{ id: number; name: string; code: string; type: string }>>([])
  const [salespersons, setSalespersons] = useState<Array<{ id: number; name: string }>>([])
  const [costPreview, setCostPreview] = useState<{ cost: number; source: string } | null>(null)
  const [pricePreview, setPricePreview] = useState<number | null>(null)
  
  // 필터 상태
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterProductId, setFilterProductId] = useState('')
  
  const [outboundResult, setOutboundResult] = useState<{
    totalQuantity: number
    totalCost: number
    details: OutboundDetail[]
    salesRecordId?: number
  } | null>(null)
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    outboundDate: new Date().toISOString().split('T')[0],
    outboundType: 'OTHER', // 'SALES' | 'OTHER'
    vendorId: '',
    salespersonId: '',
    unitPriceOverride: '', // Phase 4: 매출가 수동 오버라이드
    notes: '',
  })

  useEffect(() => {
    fetchData()
    fetchInventoryProducts()
    fetchVendors()
    fetchSalespersons()
  }, [])

  useEffect(() => {
    fetchInventoryProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStorageLocation])

  const fetchData = async () => {
    try {
      const historyRes = await fetch('/api/outbound', { cache: 'no-store' })
      const historyData = await historyRes.json()
      setHistory(Array.isArray(historyData) ? historyData : [])
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('데이터 조회 중 오류가 발생했습니다.')
      setHistory([])
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
      
      const res = await fetch(`/api/inventory?${params.toString()}`, { cache: 'no-store' })
      const responseData = await res.json()
      
      // API returns { data: [...], pagination: {...} } format
      const data: InventoryProduct[] = Array.isArray(responseData) 
        ? responseData 
        : (Array.isArray(responseData.data) ? responseData.data : [])
      
      // Filter to only products with inventory
      setInventoryProducts(data.filter((item) => item.totalQuantity > 0))
    } catch (error) {
      console.error('Error fetching inventory:', error)
      setInventoryProducts([])
    }
  }

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/vendors', { cache: 'no-store' })
      const data = await res.json()
      setVendors(data || [])
    } catch (error) {
      console.error('Error fetching vendors:', error)
      setVendors([])
    }
  }

  const fetchSalespersons = async () => {
    try {
      const res = await fetch('/api/salesperson', { cache: 'no-store' })
      const data = await res.json()
      setSalespersons(data || [])
    } catch (error) {
      console.error('Error fetching salespersons:', error)
      setSalespersons([])
    }
  }
  
  const handleProductSelect = (productId: string) => {
    const selected = inventoryProducts.find(p => p.productId === parseInt(productId))
    setFormData({ ...formData, productId })
    setSelectedProductInfo(selected || null)
    
    // Fetch cost preview for SALES type
    if (formData.outboundType === 'SALES' && productId) {
      fetchCostPreview(parseInt(productId))
      if (formData.vendorId) {
        fetchPricePreview(parseInt(productId), parseInt(formData.vendorId))
      }
    }
  }

  const fetchCostPreview = async (productId: number) => {
    try {
      const res = await fetch(`/api/products/${productId}/cost`)
      const data = await res.json()
      setCostPreview(data)
    } catch (error) {
      console.error('Error fetching cost preview:', error)
      setCostPreview(null)
    }
  }

  const fetchPricePreview = async (productId: number, vendorId: number) => {
    try {
      // Try VendorProductPrice first
      const res = await fetch(`/api/vendor-product-prices?productId=${productId}&vendorId=${vendorId}`)
      const prices = await res.json()
      
      if (prices.length > 0) {
        interface VendorPrice {
          effectiveDate: string
          salesPrice: number
        }
        const latestPrice = prices.sort((a: VendorPrice, b: VendorPrice) => 
          new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
        )[0]
        
        if (latestPrice.salesPrice) {
          setPricePreview(latestPrice.salesPrice)
          // Phase 4: Auto-fill unitPriceOverride
          setFormData(prev => ({ ...prev, unitPriceOverride: latestPrice.salesPrice.toString() }))
          return
        }
      }
      
      // Fallback to defaultSalesPrice
      const product = inventoryProducts.find(p => p.productId === productId)
      const defaultPrice = product ? await fetchProductDefaultPrice(productId) : 0
      setPricePreview(defaultPrice)
      // Phase 4: Auto-fill unitPriceOverride
      setFormData(prev => ({ ...prev, unitPriceOverride: defaultPrice.toString() }))
    } catch (error) {
      console.error('Error fetching price preview:', error)
      setPricePreview(null)
    }
  }

  const fetchProductDefaultPrice = async (productId: number): Promise<number> => {
    try {
      const res = await fetch(`/api/products/${productId}`)
      const data = await res.json()
      return data.defaultSalesPrice || 0
    } catch (error) {
      console.error('Error fetching product default price:', error)
      return 0
    }
  }

  const handleVendorChange = (vendorId: string) => {
    setFormData({ ...formData, vendorId })
    
    // Fetch price preview if product is selected
    if (formData.productId && vendorId) {
      fetchPricePreview(parseInt(formData.productId), parseInt(vendorId))
    }
  }

  const handleOutboundTypeChange = (outboundType: string) => {
    setFormData({ 
      ...formData, 
      outboundType,
      vendorId: outboundType === 'SALES' ? formData.vendorId : '',
      salespersonId: outboundType === 'SALES' ? formData.salespersonId : '',
    })
    
    // Fetch previews if SALES and product selected
    if (outboundType === 'SALES' && formData.productId) {
      fetchCostPreview(parseInt(formData.productId))
      if (formData.vendorId) {
        fetchPricePreview(parseInt(formData.productId), parseInt(formData.vendorId))
      }
    } else {
      setCostPreview(null)
      setPricePreview(null)
    }
  }

  const handleFilter = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStartDate) params.append('startDate', filterStartDate)
      if (filterEndDate) params.append('endDate', filterEndDate)
      if (filterProductId) params.append('productId', filterProductId)

      const res = await fetch(`/api/outbound?${params.toString()}`, { cache: 'no-store' })
      const data = await res.json()
      setHistory(Array.isArray(data) ? data : [])
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error filtering outbound:', error)
      alert('필터링 중 오류가 발생했습니다.')
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      productId: formData.productId ? parseInt(formData.productId) : null,
      quantity: parseFloat(formData.quantity),
      outboundDate: formData.outboundDate,
      storageLocation: selectedStorageLocation,
      outboundType: formData.outboundType,
      vendorId: formData.vendorId ? parseInt(formData.vendorId) : null,
      salespersonId: formData.salespersonId ? parseInt(formData.salespersonId) : null,
      // Phase 4: Always send as number (0 if empty)
      unitPriceOverride: formData.unitPriceOverride ? parseFloat(formData.unitPriceOverride) : 0,
      notes: formData.notes || null,
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
        quantity: '',
        outboundDate: new Date().toISOString().split('T')[0],
        outboundType: 'OTHER',
        vendorId: '',
        salespersonId: '',
        unitPriceOverride: '', // Phase 4
        notes: '',
      })
      setCostPreview(null)
      setPricePreview(null)
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
              value={filterProductId}
              onChange={(e) => setFilterProductId(e.target.value)}
              className="w-full px-3 py-3 md:py-2 border rounded-lg text-gray-900"
            >
              <option value="">전체</option>
              {inventoryProducts.map((item) => (
                <option key={item.productId} value={item.productId}>
                  {item.productName}
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
              setFilterProductId('')
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

            {/* 출고 목적 선택 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium mb-2 text-gray-700">출고 목적 *</label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="SALES"
                    checked={formData.outboundType === 'SALES'}
                    onChange={() => handleOutboundTypeChange('SALES')}
                    className="mr-2"
                  />
                  <span className="text-gray-700">판매출고 (매출 자동 생성)</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="OTHER"
                    checked={formData.outboundType === 'OTHER'}
                    onChange={() => handleOutboundTypeChange('OTHER')}
                    className="mr-2"
                  />
                  <span className="text-gray-700">기타출고 (샘플, 내부이동, 폐기 등)</span>
                </label>
              </div>
            </div>

            {/* 판매출고 시 추가 필드 */}
            {formData.outboundType === 'SALES' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    거래처 * <span className="text-xs text-blue-600">(매출 거래처만 표시)</span>
                  </label>
                  <select
                    required
                    value={formData.vendorId}
                    onChange={(e) => handleVendorChange(e.target.value)}
                    className="w-full px-3 py-3 md:py-2 border rounded-lg text-gray-900"
                  >
                    <option value="">거래처를 선택하세요</option>
                    {vendors
                      .filter(v => v.type === 'DOMESTIC_SALES' || v.type === 'INTERNATIONAL_SALES')
                      .map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          [{vendor.code}] {vendor.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    담당자 *
                  </label>
                  <select
                    required
                    value={formData.salespersonId}
                    onChange={(e) => setFormData({ ...formData, salespersonId: e.target.value })}
                    className="w-full px-3 py-3 md:py-2 border rounded-lg text-gray-900"
                  >
                    <option value="">담당자를 선택하세요</option>
                    {salespersons.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
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
            </div>

            {/* 판매출고 시 매출가/원가/마진 미리보기 */}
            {formData.outboundType === 'SALES' && formData.productId && formData.quantity && (
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <h3 className="font-medium mb-3 text-blue-900">매출 미리보기</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <div className="text-blue-600">단위원가</div>
                    <div className="text-lg font-bold text-blue-900">
                      {costPreview ? `₩${costPreview.cost.toLocaleString()}` : '-'}
                    </div>
                    <div className="text-xs text-blue-600">
                      {costPreview?.source === 'CURRENT' && '(창고료 포함 현재원가)'}
                      {costPreview?.source === 'DEFAULT' && '(기본 매입가)'}
                      {costPreview?.source === 'NONE' && '(원가 없음)'}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-600">단위매출가</div>
                    <div className="text-lg font-bold text-blue-900">
                      {pricePreview !== null ? `₩${pricePreview.toLocaleString()}` : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-600">예상 마진</div>
                    <div className="text-lg font-bold text-green-600">
                      {costPreview && pricePreview !== null
                        ? `₩${((pricePreview - costPreview.cost) * parseFloat(formData.quantity)).toLocaleString()}`
                        : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-600">마진율</div>
                    <div className="text-lg font-bold text-purple-600">
                      {costPreview && pricePreview !== null && pricePreview > 0
                        ? `${(((pricePreview - costPreview.cost) / pricePreview) * 100).toFixed(1)}%`
                        : '-'}
                    </div>
                  </div>
                </div>
                
                {/* Phase 4: 매출가 수동 오버라이드 입력 */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-blue-900">
                    매출 단가 (수동 조정 가능) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.unitPriceOverride}
                    onChange={(e) => setFormData({ ...formData, unitPriceOverride: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900"
                    placeholder="매출 단가를 입력하세요"
                  />
                  <div className="text-xs text-blue-600 mt-1">
                    위 미리보기 값으로 자동 채워지지만, 특가/할인 매출 시 직접 수정할 수 있습니다.
                  </div>
                </div>
              </div>
            )}

            {/* 비고 */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                비고 (선택)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-3 md:py-2 border rounded-lg text-gray-900"
                rows={2}
                placeholder="비고 사항을 입력하세요"
              />
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">총 출고 수량</div>
                <div className="text-2xl font-bold">
                  {formatNumber(outboundResult.totalQuantity, 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">총 출고 원가</div>
                <div className="text-2xl font-bold text-green-600">
                  ₩{formatNumber(outboundResult.totalCost, 0)}
                </div>
              </div>
            </div>

            {outboundResult.salesRecordId && (
              <div className="bg-white p-3 rounded border border-green-300">
                <div className="text-sm text-green-700">
                  ✅ 매출 기록이 자동으로 생성되었습니다. (ID: #{outboundResult.salesRecordId})
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium mb-2">LOT별 출고 내역:</div>
              <div className="space-y-2">
                {outboundResult.details.map((detail, index) => (
                  <div
                    key={index}
                    className="bg-white p-3 rounded border border-green-200"
                  >
                    <div className="flex justify-between items-center">
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
                      <div className="text-right">
                        <div>
                          수량: {formatNumber(detail.quantity, 0)} × 단가: ₩
                          {formatNumber(detail.unitCost, 2)}
                        </div>
                        <div className="font-bold text-green-600">
                          = ₩{formatNumber(detail.totalCost, 0)}
                        </div>
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
                  출고목적
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  품목
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  거래처
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  담당자
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  수량
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                  총액
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  연동매출
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
                    {record.outboundType === 'SALES' ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        판매출고
                      </span>
                    ) : record.outboundType === 'OTHER' ? (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                        기타출고
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {record.product 
                      ? `${record.product.code ? `[${record.product.code}]` : ''} ${record.product.name}`
                      : record.item 
                        ? `[${record.item.code}] ${record.item.name}`
                        : '-'
                    }
                  </td>
                  <td className="px-4 py-4">
                    {record.vendor ? record.vendor.name : '-'}
                  </td>
                  <td className="px-4 py-4">
                    {record.salesperson ? record.salesperson.name : '-'}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {formatNumber(record.quantity, 0)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    ₩{formatNumber(record.totalCost, 0)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {record.salesRecord ? (
                      <a 
                        href={`/sales/${record.salesRecord.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        #{record.salesRecord.id}
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
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
                    colSpan={10}
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
                    <div>
                      <div className="text-xs text-gray-600">
                        {new Date(record.movementDate).toLocaleDateString('ko-KR')}
                      </div>
                      {record.outboundType === 'SALES' ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium mt-1 inline-block">
                          판매출고
                        </span>
                      ) : record.outboundType === 'OTHER' ? (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs font-medium mt-1 inline-block">
                          기타출고
                        </span>
                      ) : null}
                    </div>
                  </label>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="text-red-600 hover:text-red-900 text-sm px-3 py-1 min-h-[32px]"
                  >
                    삭제
                  </button>
                </div>
                <div className="font-bold text-gray-900 mb-2">
                  {record.product 
                    ? `${record.product.code ? `[${record.product.code}]` : ''} ${record.product.name}`
                    : record.item 
                      ? `[${record.item.code}] ${record.item.name}`
                      : '-'
                  }
                </div>
                <div className="space-y-1 text-sm">
                  {record.vendor && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">거래처:</span>
                      <span className="text-gray-900">{record.vendor.name}</span>
                    </div>
                  )}
                  {record.salesperson && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">담당자:</span>
                      <span className="text-gray-900">{record.salesperson.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">수량:</span>
                    <span className="text-gray-900">{formatNumber(record.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-gray-600 font-medium">총액:</span>
                    <span className="font-bold text-gray-900">₩{formatNumber(record.totalCost, 0)}</span>
                  </div>
                  {record.salesRecord && (
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600">연동매출:</span>
                      <a 
                        href={`/sales/${record.salesRecord.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        #{record.salesRecord.id}
                      </a>
                    </div>
                  )}
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
