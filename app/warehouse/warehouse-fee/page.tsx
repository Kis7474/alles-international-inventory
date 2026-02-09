'use client'

import { useEffect, useState } from 'react'
import { formatNumber, formatMonth } from '@/lib/utils'

interface WarehouseFeeDistribution {
  id: number
  distributedFee: number
  quantityAtTime: number
  storageDays: number
  lot: {
    id: number
    lotCode: string | null
    product: {
      name: string
      code: string | null
    } | null
  }
}

interface WarehouseFee {
  id: number
  yearMonth: string
  totalFee: number
  distributedAt: string | null
  memo: string | null
  createdAt: string
  lotCount?: number
  distributions: WarehouseFeeDistribution[]
}

export default function WarehouseFeePage() {
  const [fees, setFees] = useState<WarehouseFee[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingFee, setEditingFee] = useState<WarehouseFee | null>(null)
  const [selectedFee, setSelectedFee] = useState<WarehouseFee | null>(null)
  const [formData, setFormData] = useState({
    yearMonth: formatMonth(new Date()),
    totalFee: '',
    memo: '',
  })

  useEffect(() => {
    fetchFees()
  }, [])

  const fetchFees = async () => {
    try {
      const res = await fetch('/api/warehouse-fee')
      const data = await res.json()
      setFees(data)
    } catch (error) {
      console.error('Error fetching fees:', error)
      alert('창고료 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingFee) {
        // 수정 - yearMonth는 수정 불가이므로 editingFee에서 가져옴
        const res = await fetch('/api/warehouse-fee', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            yearMonth: editingFee.yearMonth,
            action: 'update',
            totalFee: parseFloat(formData.totalFee),
            memo: formData.memo || null,
          }),
        })

        const result = await res.json()

        if (!res.ok) {
          alert(result.error || '수정 중 오류가 발생했습니다.')
          return
        }

        alert('창고료가 수정되었습니다.')
      } else {
        // 등록
        const res = await fetch('/api/warehouse-fee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            yearMonth: formData.yearMonth,
            totalFee: parseFloat(formData.totalFee),
            memo: formData.memo || null,
          }),
        })

        const result = await res.json()

        if (!res.ok) {
          alert(result.error || '등록 중 오류가 발생했습니다.')
          return
        }

        alert('창고료가 등록되었습니다.')
      }

      setShowForm(false)
      setEditingFee(null)
      setFormData({
        yearMonth: formatMonth(new Date()),
        totalFee: '',
        memo: '',
      })
      fetchFees()
    } catch (error) {
      console.error('Error saving fee:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (fee: WarehouseFee) => {
    setEditingFee(fee)
    setFormData({
      yearMonth: fee.yearMonth,
      totalFee: fee.totalFee.toString(),
      memo: fee.memo || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (yearMonth: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/warehouse-fee?yearMonth=${yearMonth}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
        return
      }

      alert('창고료가 삭제되었습니다.')
      fetchFees()
      if (selectedFee?.yearMonth === yearMonth) {
        setSelectedFee(null)
      }
    } catch (error) {
      console.error('Error deleting fee:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleDistribute = async (yearMonth: string) => {
    if (!confirm('창고료를 배분하시겠습니까? 배분 후에는 수정/삭제할 수 없습니다.')) return

    try {
      const res = await fetch('/api/warehouse-fee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearMonth,
          action: 'distribute',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '배분 중 오류가 발생했습니다.')
        return
      }

      alert('창고료가 배분되었습니다.')
      fetchFees()
    } catch (error) {
      console.error('Error distributing fee:', error)
      alert('배분 중 오류가 발생했습니다.')
    }
  }

  const handleCancelDistribution = async (yearMonth: string) => {
    if (!confirm('배분을 취소하시겠습니까? 이미 출고된 항목의 원가에는 영향을 줄 수 있습니다.')) return

    try {
      const res = await fetch('/api/warehouse-fee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearMonth,
          action: 'cancel-distribution',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '배분 취소 중 오류가 발생했습니다.')
        return
      }

      alert('배분이 취소되었습니다.')
      setSelectedFee(null)
      fetchFees()
    } catch (error) {
      console.error('Error canceling distribution:', error)
      alert('배분 취소 중 오류가 발생했습니다.')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingFee(null)
    setFormData({
      yearMonth: formatMonth(new Date()),
      totalFee: '',
      memo: '',
    })
  }

  const handleViewDetails = (fee: WarehouseFee) => {
    setSelectedFee(fee)
  }

  if (loading) {
    return <div>로딩 중...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">창고료 관리</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 창고료 등록
        </button>
      </div>

      {/* 창고료 등록/수정 폼 */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingFee ? '창고료 수정' : '창고료 등록'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  년월 (YYYY-MM) *
                </label>
                <input
                  type="text"
                  required
                  pattern="\d{4}-\d{2}"
                  value={formData.yearMonth}
                  onChange={(e) =>
                    setFormData({ ...formData, yearMonth: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="2026-02"
                  disabled={!!editingFee}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  총 창고료 (₩) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.totalFee}
                  onChange={(e) =>
                    setFormData({ ...formData, totalFee: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">메모</label>
                <textarea
                  value={formData.memo}
                  onChange={(e) =>
                    setFormData({ ...formData, memo: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-800">
                💡 창고료는 LOT별로 배분되어 재고 원가에 반영됩니다.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                저장
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 창고료 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                년월
              </th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                총 창고료
              </th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">
                배분 상태
              </th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">
                배분 LOT 수
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                등록일
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                메모
              </th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {fees.map((fee) => (
              <tr key={fee.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{fee.yearMonth}</td>
                <td className="px-6 py-4 text-right font-medium">
                  ₩{formatNumber(fee.totalFee, 0)}
                </td>
                <td className="px-6 py-4 text-center">
                  {fee.distributedAt ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                      배분 완료
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                      미배분
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {fee.lotCount || 0}
                </td>
                <td className="px-6 py-4">
                  {new Date(fee.createdAt).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-6 py-4">{fee.memo || '-'}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2">
                    {fee.distributedAt ? (
                      <>
                        <button
                          onClick={() => handleViewDetails(fee)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          배분 내역
                        </button>
                        <button
                          onClick={() => handleCancelDistribution(fee.yearMonth)}
                          className="text-orange-600 hover:text-orange-800 text-sm"
                        >
                          배분 취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleDistribute(fee.yearMonth)}
                          className="text-green-600 hover:text-green-800 text-sm font-semibold"
                        >
                          배분 실행
                        </button>
                        <button
                          onClick={() => handleEdit(fee)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(fee.yearMonth)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {fees.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  등록된 창고료가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 배분 내역 상세 */}
      {selectedFee && selectedFee.distributedAt && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              배분 내역 상세 ({selectedFee.yearMonth})
            </h2>
            <button
              onClick={() => setSelectedFee(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕ 닫기
            </button>
          </div>

          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">총 창고료</div>
                <div className="text-lg font-bold">
                  ₩{formatNumber(selectedFee.totalFee, 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">배분 LOT 수</div>
                <div className="text-lg font-bold">
                  {selectedFee.distributions.length}개
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">배분 완료 일시</div>
                <div className="text-lg font-bold">
                  {new Date(selectedFee.distributedAt).toLocaleString('ko-KR')}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    LOT 코드
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    품목명
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    품목코드
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    배분 시점 수량
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    보관일수
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    배분 금액
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    배분비율
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    단위당 배분액
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selectedFee.distributions.map((dist) => (
                  <tr key={dist.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {dist.lot.lotCode || `LOT-${dist.lot.id}`}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {dist.lot.product?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {dist.lot.product?.code || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatNumber(dist.quantityAtTime, 2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {dist.storageDays}일
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      ₩{formatNumber(dist.distributedFee, 2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatNumber((dist.distributedFee / selectedFee.totalFee) * 100, 1)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      ₩{formatNumber(
                        dist.quantityAtTime > 0 
                          ? dist.distributedFee / dist.quantityAtTime 
                          : 0, 
                        2
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm text-right">
                    합계
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {formatNumber(
                      selectedFee.distributions.reduce(
                        (sum, dist) => sum + dist.quantityAtTime,
                        0
                      ),
                      2
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    -
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    ₩{formatNumber(
                      selectedFee.distributions.reduce(
                        (sum, dist) => sum + dist.distributedFee,
                        0
                      ),
                      2
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    100%
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
