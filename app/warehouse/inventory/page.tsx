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
  lotCount: number
}

interface Lot {
  id: number
  lotCode: string | null
  receivedDate: string
  quantityReceived: number
  quantityRemaining: number
  unitCost: number
}

interface ItemDetail {
  productId: number
  totalQuantity: number
  lots: Lot[]
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ItemDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/inventory')
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
      <h1 className="text-3xl font-bold mb-6">재고 조회</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 품목별 재고 현황 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold">품목별 재고 현황</h2>
          </div>
          <div className="overflow-x-auto">
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
                    재고가치
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
                      <div className="font-medium">{item.productName}</div>
                      {item.productCode && <div className="text-sm text-gray-600">[{item.productCode}]</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.purchaseVendor || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.category || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatNumber(item.totalQuantity, 0)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      ₩{formatNumber(item.avgUnitCost, 2)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      ₩{formatNumber(item.totalValue, 0)}
                    </td>
                  </tr>
                ))}
                {inventory.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      재고가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* LOT별 상세 정보 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold">LOT별 상세 정보</h2>
            {selectedItem && (
              <div className="text-sm text-gray-600 mt-1">
                총 재고: {formatNumber(selectedItem.totalQuantity, 0)} (
                {selectedItem.lots.length}개 LOT)
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            {selectedItem ? (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                품목을 선택하면 LOT별 상세 정보를 확인할 수 있습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 재고 요약 */}
      <div className="mt-6 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">재고 요약</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-1">총 품목 수</div>
            <div className="text-3xl font-bold text-blue-600">
              {inventory.length}개
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">총 LOT 수</div>
            <div className="text-3xl font-bold text-green-600">
              {inventory.reduce((sum, item) => sum + item.lotCount, 0)}개
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">총 재고 가치</div>
            <div className="text-3xl font-bold text-purple-600">
              ₩
              {formatNumber(
                inventory.reduce((sum, item) => sum + item.totalValue, 0),
                0
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
