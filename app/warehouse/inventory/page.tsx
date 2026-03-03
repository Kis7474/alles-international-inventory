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
  currentCost: number | null
  totalQuantity: number
  avgUnitCost: number
  avgUnitCostWithoutStorage: number
  allocatedStorageExpense: number
  totalValue: number
  totalValueWithStorage: number
  lotCount: number
  storageExpensePerUnit?: number
  totalStorageExpense?: number
  latestDistributedPeriod?: string | null
}

interface Lot {
  id: number
  lotCode: string | null
  receivedDate: string
  quantityReceived: number
  quantityRemaining: number
  unitCost: number
  warehouseFee: number | null
  storageLocation: string
}

interface ItemDetail {
  productId: number
  totalQuantity: number
  lots: Lot[]
}

// 창고료 포함 실질 단가 계산 헬퍼 함수
function calculateActualUnitCost(lot: Lot): number {
  return lot.quantityRemaining > 0 
    ? lot.unitCost + (lot.warehouseFee || 0) / lot.quantityRemaining 
    : lot.unitCost
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
      
      const res = await fetch(`/api/inventory?${params.toString()}`, { cache: 'no-store' })
      const response = await res.json()
      
      // 방어적 코딩: 배열이면 그대로, 객체면 data 속성 사용
      let inventoryData: InventoryItem[] = []
      if (Array.isArray(response)) {
        inventoryData = response
      } else if (response.data && Array.isArray(response.data)) {
        inventoryData = response.data
      }
      // response가 에러 객체 { error: ... }인 경우 빈 배열로 유지
      
      setInventory(inventoryData)
    } catch (error) {
      console.error('Error fetching inventory:', error)
      alert('재고 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleItemClick = async (productId: number) => {
    try {
      const res = await fetch(`/api/inventory?productId=${productId}`, { cache: 'no-store' })
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
      {inventory.length > 0 && inventory[0].totalStorageExpense !== undefined && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-bold text-orange-900 mb-2">💰 창고료 정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <p className="text-xs md:text-sm text-orange-700">
                {inventory[0].latestDistributedPeriod 
                  ? `최근 배분 (${inventory[0].latestDistributedPeriod})` 
                  : '창고료 배분 대기'}
              </p>
              <p className="text-xl md:text-2xl font-bold text-orange-900">
                ₩{formatNumber(inventory[0].totalStorageExpense || 0, 0)}
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-orange-700">단위당 배분 창고료</p>
              <p className="text-xl md:text-2xl font-bold text-orange-900">
                ₩{formatNumber(inventory[0].storageExpensePerUnit || 0, 2)}
              </p>
            </div>
          </div>
          <p className="text-xs text-orange-600 mt-2">
            * 창고료는 재고 수량에 비례하여 각 품목에 배분됩니다.
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
          <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
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
                  <th className="px-4 py-3 text-right text-sm font-bold text-blue-700 bg-blue-50">
                    현재 원가<br />(Product.currentCost)
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    평균단가<br />(창고료 포함)
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    평균단가<br />(창고료 미포함)
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    배분 창고료
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    재고가치<br />(창고료 포함)
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
                    <td className="px-4 py-3 text-right font-bold text-blue-700 bg-blue-50">
                      {item.currentCost !== null ? `₩${formatNumber(item.currentCost, 2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-blue-700">
                      ₩{formatNumber(item.avgUnitCost, 2)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 text-sm">
                      ₩{formatNumber(item.avgUnitCostWithoutStorage, 2)}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-600 text-sm">
                      ₩{formatNumber(item.allocatedStorageExpense, 2)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      ₩{formatNumber(item.totalValueWithStorage, 0)}
                    </td>
                  </tr>
                ))}
                {inventory.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
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
                  <div className="flex justify-between items-center pt-2 border-t bg-blue-50 -mx-4 px-4 py-2">
                    <span className="text-gray-700 font-bold">현재 원가:</span>
                    <span className="font-bold text-blue-700">
                      {item.currentCost !== null ? `₩${formatNumber(item.currentCost, 2)}` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-gray-600">평균단가:</span>
                    <span className="font-bold text-blue-700">₩{formatNumber(item.avgUnitCost, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-xs">창고료 미포함:</span>
                    <span className="text-gray-500 text-xs">₩{formatNumber(item.avgUnitCostWithoutStorage, 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-xs">배분 창고료:</span>
                    <span className="text-orange-600 text-xs">₩{formatNumber(item.allocatedStorageExpense, 2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-gray-600 font-medium">재고가치:</span>
                    <span className="font-bold text-gray-900">₩{formatNumber(item.totalValueWithStorage, 0)}</span>
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
                {selectedItem.lots.length}개 LOT)
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
                        창고료
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-blue-700">
                        실질 단가
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedItem.lots.map((lot) => (
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
                          ₩{formatNumber(lot.warehouseFee || 0, 2)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">
                          ₩{formatNumber(calculateActualUnitCost(lot), 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {selectedItem.lots.map((lot) => (
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
                        <span className="text-gray-600">창고료:</span>
                        <span className="text-orange-600">₩{formatNumber(lot.warehouseFee || 0, 2)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-700 font-bold">실질 단가:</span>
                        <span className="font-bold text-blue-700">
                          ₩{formatNumber(calculateActualUnitCost(lot), 2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
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
            <div className="text-xs md:text-sm text-gray-600 mb-1">총 재고 가치 (창고료 포함)</div>
            <div className="text-2xl md:text-3xl font-bold text-purple-600">
              ₩
              {formatNumber(
                inventory.reduce((sum, item) => sum + item.totalValueWithStorage, 0),
                0
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
