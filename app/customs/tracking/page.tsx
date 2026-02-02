'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { formatCurrency, isCustomsCleared } from '@/lib/utils'
import Link from 'next/link'
import PdfPreviewModal from '@/components/PdfPreviewModal'

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
  packageCount: number | null
  packageUnit: string | null
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
  memo: string | null
  pdfFileName: string | null
  pdfFilePath: string | null
  pdfUploadedAt: string | null
  forwarderCode: string | null
  forwarderName: string | null
  createdAt: string
  updatedAt: string
}

export default function CustomsTrackingPage() {
  const [trackings, setTrackings] = useState<CustomsTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  
  // Date filter state
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    blType: 'MBL' as 'MBL' | 'HBL',
    blNumber: '',
    blYear: new Date().getFullYear().toString(),
  })

  // 상세보기 모달 상태
  const [selectedTracking, setSelectedTracking] = useState<CustomsTracking | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [memo, setMemo] = useState('')
  const [savingMemo, setSavingMemo] = useState(false)
  
  // PDF 관련 상태
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState('')
  const [currentPdfName, setCurrentPdfName] = useState('')
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [uploadingTrackingId, setUploadingTrackingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchTrackings = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const res = await fetch(`/api/customs/tracking?${params.toString()}`)
      const data = await res.json()
      setTrackings(data)
    } catch (error) {
      console.error('Failed to fetch trackings:', error)
      alert('통관 내역 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, startDate, endDate])

  useEffect(() => {
    fetchTrackings()
  }, [fetchTrackings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.blNumber || !formData.blYear) {
      alert('BL번호와 입항년도를 입력해주세요.')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/customs/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationType: 'BL',
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

  // 수입/수출로 이동
  const handleTransferToImportExport = async (id: string) => {
    try {
      const res = await fetch(`/api/customs/tracking/${id}/transfer`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '수입/수출로 이동 중 오류가 발생했습니다.')
        return
      }

      if (data.alreadyLinked) {
        if (confirm('이미 수입/수출로 이동되었습니다. 해당 페이지로 이동하시겠습니까?')) {
          window.location.href = `/import-export/${data.importExportId}`
        }
      } else {
        if (confirm(data.message + ' 수정 페이지로 이동하시겠습니까?')) {
          window.location.href = `/import-export/${data.importExportId}`
        } else {
          await fetchTrackings()
        }
      }
    } catch (error) {
      console.error('Transfer failed:', error)
      alert('수입/수출로 이동 중 오류가 발생했습니다.')
    }
  }

  // 수동 연동 핸들러
  const handleManualLink = async (id: string) => {
    if (!confirm('이 통관 건을 수입 내역에 연동하시겠습니까?')) {
      return
    }

    try {
      const res = await fetch(`/api/customs/tracking/${id}/link`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '연동 중 오류가 발생했습니다.')
        return
      }

      alert(data.message || '수입 내역에 연동되었습니다.')
      
      // 연동 완료 후 수입/수출 페이지로 이동할지 물어보기
      if (confirm('연동된 수입 내역을 수정하시겠습니까?')) {
        window.location.href = `/import-export/${data.importId}`
      } else {
        await fetchTrackings()
      }
    } catch (error) {
      console.error('Manual link failed:', error)
      alert('연동 중 오류가 발생했습니다.')
    }
  }

  // 상세보기 열기
  const handleViewDetail = (tracking: CustomsTracking) => {
    setSelectedTracking(tracking)
    setMemo(tracking.memo || '')
    setShowDetailModal(true)
  }

  // 메모 저장
  const handleSaveMemo = async () => {
    if (!selectedTracking) return
    
    try {
      setSavingMemo(true)
      const res = await fetch(`/api/customs/tracking/${selectedTracking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo }),
      })
      
      if (!res.ok) {
        alert('메모 저장에 실패했습니다.')
        return
      }
      
      alert('메모가 저장되었습니다.')
      await fetchTrackings()
      
      // 모달 내 데이터 업데이트
      setSelectedTracking({ ...selectedTracking, memo })
    } catch (error) {
      console.error('Failed to save memo:', error)
      alert('메모 저장 중 오류가 발생했습니다.')
    } finally {
      setSavingMemo(false)
    }
  }
  
  // PDF 업로드 핸들러
  const handlePdfUpload = async (trackingId: string, file: File) => {
    try {
      setUploadingPdf(true)
      setUploadingTrackingId(trackingId)
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'customs')
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      
      if (!uploadRes.ok) {
        const error = await uploadRes.json()
        throw new Error(error.error || 'PDF 업로드에 실패했습니다.')
      }
      
      const uploadData = await uploadRes.json()
      
      // DB 업데이트
      const updateRes = await fetch(`/api/customs/tracking/${trackingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfFileName: uploadData.fileName,
          pdfFilePath: uploadData.filePath,
          pdfUploadedAt: uploadData.uploadedAt,
        }),
      })
      
      if (!updateRes.ok) {
        throw new Error('PDF 정보 저장에 실패했습니다.')
      }
      
      alert('PDF가 업로드되었습니다.')
      await fetchTrackings()
      
      // 상세 모달이 열려있으면 업데이트
      if (selectedTracking && selectedTracking.id === trackingId) {
        const updated = await fetch(`/api/customs/tracking/${trackingId}`)
        const data = await updated.json()
        setSelectedTracking(data)
      }
    } catch (error) {
      console.error('PDF upload error:', error)
      alert(error instanceof Error ? error.message : 'PDF 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadingPdf(false)
      setUploadingTrackingId(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }
  
  const handlePdfButtonClick = (trackingId: string) => {
    setUploadingTrackingId(trackingId)
    fileInputRef.current?.click()
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && uploadingTrackingId) {
      handlePdfUpload(uploadingTrackingId, file)
    }
  }
  
  const handlePdfPreview = (tracking: CustomsTracking) => {
    if (tracking.pdfFilePath) {
      setCurrentPdfUrl(tracking.pdfFilePath)
      setCurrentPdfName(tracking.pdfFileName || 'document.pdf')
      setShowPdfModal(true)
    }
  }
  
  const handleDateFilter = () => {
    fetchTrackings()
  }
  
  const handleResetFilter = () => {
    setStartDate('')
    setEndDate('')
    setStatusFilter('')
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return <span className="text-gray-400">-</span>
    
    const statusMap: { [key: string]: { bg: string; text: string } } = {
      입항: { bg: 'bg-blue-100', text: 'text-blue-800' },
      반입: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      검사중: { bg: 'bg-orange-100', text: 'text-orange-800' },
      심사중: { bg: 'bg-orange-100', text: 'text-orange-800' },
      반출완료: { bg: 'bg-green-100', text: 'text-green-800' },
      수입신고수리: { bg: 'bg-green-100', text: 'text-green-800' },
      통관완료: { bg: 'bg-green-100', text: 'text-green-800' },
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
    inProgress: trackings.filter((t) => !isCustomsCleared(t.status)).length,
    completed: trackings.filter((t) => isCustomsCleared(t.status)).length,
    linked: trackings.filter((t) => t.importId).length,
    totalTax: trackings.reduce((sum, t) => sum + (t.totalTax || 0), 0),
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">통관 내역</h1>
        <p className="text-gray-600 mt-2">유니패스 API를 통한 BL번호 기반 통관 정보 조회 및 관리</p>
      </div>

      {/* 등록 폼 */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">통관 내역 등록</h2>
          <form onSubmit={handleSubmit}>
            {/* BL번호 입력 */}
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
        {/* 날짜 필터 */}
        <div className="mb-4 pb-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">입항일 기준 필터</h3>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm text-gray-600 mb-1">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-sm text-gray-600 mb-1">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleDateFilter}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              조회
            </button>
            <button
              onClick={handleResetFilter}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              초기화
            </button>
          </div>
        </div>
        
        {/* 상태 필터 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">진행 상태</h3>
          <div className="flex gap-2 flex-wrap">
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
            <table className="min-w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    등록방식
                  </th>
                  <th className="w-40 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    BL/신고번호
                  </th>
                  <th className="w-48 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    품명
                  </th>
                  <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    진행상태
                  </th>
                  <th className="w-24 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    연동상태
                  </th>
                  <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    입항일
                  </th>
                  <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    통관일
                  </th>
                  <th className="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관세
                  </th>
                  <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PDF
                  </th>
                  <th className="w-28 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trackings.map((tracking) => (
                  <tr key={tracking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        tracking.registrationType === 'BL' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {tracking.registrationType === 'BL' ? 'BL' : '신고번호'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900 truncate" title={tracking.registrationType === 'BL' ? tracking.blNumber || '' : tracking.declarationNumber || ''}>
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
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900 truncate" title={tracking.productName || '-'}>
                        {tracking.productName || '-'}
                      </div>
                      {tracking.weight && (
                        <div className="text-xs text-gray-500">{tracking.weight}kg</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(tracking.status)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {tracking.importId ? (
                        <Link href={`/import-export/${tracking.importId}`} className="text-green-600 hover:underline text-sm">
                          ✅ 연동됨
                        </Link>
                      ) : isCustomsCleared(tracking.status) ? (
                        <button
                          onClick={() => handleManualLink(tracking.id)}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          수동 연동
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">대기중</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tracking.arrivalDate
                        ? new Date(tracking.arrivalDate).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
                        : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tracking.clearanceDate
                        ? new Date(tracking.clearanceDate).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
                        : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tracking.totalTax ? formatCurrency(tracking.totalTax) : '-'}
                    </td>
                    {/* PDF 컬럼 */}
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      {tracking.pdfFilePath ? (
                        <button
                          onClick={() => handlePdfPreview(tracking)}
                          className="text-blue-600 hover:text-blue-800 text-lg"
                          title={tracking.pdfFileName || 'PDF 보기'}
                        >
                          📄
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePdfButtonClick(tracking.id)}
                          disabled={uploadingPdf && uploadingTrackingId === tracking.id}
                          className={`text-gray-400 hover:text-gray-600 text-lg ${
                            uploadingPdf && uploadingTrackingId === tracking.id ? 'opacity-50 cursor-wait' : ''
                          }`}
                          title="PDF 업로드"
                        >
                          {uploadingPdf && uploadingTrackingId === tracking.id ? '⏳' : '📎'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetail(tracking)}
                          className="text-gray-600 hover:text-gray-800"
                          title="상세보기"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => handleSync(tracking.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title="동기화"
                        >
                          🔄
                        </button>
                        {tracking.importId ? (
                          <Link
                            href={`/import-export/${tracking.importId}`}
                            className="text-green-600 hover:text-green-800"
                            title="수입내역 보기"
                          >
                            📋
                          </Link>
                        ) : (
                          isCustomsCleared(tracking.status) && (
                            <button
                              onClick={() => handleTransferToImportExport(tracking.id)}
                              className="text-purple-600 hover:text-purple-800"
                              title="수입/수출 이동"
                            >
                              ➡️
                            </button>
                          )
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

      {/* 상세보기 모달 */}
      {showDetailModal && selectedTracking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">통관 상세 정보</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {/* 기본 정보 */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">■</span> 기본 정보
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-600">등록방식</span>
                    <span className="font-medium">{selectedTracking.registrationType === 'BL' ? 'BL번호' : '수입신고번호'}</span>
                  </div>
                  {selectedTracking.registrationType === 'BL' ? (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-600">BL번호</span>
                        <span className="font-medium">{selectedTracking.blNumber} ({selectedTracking.blType})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-600">입항년도</span>
                        <span className="font-medium">{selectedTracking.blYear}</span>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-600">수입신고번호</span>
                      <span className="font-medium">{selectedTracking.declarationNumber}</span>
                    </div>
                  )}
                  {selectedTracking.cargoNumber && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-600">화물관리번호</span>
                      <span className="font-medium">{selectedTracking.cargoNumber}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 화물 정보 */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">■</span> 화물 정보
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-600">품명</span>
                    <span className="font-medium">{selectedTracking.productName || '-'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-600">중량</span>
                    <span className="font-medium">{selectedTracking.weight ? `${selectedTracking.weight.toLocaleString()} kg` : '-'}</span>
                  </div>
                  {selectedTracking.packageCount && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-600">포장</span>
                      <span className="font-medium">{selectedTracking.packageCount} {selectedTracking.packageUnit || ''}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 통관 정보 */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">■</span> 통관 정보
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-600">진행상태</span>
                    <span className="font-medium">{selectedTracking.status || '-'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-600">입항일</span>
                    <span className="font-medium">
                      {selectedTracking.arrivalDate 
                        ? new Date(selectedTracking.arrivalDate).toLocaleDateString('ko-KR') 
                        : '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-600">통관일</span>
                    <span className="font-medium">
                      {selectedTracking.clearanceDate 
                        ? new Date(selectedTracking.clearanceDate).toLocaleDateString('ko-KR') 
                        : '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-600">관세</span>
                    <span className="font-medium">
                      {selectedTracking.customsDuty ? `₩${selectedTracking.customsDuty.toLocaleString()}` : '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-600">총 세금</span>
                    <span className="font-medium">
                      {selectedTracking.totalTax ? `₩${selectedTracking.totalTax.toLocaleString()}` : '-'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-600">수입연동</span>
                    <span className="font-medium">
                      {selectedTracking.importId 
                        ? <span className="text-green-600">✅ 연동됨 (#{selectedTracking.importId})</span>
                        : <span className="text-gray-400">미연동</span>}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 포워더 정보 */}
              {(selectedTracking.forwarderCode || selectedTracking.forwarderName) && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">■</span> 포워더/특송업체 정보
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {selectedTracking.forwarderCode && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-600">포워더부호</span>
                        <span className="font-medium">{selectedTracking.forwarderCode}</span>
                      </div>
                    )}
                    {selectedTracking.forwarderName && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-gray-600">포워더명</span>
                        <span className="font-medium">{selectedTracking.forwarderName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* PDF 첨부파일 */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">■</span> PDF 첨부파일
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedTracking.pdfFilePath ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📄</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {selectedTracking.pdfFileName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {selectedTracking.pdfUploadedAt 
                              ? `업로드: ${new Date(selectedTracking.pdfUploadedAt).toLocaleDateString('ko-KR')}` 
                              : ''}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePdfPreview(selectedTracking)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        미리보기
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <button
                        onClick={() => handlePdfButtonClick(selectedTracking.id)}
                        disabled={uploadingPdf}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                      >
                        {uploadingPdf ? 'PDF 업로드 중...' : 'PDF 업로드'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 메모 */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="mr-2">■</span> 메모
                </h3>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="메모를 입력하세요..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>
              
              {/* 버튼 */}
              <div className="flex justify-end gap-3">
                <button
                                    onClick={handleSaveMemo}
                  disabled={savingMemo}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
                >
                  {savingMemo ? '저장 중...' : '메모 저장'}
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden file input for PDF upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {/* PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        pdfUrl={currentPdfUrl}
        fileName={currentPdfName}
      />
    </div>
  )
}
