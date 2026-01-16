'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'

interface InventoryItem {
  id: number
  code: string
  name: string
  unit: string
  totalQuantity: number
  avgUnitCost: number
  totalValue: number
  lotCount: number
}

interface Movement {
  id: number
  movementDate: string
  type: string
  quantity: number
  unitCost: number
  totalCost: number
  item: {
    code: string
    name: string
  }
}

export default function Home() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [recentMovements, setRecentMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // 재고 현황 조회
      const invRes = await fetch('/api/inventory')
      const invData = await invRes.json()
      setInventory(invData)

      // 최근 입출고 내역 조회 (출고 이력)
      const outRes = await fetch('/api/outbound')
      const outData = await outRes.json()
      setRecentMovements(outData.slice(0, 5))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0)
  const totalItems = inventory.length
  const totalLots = inventory.reduce((sum, item) => sum + item.lotCount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">로딩 중...</div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">대시보드</h1>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm mb-2">총 재고 가치</div>
          <div className="text-3xl font-bold text-blue-600">
            ₩{formatNumber(totalValue, 0)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm mb-2">전체 품목 수</div>
          <div className="text-3xl font-bold text-green-600">
            {totalItems}개
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm mb-2">활성 LOT 수</div>
          <div className="text-3xl font-bold text-purple-600">
            {totalLots}개
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 재고 현황 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">재고 현황</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2">품목코드</th>
                  <th className="text-left py-2">품목명</th>
                  <th className="text-right py-2">재고</th>
                  <th className="text-right py-2">평균단가</th>
                </tr>
              </thead>
              <tbody>
                {inventory.slice(0, 5).map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.code}</td>
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-right">
                      {formatNumber(item.totalQuantity, 0)} {item.unit}
                    </td>
                    <td className="py-2 text-right">
                      ₩{formatNumber(item.avgUnitCost, 2)}
                    </td>
                  </tr>
                ))}
                {inventory.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">
                      재고가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 최근 출고 내역 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">최근 출고 내역</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2">날짜</th>
                  <th className="text-left py-2">품목</th>
                  <th className="text-right py-2">수량</th>
                  <th className="text-right py-2">금액</th>
                </tr>
              </thead>
              <tbody>
                {recentMovements.map((movement) => (
                  <tr key={movement.id} className="border-b">
                    <td className="py-2">
                      {new Date(movement.movementDate).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-2">{movement.item.name}</td>
                    <td className="py-2 text-right">
                      {formatNumber(movement.quantity, 0)}
                    </td>
                    <td className="py-2 text-right">
                      ₩{formatNumber(movement.totalCost, 0)}
                    </td>
                  </tr>
                ))}
                {recentMovements.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">
                      출고 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
