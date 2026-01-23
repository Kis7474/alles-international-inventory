'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface CustomsTracking {
  id: string
  registrationType: string
  blType: string | null
  blNumber: string | null
  blYear: string | null
  declarationNumber: string | null
  cargoNumber: string | null
  status: string | null
  productName: string | null
  quantity: number | null
  weight: number | null
  arrivalDate: string | null
  declarationDate: string | null
  clearanceDate: string | null
  customsDuty: number | null
  vat: number | null
  totalTax: number | null
  importId: number | null
  linkedAt: string | null
  lastSyncAt: string | null
  syncCount: number
  createdAt: string
  updatedAt: string
}

export default function CustomsTrackingPage() {
  const [trackings, setTrackings] = useState<CustomsTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  
  const [showForm, setShowForm] = useState(false)
  const [registrationType, setRegistrationType] = useState<'BL' | 'DECLARATION'>('BL')
  const [formData, setFormData] = useState({
    blType: 'MBL' as 'MBL' | 'HBL',
    blNumber: '',
    blYear: new Date().getFullYear().toString(),
    declarationNumber: '',
  })

  useEffect(() => {
    fetchTrackings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const fetchTrackings = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      
      const res = await fetch(`/api/customs/tracking?${params.toString()}`)
      const data = await res.json()
      setTrackings(data)
    } catch (error) {
      console.error('Failed to fetch trackings:', error)
      alert('통관 추적 정보 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (registrationType === 'BL') {
      if (!formData.blNumber || !formData.blYear) {
        alert('BL번호와 입항년도를 입력해주세요.')
        return
      }
    } else {
      if (!formData.declarationNumber) {
        alert('수입신고번호를 입력해주세요.')
        return
      }
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/customs/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationType,
          ...formData,
        }),
      })
      
      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '등록 중 오류가 발생했습니다.')
        return
      }

      alert(data.message || '통관 정보가 등록되었습니다.')
      setShowForm(false)
      setFormData({
        blType: 'MBL',
        blNumber: '',
        blYear: new Date().getFullYear().toString(),
        declarationNumber: '',
      })
      await fetchTrackings()
    } catch (error) {
      console.error('Submit failed:', error)
      alert('등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSync = async (id: string) => {
    if (!confirm('이 통관 건을 동기화하시겠습니까?')) {
      return
    }

    try {
      const res = await fetch(`/api/customs/tracking/${id}/sync`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '동기화 중 오류가 발생했습니다.')
        return
      }

      alert(data.message || '동기화가 완료되었습니다.')
      await fetchTrackings()
    } catch (error) {
      console.error('Sync failed:', error)
      alert('동기화 중 오류가 발생했습니다.')
    }
  }

  const handleSyncAll = async () => {
    if (!confirm('모든 통관 건을 동기화하시겠습니까?')) {
      return
    }

    try {
      const res = await fetch('/api/customs/tracking/sync-all', {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '전체 동기화 중 오류가 발생했습니다.')
        return
      }

      alert(data.message || '전체 동기화가 완료되었습니다.')
      await fetchTrackings()
    } catch (error) {
      console.error('Sync all failed:', error)
      alert('전체 동기화 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 통관 정보를 삭제하시겠습니까?')) {
      return
    }

    try {
      const res = await fetch(`/api/customs/tracking/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        alert('삭제 중 오류가 발생했습니다.')
        return
      }

      await fetchTrackings()
    } catch (error) {
      console.error('Delete failed:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return <span className="text-gray-400">-</span>
    
    const statusMap: { [key: string]: { bg: string; text: string } } = {
      입항: { bg: 'bg-blue-100', text: 'text-blue-800' },
      검사중: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      심사중: { bg: 'bg-orange-100', text: 'text-orange-800' },
      통관완료: { bg: 'bg-green-100', text: 'text-green-800' },
      수입신고수리: { bg: 'bg-green-100', text: 'text-green-800' },
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
    total: trackings.length,
    inProgress: trackings.filter((t) => t.status && t.status !== '통관완료' && t.status !== '수입신고수리').length,
    completed: trackings.filter((t) => t.status === '통관완료' || t.status === '수입신고수리').length,
    linked: trackings.filter((t) => t.importId).length,
    totalTax: trackings.reduce((sum, t) => sum + (t.totalTax || 0), 0),
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">통관 추적</h1>
        <p className="text-gray-600 mt-2">유니패스 API를 통한 통관 정보 추적 및 관리</p>
      </div>

      {/* 등록 폼 */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">통관 추적 등록</h2>
          <form onSubmit={handleSubmit}>
            {/* 등록 방식 선택 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                등록 방식
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="BL"
                    checked={registrationType === 'BL'}
                    onChange={(e) => setRegistrationType(e.target.value as 'BL')}
                    className="mr-2"
                  />
                  BL번호
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="DECLARATION"
                    checked={registrationType === 'DECLARATION'}
                    onChange={(e) => setRegistrationType(e.target.value as 'DECLARATION')}
                    className="mr-2"
                  />
                  수입신고번호
                </label>
              </div>
            </div>

            {/* BL번호 입력 */}
            {registrationType === 'BL' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    BL 유형
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="MBL"
                        checked={formData.blType === 'MBL'}
                        onChange={(e) => setFormData({ ...formData, blType: e.target.value as 'MBL' | 'HBL' })}
                        className="mr-2"
                      />
                      MBL (Master B/L)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="HBL"
                        checked={formData.blType === 'HBL'}
                        onChange={(e) => setFormData({ ...formData, blType: e.target.value as 'MBL' | 'HBL' })}
                        className="mr-2"
                      />
                      HBL (House B/L)
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      BL 번호
                    </label>
                    <input
                      type="text"
                      value={formData.blNumber}
                      onChange={(e) => setFormData({ ...formData, blNumber: e.target.value })}
                      placeholder="예: ABCD1234567890"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      입항년도
                    </label>
                    <select
                      value={formData.blYear}
                      onChange={(e) => setFormData({ ...formData, blYear: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {[2026, 2025, 2024, 2023].map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* 수입신고번호 입력 */}
            {registrationType === 'DECLARATION' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  수입신고번호
                </label>
                <input
                  type="text"
                  value={formData.declarationNumber}
                  onChange={(e) => setFormData({ ...formData, declarationNumber: e.target.value })}
                  placeholder="예: 12345-26-1234567"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '등록 중...' : '등록'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 액션 버튼 */}
      {!showForm && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 신규 등록
            </button>
            <button
              onClick={handleSyncAll}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              🔄 전체 동기화
            </button>
            <Link
              href="/settings/unipass"
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              설정
            </Link>
          </div>
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
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
          <div className="text-sm text-gray-600 mb-1">수입연동</div>
          <div className="text-2xl font-bold text-purple-600">{stats.linked}건</div>
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
        ) : trackings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            등록된 통관 추적 정보가 없습니다. 신규 등록 버튼을 눌러 등록해보세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    등록방식
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    BL/신고번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    품명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    진행상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    입항일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    통관일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관세
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trackings.map((tracking) => (
                  <tr key={tracking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        tracking.registrationType === 'BL' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {tracking.registrationType === 'BL' ? 'BL' : '신고번호'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {tracking.registrationType === 'BL' 
                          ? tracking.blNumber 
                          : tracking.declarationNumber}
                      </div>
                      {tracking.registrationType === 'BL' && (
                        <div className="text-xs text-gray-500">
                          {tracking.blType} / {tracking.blYear}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {tracking.productName || '-'}
                      </div>
                      {tracking.weight && (
                        <div className="text-xs text-gray-500">{tracking.weight}kg</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(tracking.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tracking.arrivalDate
                        ? new Date(tracking.arrivalDate).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tracking.clearanceDate
                        ? new Date(tracking.clearanceDate).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tracking.totalTax ? formatCurrency(tracking.totalTax) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSync(tracking.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title="동기화"
                        >
                          🔄
                        </button>
                        {tracking.importId ? (
                          <Link
                            href={`/import-export`}
                            className="text-green-600 hover:text-green-800"
                            title="수입내역 연동됨"
                          >
                            📋
                          </Link>
                        ) : (
                          <span className="text-gray-400" title="수입내역 미연동">📋</span>
                        )}
                        <button
                          onClick={() => handleDelete(tracking.id)}
                          className="text-red-600 hover:text-red-800"
                          title="삭제"
                        >
                          🗑️
                        </button>
                      </div>
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
