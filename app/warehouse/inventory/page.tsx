'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'

interface InventoryItem {
  productId: number
  productCode: string | null
  productName: string
  unit: string
  purchaseVendor: string | null
  category: string | null
  totalQuantity: number
  avgUnitCost: number
  totalValue: number
  totalAccumulatedWarehouseFee: number
  currentValue: number
  avgUnitCostWithWarehouseFee: number
  lotCount: number
}

interface Lot {
  id: number
  lotCode: string | null
  receivedDate: string
  quantityReceived: number
  quantityRemaining: number
  unitCost: number
  accumulatedWarehouseFee: number
}

interface ItemDetail {
  productId: number
  totalQuantity: number
  totalAccumulatedWarehouseFee: number
  lots: Lot[]
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ItemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'ALL' | 'WAREHOUSE' | 'OFFICE'>('ALL')

  useEffect(() => {
    fetchInventory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const fetchInventory = async () => {
    try {
      const params = new URLSearchParams()
      if (activeTab !== 'ALL') {
        params.append('storageLocation', activeTab)
      }
      
      const res = await fetch(`/api/inventory?${params.toString()}`)
      const data = await res.json()
      setInventory(data)
    } catch (error) {
      console.error('Error fetching inventory:', error)
      alert('재고 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleItemClick = async (productId: number) => {
    try {
      const res = await fetch(`/api/inventory?productId=${productId}`)
      const data = await res.json()
      setSelectedItem(data)
    } catch (error) {
      console.error('Error fetching item detail:', error)
      alert('품목 상세 조회 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return <div>로딩 중...</div>
  }

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-gray-900">재고 조회</h1>

      {/* 창고료 정보 요약 */}
      {inventory.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-bold text-orange-900 mb-2">💰 누적 창고료 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <p className="text-xs md:text-sm text-orange-700">총 누적 창고료</p>
              <p className="text-xl md:text-2xl font-bold text-orange-900">
                ₩{formatNumber(inventory.reduce((sum, item) => sum + (item.totalAccumulatedWarehouseFee || 0), 0), 0)}
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-orange-700">현재 재고 가치 (창고료 포함)</p>
              <p className="text-xl md:text-2xl font-bold text-orange-900">
                ₩{formatNumber(inventory.reduce((sum, item) => sum + (item.currentValue || 0), 0), 0)}
              </p>
            </div>
          </div>
          <p className="text-xs text-orange-600 mt-2">
            * 창고료는 가치 기준으로 배분되어 각 LOT에 누적됩니다.
          </p>
        </div>
      )}

      {/* 탭 UI */}
      <div className="flex border-b mb-4 md:mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 md:px-6 py-3 font-medium transition-colors whitespace-nowrap min-h-[44px] ${
            activeTab === 'ALL'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📊 전체 재고
        </button>
        <button
          onClick={() => setActiveTab('WAREHOUSE')}
          className={`px-4 md:px-6 py-3 font-medium transition-colors whitespace-nowrap min-h-[44px] ${
            activeTab === 'WAREHOUSE'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🏭 창고 재고
        </button>
        <button
          onClick={() => setActiveTab('OFFICE')}
          className={`px-4 md:px-6 py-3 font-medium transition-colors whitespace-nowrap min-h-[44px] ${
            activeTab === 'OFFICE'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🏢 사무실 재고
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* 품목별 재고 현황 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 md:px-6 py-3 md:py-4 border-b">
            <h2 className="text-lg md:text-xl font-bold">품목별 재고 현황</h2>
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    품목
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    매입처
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    카테고리
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    재고
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    평균단가
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    누적 창고료
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    현재 가치<br/>(창고료 포함)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inventory.map((item) => (
                  <tr
                    key={item.productId}
                    onClick={() => handleItemClick(item.productId)}
                    className={`cursor-pointer hover:bg-blue-50 ${
                      selectedItem?.productId === item.productId ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.productName}</div>
                      {item.productCode && <div className="text-sm text-gray-600">[{item.productCode}]</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.purchaseVendor || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.category || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {formatNumber(item.totalQuantity, 0)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-blue-700">
                      ₩{formatNumber(item.avgUnitCost, 2)}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-600">
                      ₩{formatNumber(item.totalAccumulatedWarehouseFee || 0, 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      ₩{formatNumber(item.currentValue || item.totalValue, 0)}
                    </td>
                  </tr>
                ))}
                {inventory.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      재고가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {inventory.map((item) => (
              <div
                key={item.productId}
                onClick={() => handleItemClick(item.productId)}
                className={`p-4 cursor-pointer active:bg-blue-50 ${
                  selectedItem?.productId === item.productId ? 'bg-blue-50' : ''
                }`}
              >
                <div className="font-bold text-gray-900 mb-2 text-base">
                  {item.productName}
                  {item.productCode && <span className="text-sm text-gray-600 ml-2">[{item.productCode}]</span>}
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">매입처:</span>
                    <span className="text-gray-900">{item.purchaseVendor || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">카테고리:</span>
                    <span className="text-gray-900">{item.category || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">재고:</span>
                    <span className="font-bold text-gray-900">{formatNumber(item.totalQuantity, 0)} {item.unit}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-gray-600">평균단가:</span>
                    <span className="font-bold text-blue-700">₩{formatNumber(item.avgUnitCost, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-xs">누적 창고료:</span>
                    <span className="text-orange-600 text-xs">₩{formatNumber(item.totalAccumulatedWarehouseFee || 0, 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-gray-600 font-medium">현재 가치:</span>
                    <span className="font-bold text-gray-900">₩{formatNumber(item.currentValue || item.totalValue, 0)}</span>
                  </div>
                </div>
              </div>
            ))}
            {inventory.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                재고가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* LOT별 상세 정보 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 md:px-6 py-3 md:py-4 border-b">
            <h2 className="text-lg md:text-xl font-bold">LOT별 상세 정보</h2>
            {selectedItem && (
              <div className="text-xs md:text-sm text-gray-600 mt-1">
                총 재고: {formatNumber(selectedItem.totalQuantity, 0)} (
                {selectedItem.lots.length}개 LOT) | 누적 창고료: ₩{formatNumber(selectedItem.totalAccumulatedWarehouseFee || 0, 0)}
              </div>
            )}
          </div>
          
          {selectedItem ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        LOT 코드
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        입고일
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        입고수량
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        잔량
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        단가
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        누적 창고료
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        현재 단가
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedItem.lots.map((lot) => {
                      const currentUnitCost = lot.quantityRemaining > 0 
                        ? (lot.unitCost * lot.quantityRemaining + lot.accumulatedWarehouseFee) / lot.quantityRemaining
                        : lot.unitCost
                      return (
                        <tr key={lot.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {lot.lotCode || `#${lot.id}`}
                          </td>
                          <td className="px-4 py-3">
                            {new Date(lot.receivedDate).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatNumber(lot.quantityReceived, 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatNumber(lot.quantityRemaining, 0)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            ₩{formatNumber(lot.unitCost, 2)}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-600">
                            ₩{formatNumber(lot.accumulatedWarehouseFee || 0, 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-blue-700">
                            ₩{formatNumber(currentUnitCost, 2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {selectedItem.lots.map((lot) => {
                  const currentUnitCost = lot.quantityRemaining > 0 
                    ? (lot.unitCost * lot.quantityRemaining + lot.accumulatedWarehouseFee) / lot.quantityRemaining
                    : lot.unitCost
                  return (
                    <div key={lot.id} className="p-4">
                      <div className="font-bold text-gray-900 mb-2">
                        {lot.lotCode || `#${lot.id}`}
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">입고일:</span>
                          <span className="text-gray-900">
                            {new Date(lot.receivedDate).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">입고수량:</span>
                          <span className="text-gray-900">{formatNumber(lot.quantityReceived, 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">잔량:</span>
                          <span className="font-bold text-gray-900">{formatNumber(lot.quantityRemaining, 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">단가:</span>
                          <span className="text-gray-900">₩{formatNumber(lot.unitCost, 2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">누적 창고료:</span>
                          <span className="text-orange-600">₩{formatNumber(lot.accumulatedWarehouseFee || 0, 0)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-gray-600 font-medium">현재 단가:</span>
                          <span className="font-bold text-blue-700">₩{formatNumber(currentUnitCost, 2)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="px-4 md:px-6 py-8 text-center text-gray-500 text-sm md:text-base">
              품목을 선택하면 LOT별 상세 정보를 확인할 수 있습니다.
            </div>
          )}
        </div>
      </div>

      {/* 재고 요약 */}
      <div className="mt-4 md:mt-6 bg-white p-4 md:p-6 rounded-lg shadow">
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">재고 요약</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div>
            <div className="text-xs md:text-sm text-gray-600 mb-1">총 품목 수</div>
            <div className="text-2xl md:text-3xl font-bold text-blue-600">
              {inventory.length}개
            </div>
          </div>
          <div>
            <div className="text-xs md:text-sm text-gray-600 mb-1">총 LOT 수</div>
            <div className="text-2xl md:text-3xl font-bold text-green-600">
              {inventory.reduce((sum, item) => sum + item.lotCount, 0)}개
            </div>
          </div>
          <div>
            <div className="text-xs md:text-sm text-gray-600 mb-1">현재 재고 가치 (창고료 포함)</div>
            <div className="text-2xl md:text-3xl font-bold text-purple-600">
              ₩
              {formatNumber(
                inventory.reduce((sum, item) => sum + (item.currentValue || item.totalValue), 0),
                0
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              입고원가: ₩{formatNumber(inventory.reduce((sum, item) => sum + item.totalValue, 0), 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
