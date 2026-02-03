'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'

interface WarehouseFeeDistribution {
  id: number
  distributedFee: number
  quantityAtTime: number
  valueAtTime: number
  valueRatio: number
  lot: {
    id: number
    lotCode: string | null
    product: {
      code: string | null
      name: string
      unit: string
    } | null
  }
}

interface WarehouseFee {
  id: number
  yearMonth: string
  totalFee: number
  distributedAt: string | null
  totalValueAtDistribution: number | null
  lotCountAtDistribution: number | null
  memo: string | null
  createdAt: string
  updatedAt: string
  lotCount?: number
  distributions: WarehouseFeeDistribution[]
}

export default function WarehouseFeesPage() {
  const [fees, setFees] = useState<WarehouseFee[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedFee, setSelectedFee] = useState<WarehouseFee | null>(null)
  
  const [formData, setFormData] = useState({
    yearMonth: new Date().toISOString().slice(0, 7), // YYYY-MM 형식
    totalFee: '',
    memo: '',
  })

  useEffect(() => {
    fetchFees()
  }, [])

  const fetchFees = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/warehouse-fee')
      if (!res.ok) throw new Error('Failed to fetch fees')
      const data = await res.json()
      setFees(data)
    } catch (error) {
      console.error('Error fetching fees:', error)
      alert('창고료 목록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.yearMonth || !formData.totalFee) {
      alert('년월과 총 창고료를 입력해주세요.')
      return
    }
    
    try {
      setSubmitting(true)
      const res = await fetch('/api/warehouse-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearMonth: formData.yearMonth,
          totalFee: parseFloat(formData.totalFee),
          memo: formData.memo || null,
        }),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '등록 실패')
      }
      
      alert('창고료가 등록되었습니다.')
      setShowForm(false)
      setFormData({
        yearMonth: new Date().toISOString().slice(0, 7),
        totalFee: '',
        memo: '',
      })
      fetchFees()
    } catch (error) {
      console.error('Error creating fee:', error)
      alert(error instanceof Error ? error.message : '창고료 등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDistribute = async (yearMonth: string) => {
    if (!confirm('창고료를 배분하시겠습니까? 배분 후에는 수정이나 삭제가 불가능합니다.')) {
      return
    }
    
    try {
      setSubmitting(true)
      const res = await fetch('/api/warehouse-fee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearMonth,
          action: 'distribute',
        }),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '배분 실패')
      }
      
      alert('창고료가 배분되었습니다.')
      fetchFees()
    } catch (error) {
      console.error('Error distributing fee:', error)
      alert(error instanceof Error ? error.message : '창고료 배분 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (yearMonth: string) => {
    if (!confirm('창고료를 삭제하시겠습니까?')) {
      return
    }
    
    try {
      setSubmitting(true)
      const res = await fetch(`/api/warehouse-fee?yearMonth=${yearMonth}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '삭제 실패')
      }
      
      alert('창고료가 삭제되었습니다.')
      fetchFees()
    } catch (error) {
      console.error('Error deleting fee:', error)
      alert(error instanceof Error ? error.message : '창고료 삭제 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleViewDetails = (fee: WarehouseFee) => {
    setSelectedFee(fee)
  }

  // Group fees by year
  const feesByYear = fees.reduce((acc, fee) => {
    const year = fee.yearMonth.split('-')[0]
    if (!acc[year]) {
      acc[year] = []
    }
    acc[year].push(fee)
    return acc
  }, {} as Record<string, WarehouseFee[]>)

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">창고료 관리</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            + 창고료 등록
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">창고료 등록</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    년월 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="month"
                    value={formData.yearMonth}
                    onChange={(e) => setFormData({ ...formData, yearMonth: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    총 창고료 (원) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.totalFee}
                    onChange={(e) => setFormData({ ...formData, totalFee: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="500000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    메모
                  </label>
                  <input
                    type="text"
                    value={formData.memo}
                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="메모 (선택)"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({
                      yearMonth: new Date().toISOString().slice(0, 7),
                      totalFee: '',
                      memo: '',
                    })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:bg-gray-400"
                >
                  {submitting ? '등록 중...' : '등록'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Fee List by Year */}
        {Object.keys(feesByYear).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            등록된 창고료가 없습니다.
          </div>
        ) : (
          Object.keys(feesByYear)
            .sort()
            .reverse()
            .map((year) => (
              <div key={year} className="bg-white rounded-lg shadow mb-6">
                <div className="bg-gray-50 px-6 py-3 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">{year}년</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">년월</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">총 창고료</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">LOT 수</th>
                        <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">배분상태</th>
                        <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feesByYear[year].map((fee) => (
                        <tr key={fee.id} className="border-b hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">{fee.yearMonth}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right font-semibold">
                            ₩{formatNumber(fee.totalFee, 0)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            {fee.lotCount || 0}개
                          </td>
                          <td className="px-6 py-4 text-center">
                            {fee.distributedAt ? (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                배분완료
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                미배분
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              {!fee.distributedAt ? (
                                <>
                                  <button
                                    onClick={() => handleDistribute(fee.yearMonth)}
                                    disabled={submitting}
                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:text-gray-400"
                                  >
                                    배분하기
                                  </button>
                                  <button
                                    onClick={() => handleDelete(fee.yearMonth)}
                                    disabled={submitting}
                                    className="text-red-600 hover:text-red-800 font-medium text-sm disabled:text-gray-400"
                                  >
                                    삭제
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleViewDetails(fee)}
                                  className="text-green-600 hover:text-green-800 font-medium text-sm"
                                >
                                  상세보기
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
        )}

        {/* Distribution Details Modal */}
        {selectedFee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  배분 상세 ({selectedFee.yearMonth})
                </h2>
                <button
                  onClick={() => setSelectedFee(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    총 창고료: <span className="font-semibold text-gray-900">₩{formatNumber(selectedFee.totalFee, 0)}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    배분 일시: <span className="font-semibold text-gray-900">
                      {selectedFee.distributedAt ? new Date(selectedFee.distributedAt).toLocaleString('ko-KR') : '-'}
                    </span>
                  </p>
                  {selectedFee.totalValueAtDistribution && (
                    <p className="text-sm text-gray-600">
                      배분 시점 총 재고가치: <span className="font-semibold text-gray-900">₩{formatNumber(selectedFee.totalValueAtDistribution, 0)}</span>
                    </p>
                  )}
                  {selectedFee.lotCountAtDistribution && (
                    <p className="text-sm text-gray-600">
                      배분 시점 LOT 수: <span className="font-semibold text-gray-900">{selectedFee.lotCountAtDistribution}개</span>
                    </p>
                  )}
                  {selectedFee.memo && (
                    <p className="text-sm text-gray-600">
                      메모: <span className="font-semibold text-gray-900">{selectedFee.memo}</span>
                    </p>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">LOT 코드</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">품목</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">배분잔량</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">단가</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">가치</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">가치비율</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">배분 창고료</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFee.distributions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                            배분 내역이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        selectedFee.distributions.map((dist) => {
                          // valueRatio가 있으면 사용, 없으면 계산
                          const ratio = dist.valueRatio || 0
                          // valueAtTime이 있으면 사용, 없으면 계산
                          const value = dist.valueAtTime || 0
                          // 단가 계산
                          const unitCost = dist.quantityAtTime > 0 ? value / dist.quantityAtTime : 0
                          
                          return (
                            <tr key={dist.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm text-gray-900">{dist.lot.lotCode || '-'}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {dist.lot.product ? `[${dist.lot.product.code || '-'}] ${dist.lot.product.name}` : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                {formatNumber(dist.quantityAtTime, 0)} {dist.lot.product?.unit || ''}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                ₩{formatNumber(unitCost, 0)}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                ₩{formatNumber(value, 0)}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                {ratio.toFixed(1)}%
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">
                                ₩{formatNumber(dist.distributedFee, 0)}
                              </td>
                            </tr>
                          )
                        })
                      )}
                      {selectedFee.distributions.length > 0 && (
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={2} className="px-4 py-2 text-sm text-gray-900 text-right">합계:</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {formatNumber(selectedFee.distributions.reduce((sum, d) => sum + d.quantityAtTime, 0), 0)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">-</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            ₩{formatNumber(selectedFee.distributions.reduce((sum, d) => sum + (d.valueAtTime || 0), 0), 0)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">100%</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            ₩{formatNumber(selectedFee.distributions.reduce((sum, d) => sum + d.distributedFee, 0), 0)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
