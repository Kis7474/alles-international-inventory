'use client'

import { useEffect, useState } from 'react'
import { formatNumber, calculateUnitCost } from '@/lib/utils'

interface Product {
  id: number
  code: string
  name: string
  unit: string
  category: {
    nameKo: string
  } | null
}

interface Lot {
  id: number
  lotCode: string | null
  receivedDate: string
  quantityReceived: number
  quantityRemaining: number
  goodsAmount: number
  dutyAmount: number
  domesticFreight: number
  otherCost: number
  unitCost: number
  warehouseFee: number
  storageLocation: string
  product: Product | null
  item: {
    id: number
    code: string
    name: string
    unit: string
  } | null
  importExport: {
    id: number
    date: string
    type: string
  } | null
}

export default function LotsPage() {
  const [lots, setLots] = useState<Lot[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [deletingLotId, setDeletingLotId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)
  
  // 탭 상태
  const [activeTab, setActiveTab] = useState<'ALL' | 'WAREHOUSE' | 'OFFICE'>('ALL')
  
  // 필터 상태
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterProductId, setFilterProductId] = useState('')
  const [filterImportExportId, setFilterImportExportId] = useState('')
  
  // 대시보드 상태
  const [dashboardData, setDashboardData] = useState({
    totalLots: 0,
    warehouseLots: 0,
    officeLots: 0,
    totalQuantity: 0,
    warehouseQuantity: 0,
    officeQuantity: 0,
    totalValue: 0,
    warehouseValue: 0,
    officeValue: 0,
  })
  
  const [formData, setFormData] = useState({
    productId: '',
    lotCode: '',
    receivedDate: new Date().toISOString().split('T')[0],
    quantityReceived: '',
    palletQuantities: '',
    goodsAmount: '',
    dutyAmount: '',
    domesticFreight: '',
    otherCost: '0',
    storageLocation: 'WAREHOUSE',
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    handleFilter()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const fetchData = async () => {
    try {
      const [lotsRes, productsRes] = await Promise.all([
        fetch('/api/lots', { cache: 'no-store' }),
        fetch('/api/products', { cache: 'no-store' }),
      ])
      const [lotsResponse, productsResponse] = await Promise.all([
        lotsRes.json(),
        productsRes.json(),
      ])
      
      // lots 처리 - 하위 호환성: 배열이면 그대로 사용, 객체면 data 속성 사용
      let lotsData: Lot[] = []
      if (Array.isArray(lotsResponse)) {
        lotsData = lotsResponse
      } else {
        lotsData = lotsResponse.data || []
        // pagination 정보는 받지만 현재는 UI에 표시하지 않음 (향후 기능 추가 가능)
      }
      
      // products 처리 - 방어적 코딩 추가
      let productsData: Product[] = []
      if (Array.isArray(productsResponse)) {
        productsData = productsResponse
      } else if (productsResponse.data && Array.isArray(productsResponse.data)) {
        productsData = productsResponse.data
      } else if (productsResponse.error) {
        // productsResponse가 { error: ... } 객체인 경우
        console.error('Error fetching products:', productsResponse.error)
      }
      // 빈 배열로 유지하여 .map() 에러 방지
      
      setLots(lotsData)
      setProducts(productsData)
      calculateDashboard(lotsData)
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('데이터 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }
  
  // 대시보드 데이터 계산 함수
  const calculateDashboard = (lotsData: Lot[]) => {
    const warehouseLots = lotsData.filter(l => l.storageLocation === 'WAREHOUSE')
    const officeLots = lotsData.filter(l => l.storageLocation === 'OFFICE')
    
    setDashboardData({
      totalLots: lotsData.length,
      warehouseLots: warehouseLots.length,
      officeLots: officeLots.length,
      totalQuantity: lotsData.reduce((sum, l) => sum + l.quantityRemaining, 0),
      warehouseQuantity: warehouseLots.reduce((sum, l) => sum + l.quantityRemaining, 0),
      officeQuantity: officeLots.reduce((sum, l) => sum + l.quantityRemaining, 0),
      totalValue: lotsData.reduce((sum, l) => sum + (l.quantityRemaining * l.unitCost), 0),
      warehouseValue: warehouseLots.reduce((sum, l) => sum + (l.quantityRemaining * l.unitCost), 0),
      officeValue: officeLots.reduce((sum, l) => sum + (l.quantityRemaining * l.unitCost), 0),
    })
  }

  const handleFilter = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStartDate) params.append('startDate', filterStartDate)
      if (filterEndDate) params.append('endDate', filterEndDate)
      if (filterProductId) params.append('productId', filterProductId)
      if (filterImportExportId) params.append('importExportId', filterImportExportId)
      if (activeTab !== 'ALL') params.append('storageLocation', activeTab)

      const res = await fetch(`/api/lots?${params.toString()}`, { cache: 'no-store' })
      const response = await res.json()
      
      // 하위 호환성: 배열이면 그대로 사용, 객체면 data 속성 사용
      let lotsData: Lot[] = []
      if (Array.isArray(response)) {
        lotsData = response
      } else {
        lotsData = response.data || []
        // pagination 정보는 받지만 현재는 UI에 표시하지 않음 (향후 기능 추가 가능)
      }
      
      setLots(lotsData)
      calculateDashboard(lotsData)
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error filtering lots:', error)
      alert('필터링 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      productId: parseInt(formData.productId),
      lotCode: formData.lotCode || null,
      receivedDate: formData.receivedDate,
      quantityReceived: parseFloat(formData.quantityReceived),
      palletQuantities: formData.palletQuantities
        .split(',')
        .map((value) => parseFloat(value.trim()))
        .filter((value) => Number.isFinite(value) && value > 0),
      goodsAmount: parseFloat(formData.goodsAmount) || 0,
      dutyAmount: parseFloat(formData.dutyAmount) || 0,
      domesticFreight: parseFloat(formData.domesticFreight) || 0,
      otherCost: parseFloat(formData.otherCost) || 0,
      storageLocation: formData.storageLocation,
    }

    try {
      const res = await fetch('/api/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        alert(result.error || '입고 등록 중 오류가 발생했습니다.')
        return
      }

      const createdCount = typeof result.count === 'number' ? result.count : 1
      alert(createdCount > 1
        ? `입고가 등록되었습니다. (${createdCount}개 파레트 LOT로 분할)`
        : '입고가 등록되었습니다.')
      setShowForm(false)
      setFormData({
        productId: '',
        lotCode: '',
        receivedDate: new Date().toISOString().split('T')[0],
        quantityReceived: '',
        palletQuantities: '',
        goodsAmount: '',
        dutyAmount: '',
        domesticFreight: '',
        otherCost: '0',
        storageLocation: 'WAREHOUSE',
      })
      fetchData()
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error saving lot:', error)
      alert('입고 등록 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (lotId: number) => {
    setDeletingLotId(lotId)
  }

  const confirmDelete = async () => {
    if (!deletingLotId) return

    try {
      const res = await fetch(`/api/lots?id=${deletingLotId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const result = await res.json()
        alert(result.error || '삭제 중 오류가 발생했습니다.')
        return
      }

      alert('입고 내역이 삭제되었습니다.')
      setDeletingLotId(null)
      fetchData()
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error deleting lot:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
    } else {
      setSelectedIds(lots.map(r => r.id))
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
      const res = await fetch('/api/lots', {
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
      console.error('Error bulk deleting lots:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleStorageLocationChange = async (lotId: number, newLocation: string) => {
    try {
      const res = await fetch('/api/lots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lotId, storageLocation: newLocation })
      })
      
      if (!res.ok) {
        const error = await res.json()
        alert(error.error || '보관위치 변경 중 오류가 발생했습니다.')
        return
      }
      
      // 목록 새로고침
      handleFilter()
      alert('보관위치가 변경되었습니다.')
    } catch (error) {
      console.error('Error changing storage location:', error)
      alert('보관위치 변경 중 오류가 발생했습니다.')
    }
  }

  // 단가 미리보기 계산
  const quantity = parseFloat(formData.quantityReceived)
  const previewUnitCost = quantity > 0
    ? calculateUnitCost(
        parseFloat(formData.goodsAmount) || 0,
        parseFloat(formData.dutyAmount) || 0,
        parseFloat(formData.domesticFreight) || 0,
        parseFloat(formData.otherCost) || 0,
        quantity
      )
    : 0

  if (loading) {
    return <div>로딩 중...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">입고 관리</h1>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              선택 삭제 ({selectedIds.length}개)
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + 입고 등록
          </button>
        </div>
      </div>

      {/* 대시보드 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* 전체 현황 */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">📊 전체</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.totalLots}개 LOT</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">잔량</p>
              <p className="text-lg font-semibold text-gray-700">{formatNumber(dashboardData.totalQuantity, 0)}</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t">
            <p className="text-sm text-gray-600">
              총 가치: <span className="font-semibold">₩{formatNumber(dashboardData.totalValue, 0)}</span>
            </p>
          </div>
        </div>
        
        {/* 창고 현황 */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">🏭 창고</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.warehouseLots}개 LOT</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">잔량</p>
              <p className="text-lg font-semibold text-gray-700">{formatNumber(dashboardData.warehouseQuantity, 0)}</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t">
            <p className="text-sm text-gray-600">
              총 가치: <span className="font-semibold">₩{formatNumber(dashboardData.warehouseValue, 0)}</span>
            </p>
          </div>
        </div>
        
        {/* 사무실 현황 */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">🏢 사무실</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.officeLots}개 LOT</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">잔량</p>
              <p className="text-lg font-semibold text-gray-700">{formatNumber(dashboardData.officeQuantity, 0)}</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t">
            <p className="text-sm text-gray-600">
              총 가치: <span className="font-semibold">₩{formatNumber(dashboardData.officeValue, 0)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 탭 UI */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => {
            setActiveTab('ALL')
            handleFilter()
          }}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'ALL'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📊 전체
        </button>
        <button
          onClick={() => {
            setActiveTab('WAREHOUSE')
            handleFilter()
          }}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'WAREHOUSE'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🏭 창고 입고
        </button>
        <button
          onClick={() => {
            setActiveTab('OFFICE')
            handleFilter()
          }}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'OFFICE'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🏢 사무실 보관
        </button>
      </div>

      {/* 필터 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-bold mb-4 text-gray-900">필터</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">시작일</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">종료일</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">품목</label>
            <select
              value={filterProductId}
              onChange={(e) => setFilterProductId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            >
              <option value="">전체</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  [{product.code}] {product.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">수입/수출 ID</label>
            <input
              type="text"
              value={filterImportExportId}
              onChange={(e) => setFilterImportExportId(e.target.value)}
              placeholder="ID 입력"
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={handleFilter}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            필터 적용
          </button>
          <button
            onClick={() => {
              setFilterStartDate('')
              setFilterEndDate('')
              setFilterProductId('')
              setFilterImportExportId('')
              fetchData()
            }}
            className="ml-2 bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 입고 등록 폼 */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">입고 등록</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  품목 *
                </label>
                <select
                  required
                  value={formData.productId}
                  onChange={(e) =>
                    setFormData({ ...formData, productId: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">품목을 선택하세요</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      [{product.code}] {product.name} ({product.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  LOT 코드
                </label>
                <input
                  type="text"
                  value={formData.lotCode}
                  onChange={(e) =>
                    setFormData({ ...formData, lotCode: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="비워두면 자동생성 (예: LOT-202602-0001)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  입고일 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.receivedDate}
                  onChange={(e) =>
                    setFormData({ ...formData, receivedDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  입고 수량 *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={formData.quantityReceived}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantityReceived: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  파레트 수량 분할 (선택)
                </label>
                <input
                  type="text"
                  value={formData.palletQuantities}
                  onChange={(e) =>
                    setFormData({ ...formData, palletQuantities: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="예: 30,30,30,30,40,40"
                />
                <p className="text-xs text-gray-500 mt-1">
                  쉼표로 구분해 입력하면 파레트별 LOT로 자동 분할됩니다 (합계=입고 수량).
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  물품대금 (₩)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.goodsAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, goodsAmount: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  수입통관료 (₩)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.dutyAmount}
                  onChange={(e) =>
                    setFormData({ ...formData, dutyAmount: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  국내 입고운송료 (₩)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.domesticFreight}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      domesticFreight: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  기타 비용 (₩)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.otherCost}
                  onChange={(e) =>
                    setFormData({ ...formData, otherCost: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  보관 위치 *
                </label>
                <select
                  required
                  value={formData.storageLocation}
                  onChange={(e) =>
                    setFormData({ ...formData, storageLocation: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="WAREHOUSE">🏭 창고</option>
                  <option value="OFFICE">🏢 사무실</option>
                </select>
              </div>
            </div>

            {/* 단가 미리보기 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-700 mb-2">
                계산된 단가 (미리보기)
              </div>
              <div className="text-2xl font-bold text-blue-600">
                ₩{formatNumber(previewUnitCost, 6)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                = (물품대금 + 수입통관료 + 입고운송료 + 기타비용) / 입고수량
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                등록
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LOT 목록 */}
      <div className="bg-white rounded-lg shadow overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
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
                품목
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                LOT 코드
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                수입/수출
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                입고일
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                보관위치
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                입고수량
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                잔량
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                수입단가
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                창고료
              </th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                최종단가
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
            {lots.map((lot) => {
              // Calculate final unit cost including warehouse fees
              const finalUnitCost = lot.quantityRemaining > 0 
                ? lot.unitCost + (lot.warehouseFee || 0) / lot.quantityRemaining 
                : lot.unitCost
              
              return (
              <tr key={lot.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(lot.id)}
                    onChange={() => handleSelect(lot.id)}
                    className="w-4 h-4 rounded"
                  />
                </td>
                <td className="px-4 py-4">
                  {lot.product ? `[${lot.product.code}] ${lot.product.name}` : lot.item ? `[${lot.item.code}] ${lot.item.name}` : '-'}
                </td>
                <td className="px-4 py-4">{lot.lotCode || '-'}</td>
                <td className="px-4 py-4">
                  {lot.importExport ? (
                    <a
                      href={`/import-export/${lot.importExport.id}`}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      #{lot.importExport.id} ({lot.importExport.type === 'IMPORT' ? '수입' : '수출'})
                    </a>
                  ) : '-'}
                </td>
                <td className="px-4 py-4">
                  {new Date(lot.receivedDate).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-4">
                  <select
                    value={lot.storageLocation || 'WAREHOUSE'}
                    onChange={(e) => handleStorageLocationChange(lot.id, e.target.value)}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    <option value="WAREHOUSE">🏭 창고</option>
                    <option value="OFFICE">🏢 사무실</option>
                  </select>
                </td>
                <td className="px-4 py-4 text-right">
                  {formatNumber(lot.quantityReceived, 0)}
                </td>
                <td className="px-4 py-4 text-right">
                  {formatNumber(lot.quantityRemaining, 0)}
                </td>
                <td className="px-4 py-4 text-right">
                  ₩{formatNumber(lot.unitCost, 2)}
                </td>
                <td className="px-4 py-4 text-right">
                  ₩{formatNumber(lot.warehouseFee || 0, 0)}
                </td>
                <td className="px-4 py-4 text-right font-semibold">
                  ₩{formatNumber(finalUnitCost, 2)}
                </td>
                <td className="px-4 py-4 text-right">
                  ₩{formatNumber(lot.quantityRemaining * finalUnitCost, 0)}
                </td>
                <td className="px-4 py-4 text-center">
                  <button
                    onClick={() => handleDelete(lot.id)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    삭제
                  </button>
                </td>
              </tr>
              )
            })}
            {lots.length === 0 && (
              <tr>
                <td
                  colSpan={12}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  등록된 입고 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 삭제 확인 모달 */}
      {deletingLotId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              입고 내역 삭제
            </h2>
            <p className="text-gray-700 mb-6">
              정말 이 입고 내역을 삭제하시겠습니까?<br/>
              관련된 재고 수량도 함께 조정됩니다.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeletingLotId(null)}
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
