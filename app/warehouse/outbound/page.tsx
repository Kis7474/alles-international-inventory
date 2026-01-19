'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'

interface Item {
  id: number
  code: string
  name: string
  unit: string
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
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [deletingMovementId, setDeletingMovementId] = useState<number | null>(null)
  const [outboundResult, setOutboundResult] = useState<{
    totalQuantity: number
    totalCost: number
    details: OutboundDetail[]
  } | null>(null)
  const [formData, setFormData] = useState({
    itemId: '',
    quantity: '',
    outboundDate: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    fetchData()
  }, [])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      itemId: parseInt(formData.itemId),
      quantity: parseFloat(formData.quantity),
      outboundDate: formData.outboundDate,
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
        itemId: '',
        quantity: '',
        outboundDate: new Date().toISOString().split('T')[0],
      })
      fetchData()
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
    } catch (error) {
      console.error('Error deleting outbound record:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return <div>로딩 중...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">출고 관리</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 출고 등록
        </button>
      </div>

      {/* 출고 등록 폼 */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">출고 등록</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  className="w-full px-3 py-2 border rounded-lg"
                />
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
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-yellow-800">
                💡 FIFO(선입선출) 방식으로 가장 오래된 LOT부터 자동으로 출고됩니다.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                출고 처리
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
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold">출고 이력</h2>
        </div>
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
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
                  colSpan={7}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  출고 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
