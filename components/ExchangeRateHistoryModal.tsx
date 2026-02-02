'use client'

import { useState, useEffect } from 'react'

interface ExchangeRate {
  id: number
  date: string
  currency: string
  rate: number
  source: string | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  currency: string
  onRateDeleted?: () => void
}

export default function ExchangeRateHistoryModal({ isOpen, onClose, currency, onRateDeleted }: Props) {
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 20
  
  useEffect(() => {
    if (isOpen && currency) {
      fetchRates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currency, page, startDate, endDate])
  
  const fetchRates = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        currency,
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const res = await fetch(`/api/exchange-rates/history?${params}`)
      const data = await res.json()
      setRates(data.rates || [])
      setTotalPages(Math.ceil((data.total || 0) / pageSize))
    } catch (error) {
      console.error('Error fetching rates:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSearch = () => {
    setPage(1)
    // fetchRates will be called by useEffect when startDate/endDate change
  }
  
  const handleReset = () => {
    setStartDate('')
    setEndDate('')
    setPage(1)
    // fetchRates will be called by useEffect when startDate/endDate change
  }
  
  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    
    try {
      const res = await fetch(`/api/exchange-rates?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchRates()
        onRateDeleted?.()
      } else {
        alert('삭제 중 오류가 발생했습니다.')
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }
  
  if (!isOpen) return null
  
  const currencyNames: Record<string, string> = {
    USD: '미국 달러',
    EUR: '유로',
    JPY: '일본 엔',
    CNY: '중국 위안',
    GBP: '영국 파운드',
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {currency} ({currencyNames[currency] || currency}) 환율 이력
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            ×
          </button>
        </div>
        
        {/* 검색 필터 */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              검색
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              초기화
            </button>
          </div>
        </div>
        
        {/* 테이블 */}
        <div className="overflow-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
          {loading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : rates.length === 0 ? (
            <div className="p-8 text-center text-gray-500">데이터가 없습니다.</div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">날짜</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">환율</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">출처</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(rate.date).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-mono">
                      ₩{rate.rate.toLocaleString('ko-KR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {rate.source || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <button
                        onClick={() => handleDelete(rate.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50 text-gray-700"
            >
              이전
            </button>
            <span className="px-4 py-1 text-gray-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50 text-gray-700"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
