'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'
import Autocomplete from '@/components/ui/Autocomplete'

interface Product {
  id: number
  name: string
  code: string | null
}

interface PurchaseFlow {
  id: number
  date: string
  type: 'DOMESTIC_PURCHASE' | 'IMPORT'
  quantity: number
  unitPrice: number
  amount: number
  vendorName: string
  importExportId?: number
  inventoryLotId?: number
  costSource: string | null
}

interface InventoryFlow {
  lotId: number
  lotCode: string | null
  receivedDate: string
  quantityReceived: number
  quantityRemaining: number
  storageLocation: string
  unitCost: number
  warehouseFee: number
}

interface SalesFlow {
  id: number
  date: string
  quantity: number
  unitPrice: number
  amount: number
  vendorName: string
  customer: string | null
  margin: number
  marginRate: number
}

interface FlowItem {
  purchase: PurchaseFlow
  inventory?: InventoryFlow
  sales: SalesFlow[]
}

interface FlowResponse {
  product: {
    id: number
    name: string
    code: string | null
  }
  flows: FlowItem[]
  unlinkedSales: SalesFlow[]
  summary: {
    totalPurchaseQuantity: number
    totalPurchaseAmount: number
    totalSalesQuantity: number
    totalSalesAmount: number
    currentStock: number
    totalMargin: number
    averageMarginRate: number
  }
}

export default function SalesFlowPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
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

      const res = await fetch(`/api/sales/flow?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '흐름 조회에 실패했습니다.')
      }

      const data: FlowResponse = await res.json()
      setFlowData(data)
    } catch (error) {
      console.error('Error fetching flow:', error)
      alert(error instanceof Error ? error.message : '흐름 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">매입매출 흐름</h1>

      {/* Filter Section */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Autocomplete
            label="품목 선택"
            options={products.map(p => ({
              id: p.id,
              label: p.name,
              sublabel: p.code || ''
            }))}
            value={selectedProductId}
            onChange={setSelectedProductId}
            placeholder="품목을 검색하세요..."
          />
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleSearch}
            disabled={loading || !selectedProductId}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '조회 중...' : '조회'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {flowData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">총 매입액</div>
            <div className="text-xl font-bold text-orange-600">
              ₩{formatNumber(flowData.summary.totalPurchaseAmount, 0)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">총 매출액</div>
            <div className="text-xl font-bold text-blue-600">
              ₩{formatNumber(flowData.summary.totalSalesAmount, 0)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">총 마진</div>
            <div className="text-xl font-bold text-green-600">
              ₩{formatNumber(flowData.summary.totalMargin, 0)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">평균 마진율</div>
            <div className="text-xl font-bold text-purple-600">
              {flowData.summary.averageMarginRate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">현재 재고</div>
            <div className="text-xl font-bold text-gray-700">
              {formatNumber(flowData.summary.currentStock, 2)}개
            </div>
          </div>
        </div>
      )}

      {/* Timeline View */}
      {flowData && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📦 품목: {flowData.product.name} {flowData.product.code ? `(${flowData.product.code})` : ''}
          </h2>

          {flowData.flows.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              해당 기간에 거래 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-8">
              {flowData.flows.map((flow, index) => (
                <div key={index} className="border-l-4 border-blue-400 pl-6 relative">
                  {/* Purchase Node */}
                  <div className="mb-4">
                    <div className="absolute -left-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs" aria-label="매입 노드">
                      🔵
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="font-bold text-blue-900 mb-2">
                        {formatDate(flow.purchase.date)} - {flow.purchase.type === 'IMPORT' ? '수입 매입' : '국내 매입'}
                      </div>
                      <div className="text-sm text-gray-700">
                        <div>거래처: {flow.purchase.vendorName}</div>
                        <div>수량: {formatNumber(flow.purchase.quantity, 2)}개 × ₩{formatNumber(flow.purchase.unitPrice, 0)} = ₩{formatNumber(flow.purchase.amount, 0)}</div>
                        {flow.purchase.importExportId && (
                          <div className="text-xs text-blue-600">수입번호: IE-{flow.purchase.importExportId}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inventory Node */}
                  {flow.inventory && (
                    <div className="mb-4 ml-6">
                      <div className="absolute -left-3 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs" aria-label="재고 노드">
                        📦
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="font-bold text-orange-900 mb-2">
                          {formatDate(flow.inventory.receivedDate)} - 창고 입고
                        </div>
                        <div className="text-sm text-gray-700">
                          <div>LOT: {flow.inventory.lotCode || `LOT-${flow.inventory.lotId}`}</div>
                          <div>보관위치: {flow.inventory.storageLocation === 'WAREHOUSE' ? '창고' : '사무실'}</div>
                          <div>입고수량: {formatNumber(flow.inventory.quantityReceived, 2)}개 / 잔량: {formatNumber(flow.inventory.quantityRemaining, 2)}개</div>
                          <div>단가: ₩{formatNumber(flow.inventory.unitCost, 0)} (원가 + 창고료: ₩{formatNumber(flow.inventory.warehouseFee, 0)})</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sales Nodes */}
                  {flow.sales.length > 0 && (
                    <div className="ml-6 space-y-4">
                      {flow.sales.map((sale) => (
                        <div key={sale.id} className="mb-4">
                          <div className="absolute -left-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs" aria-label="매출 노드">
                            🟢
                          </div>
                          <div className="bg-green-50 p-4 rounded-lg">
                            <div className="font-bold text-green-900 mb-2">
                              {formatDate(sale.date)} - 매출
                            </div>
                            <div className="text-sm text-gray-700">
                              <div>거래처: {sale.vendorName}</div>
                              {sale.customer && <div>고객: {sale.customer}</div>}
                              <div>수량: {formatNumber(sale.quantity, 2)}개 × ₩{formatNumber(sale.unitPrice, 0)} = ₩{formatNumber(sale.amount, 0)}</div>
                              <div className="text-green-700 font-semibold">
                                마진: ₩{formatNumber(sale.margin, 0)} ({sale.marginRate.toFixed(1)}%)
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Remaining Stock */}
                  {flow.inventory && flow.inventory.quantityRemaining > 0 && (
                    <div className="ml-6 mt-4">
                      <div className="absolute -left-3 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs" aria-label="잔여 재고 노드">
                        📊
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-700">
                          잔여 재고: {formatNumber(flow.inventory.quantityRemaining, 2)}개
                          (재고가치: ₩{formatNumber(flow.inventory.quantityRemaining * flow.inventory.unitCost, 0)})
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Unlinked Sales Section */}
          {flowData.unlinkedSales && flowData.unlinkedSales.length > 0 && (
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-bold text-gray-700 mb-2">🔸 미연동 매출</h3>
              <p className="text-sm text-gray-500 mb-4">매입과 직접 연동되지 않은 매출 내역입니다.</p>
              <div className="space-y-4">
                {flowData.unlinkedSales.map((sale) => (
                  <div key={sale.id} className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                    <div className="font-bold text-green-900 mb-2">
                      {formatDate(sale.date)} - 매출 (미연동)
                    </div>
                    <div className="text-sm text-gray-700">
                      <div>거래처: {sale.vendorName}</div>
                      {sale.customer && <div>고객: {sale.customer}</div>}
                      <div>수량: {formatNumber(sale.quantity, 2)}개 × ₩{formatNumber(sale.unitPrice, 0)} = ₩{formatNumber(sale.amount, 0)}</div>
                      <div className="text-green-700 font-semibold">
                        마진: ₩{formatNumber(sale.margin, 0)} ({sale.marginRate.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
