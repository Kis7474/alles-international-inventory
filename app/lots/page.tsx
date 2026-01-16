'use client'

import { useEffect, useState } from 'react'
import { formatNumber, calculateUnitCost } from '@/lib/utils'

interface Item {
  id: number
  code: string
  name: string
  unit: string
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
  item: Item
}

export default function LotsPage() {
  const [lots, setLots] = useState<Lot[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    itemId: '',
    lotCode: '',
    receivedDate: new Date().toISOString().split('T')[0],
    quantityReceived: '',
    goodsAmount: '',
    dutyAmount: '',
    domesticFreight: '',
    otherCost: '0',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [lotsRes, itemsRes] = await Promise.all([
        fetch('/api/lots'),
        fetch('/api/items'),
      ])
      const [lotsData, itemsData] = await Promise.all([
        lotsRes.json(),
        itemsRes.json(),
      ])
      setLots(lotsData)
      setItems(itemsData)
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('데이터 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      itemId: parseInt(formData.itemId),
      lotCode: formData.lotCode || null,
      receivedDate: formData.receivedDate,
      quantityReceived: parseFloat(formData.quantityReceived),
      goodsAmount: parseFloat(formData.goodsAmount) || 0,
      dutyAmount: parseFloat(formData.dutyAmount) || 0,
      domesticFreight: parseFloat(formData.domesticFreight) || 0,
      otherCost: parseFloat(formData.otherCost) || 0,
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

      alert('입고가 등록되었습니다.')
      setShowForm(false)
      setFormData({
        itemId: '',
        lotCode: '',
        receivedDate: new Date().toISOString().split('T')[0],
        quantityReceived: '',
        goodsAmount: '',
        dutyAmount: '',
        domesticFreight: '',
        otherCost: '0',
      })
      fetchData()
    } catch (error) {
      console.error('Error saving lot:', error)
      alert('입고 등록 중 오류가 발생했습니다.')
    }
  }

  // 단가 미리보기 계산
  const previewUnitCost = calculateUnitCost(
    parseFloat(formData.goodsAmount) || 0,
    parseFloat(formData.dutyAmount) || 0,
    parseFloat(formData.domesticFreight) || 0,
    parseFloat(formData.otherCost) || 0,
    parseFloat(formData.quantityReceived) || 1
  )

  if (loading) {
    return <div>로딩 중...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">입고 관리</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 입고 등록
        </button>
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
                  value={formData.itemId}
                  onChange={(e) =>
                    setFormData({ ...formData, itemId: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">품목을 선택하세요</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      [{item.code}] {item.name}
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
                  placeholder="BL번호, 참조번호 등"
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
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                품목
              </th>
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
                총액
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {lots.map((lot) => (
              <tr key={lot.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  [{lot.item.code}] {lot.item.name}
                </td>
                <td className="px-4 py-4">{lot.lotCode || '-'}</td>
                <td className="px-4 py-4">
                  {new Date(lot.receivedDate).toLocaleDateString('ko-KR')}
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
                  ₩{formatNumber(lot.quantityRemaining * lot.unitCost, 0)}
                </td>
              </tr>
            ))}
            {lots.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  등록된 입고 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
