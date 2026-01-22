'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface CustomsClearance {
  id: string
  blNumber: string
  blYear: string
  cargoNumber: string | null
  status: string
  declareNumber: string | null
  productName: string | null
  quantity: number | null
  weight: number | null
  arrivalDate: string | null
  declareDate: string | null
  clearanceDate: string | null
  customsDuty: number | null
  vat: number | null
  totalTax: number | null
  shippingCost: number | null
  importId: number | null
  syncedAt: string | null
  createdAt: string
  updatedAt: string
}

export default function CustomsPage() {
  const [clearances, setClearances] = useState<CustomsClearance[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  
  const [searchForm, setSearchForm] = useState({
    blNumber: '',
    blYear: new Date().getFullYear().toString(),
  })

  useEffect(() => {
    fetchClearances()
  }, [statusFilter])

  const fetchClearances = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      
      const res = await fetch(`/api/unipass?${params.toString()}`)
      const data = await res.json()
      setClearances(data)
    } catch (error) {
      console.error('Failed to fetch clearances:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchForm.blNumber || !searchForm.blYear) {
      alert('BL번호와 연도를 입력해주세요.')
      return
    }

    try {
      setSearching(true)
      const res = await fetch(
        `/api/unipass/cargo-progress?blNumber=${encodeURIComponent(
          searchForm.blNumber
        )}&blYear=${encodeURIComponent(searchForm.blYear)}`
      )
      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '조회 중 오류가 발생했습니다.')
        return
      }

      alert(data.message || '조회가 완료되었습니다.')
      await fetchClearances()
    } catch (error) {
      console.error('Search failed:', error)
      alert('조회 중 오류가 발생했습니다.')
    } finally {
      setSearching(false)
    }
  }

  const handleSync = async (clearanceId: string) => {
    if (!confirm('이 통관 건을 수입내역에 연동하시겠습니까?')) {
      return
    }

    try {
      const res = await fetch('/api/unipass/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearanceId }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '동기화 중 오류가 발생했습니다.')
        return
      }

      alert(data.message || '수입내역에 연동되었습니다.')
      await fetchClearances()
    } catch (error) {
      console.error('Sync failed:', error)
      alert('동기화 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 통관 정보를 삭제하시겠습니까?')) {
      return
    }

    try {
      const res = await fetch(`/api/unipass?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        alert('삭제 중 오류가 발생했습니다.')
        return
      }

      await fetchClearances()
    } catch (error) {
      console.error('Delete failed:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string } } = {
      입항: { bg: 'bg-blue-100', text: 'text-blue-800' },
      검사중: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      심사중: { bg: 'bg-orange-100', text: 'text-orange-800' },
      통관완료: { bg: 'bg-green-100', text: 'text-green-800' },
      조회됨: { bg: 'bg-gray-100', text: 'text-gray-800' },
    }

    const style = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800' }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {status}
      </span>
    )
  }

  // 통계 계산
  const stats = {
    total: clearances.length,
    inProgress: clearances.filter((c) => c.status !== '통관완료').length,
    completed: clearances.filter((c) => c.status === '통관완료').length,
    totalTax: clearances.reduce((sum, c) => sum + (c.totalTax || 0), 0),
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">통관 현황</h1>
        <p className="text-gray-600 mt-2">유니패스 API를 통한 수입통관 정보</p>
      </div>

      {/* 검색 영역 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">BL번호로 조회</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={searchForm.blNumber}
            onChange={(e) => setSearchForm({ ...searchForm, blNumber: e.target.value })}
            placeholder="BL번호 입력 (예: ABCD1234567890)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            value={searchForm.blYear}
            onChange={(e) => setSearchForm({ ...searchForm, blYear: e.target.value })}
            placeholder="연도 (YYYY)"
            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
          >
            {searching ? '조회 중...' : '조회'}
          </button>
          <Link
            href="/settings/unipass"
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            설정
          </Link>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">전체 건수</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}건</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">진행중</div>
          <div className="text-2xl font-bold text-blue-600">{stats.inProgress}건</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">통관완료</div>
          <div className="text-2xl font-bold text-green-600">{stats.completed}건</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">총 세금</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalTax)}</div>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setStatusFilter('입항')}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === '입항'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            입항
          </button>
          <button
            onClick={() => setStatusFilter('검사중')}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === '검사중'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            검사중
          </button>
          <button
            onClick={() => setStatusFilter('심사중')}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === '심사중'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            심사중
          </button>
          <button
            onClick={() => setStatusFilter('통관완료')}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === '통관완료'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            통관완료
          </button>
        </div>
      </div>

      {/* 목록 테이블 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">로딩 중...</div>
        ) : clearances.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            조회된 통관 정보가 없습니다. 위에서 BL번호로 조회해보세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    BL번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    품명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    입항일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    통관완료일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    세금
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    연동
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clearances.map((clearance) => (
                  <tr key={clearance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {clearance.blNumber}
                      </div>
                      <div className="text-xs text-gray-500">{clearance.blYear}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {clearance.productName || '-'}
                      </div>
                      {clearance.weight && (
                        <div className="text-xs text-gray-500">{clearance.weight}kg</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(clearance.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {clearance.arrivalDate
                        ? new Date(clearance.arrivalDate).toLocaleDateString('ko-KR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {clearance.clearanceDate
                        ? new Date(clearance.clearanceDate).toLocaleDateString('ko-KR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {clearance.totalTax ? formatCurrency(clearance.totalTax) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {clearance.importId ? (
                        <Link
                          href={`/import-export/${clearance.importId}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          연동됨
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleSync(clearance.id)}
                          disabled={clearance.status !== '통관완료'}
                          className="text-green-600 hover:text-green-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          연동하기
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDelete(clearance.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
