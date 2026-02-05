'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import PdfPreviewModal from '@/components/PdfPreviewModal'

interface ImportExport {
  id: number
  date: string
  type: string
  product: { code: string; name: string } | null
  vendor: { name: string } | null
  salesperson: { name: string } | null
  category: { nameKo: string } | null
  quantity: number | null
  currency: string
  exchangeRate: number
  foreignAmount: number
  krwAmount: number
  totalCost: number | null
  unitCost: number | null
  storageType: string | null
  memo: string | null
  pdfFileName: string | null
  pdfFilePath: string | null
  pdfUploadedAt: string | null
}

export default function ImportExportPage() {
  const [records, setRecords] = useState<ImportExport[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    startDate: '',
    endDate: '',
  })
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)
  
  // PDF modal state
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState('')
  const [currentPdfName, setCurrentPdfName] = useState('')

  useEffect(() => {
    fetchRecords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchRecords = async () => {
    try {
      const params = new URLSearchParams()
      params.append('type', 'IMPORT') // Only fetch IMPORT records
      if (filter.startDate) params.append('startDate', filter.startDate)
      if (filter.endDate) params.append('endDate', filter.endDate)

      const res = await fetch(`/api/import-export?${params.toString()}`)
      const response = await res.json()
      
      // 하위 호환성: 배열이면 그대로 사용, 객체면 data 속성 사용
      if (Array.isArray(response)) {
        setRecords(response)
      } else {
        setRecords(response.data || [])
        // pagination 정보는 받지만 현재는 UI에 표시하지 않음 (향후 기능 추가 가능)
      }
    } catch (error) {
      console.error('Error fetching records:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => {
    setLoading(true)
    fetchRecords()
    setSelectedIds([])
    setSelectAll(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/import-export?id=${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchRecords()
        setSelectedIds([])
        setSelectAll(false)
      } else {
        const error = await res.json()
        alert(error.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting record:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
    } else {
      setSelectedIds(records.map(r => r.id))
    }
    setSelectAll(!selectAll)
  }

  const handleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.length}개 항목을 삭제하시겠습니까?`)) return
    
    try {
      const res = await fetch('/api/import-export', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '삭제 중 오류가 발생했습니다.')
        return
      }

      alert(`${selectedIds.length}개 항목이 삭제되었습니다.`)
      fetchRecords()
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error bulk deleting records:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleWarehouseTransfer = async (id: number, storageLocation: 'WAREHOUSE' | 'OFFICE') => {
    try {
      const res = await fetch(`/api/import-export/${id}/warehouse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageLocation })
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '창고 입고 중 오류가 발생했습니다.')
        return
      }

      if (data.alreadyStored) {
        if (confirm('이미 창고에 입고되었습니다. 입고 관리 페이지로 이동하시겠습니까?')) {
          window.location.href = '/warehouse/lots'
        }
      } else {
        alert(data.message)
        fetchRecords()
      }
    } catch (error) {
      console.error('Error transferring to warehouse:', error)
      alert('창고 입고 중 오류가 발생했습니다.')
    }
  }
  
  const handlePdfPreview = (record: ImportExport) => {
    if (record.pdfFilePath) {
      setCurrentPdfUrl(record.pdfFilePath)
      setCurrentPdfName(record.pdfFileName || 'document.pdf')
      setShowPdfModal(true)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-700">로딩 중...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">수입 관리</h1>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-3 md:py-2 rounded-lg hover:bg-red-700 text-sm md:text-base min-h-[44px]"
            >
              선택 삭제 ({selectedIds.length}개)
            </button>
          )}
          <Link
            href="/import-export/new"
            className="px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm md:text-base min-h-[44px]"
          >
            + 수입 등록
          </Link>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-4 md:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시작일
            </label>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
              className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              종료일
            </label>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
              className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFilter}
              className="w-full px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
            >
              조회
            </button>
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  날짜
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  품목
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  거래처
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  수량
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  외화금액
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  환율
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  원화금액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  보관
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-20">
                  PDF
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(record.id)}
                      onChange={() => handleSelect(record.id)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.date).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.product?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.vendor?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {record.quantity?.toLocaleString('ko-KR') || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(record.foreignAmount, record.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {record.exchangeRate.toLocaleString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(record.krwAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.storageType === 'WAREHOUSE' ? '창고' : record.storageType === 'OFFICE' ? '사무실' : '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {record.pdfFilePath ? (
                      <button
                        onClick={() => handlePdfPreview(record)}
                        className="text-blue-600 hover:text-blue-800 text-lg"
                        title={record.pdfFileName || 'PDF 보기'}
                      >
                        📄
                      </button>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <div className="flex gap-2 justify-center">
                      <Link
                        href={`/import-export/${record.id}`}
                        className="text-blue-600 hover:text-blue-900"
                        title="수정"
                      >
                        수정
                      </Link>
                      {record.type === 'IMPORT' && !record.storageType && record.product && (
                        <>
                          <button
                            onClick={() => handleWarehouseTransfer(record.id, 'WAREHOUSE')}
                            className="text-green-600 hover:text-green-900"
                            title="창고 입고"
                          >
                            📦창고
                          </button>
                          <button
                            onClick={() => handleWarehouseTransfer(record.id, 'OFFICE')}
                            className="text-purple-600 hover:text-purple-900"
                            title="사무실 보관"
                          >
                            🏢사무실
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-red-600 hover:text-red-900"
                        title="삭제"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-4 text-center text-gray-500">
                    등록된 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          <div className="p-4 border-b bg-gray-50">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded mr-2"
              />
              <span className="text-sm text-gray-700">전체 선택</span>
            </label>
          </div>
          <div className="divide-y divide-gray-200">
            {records.map((record) => (
              <div key={record.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(record.id)}
                      onChange={() => handleSelect(record.id)}
                      className="w-4 h-4 rounded mt-1"
                    />
                    <div>
                      <div className="text-xs text-gray-600">
                        {new Date(record.date).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  </div>
                  {record.pdfFilePath && (
                    <button
                      onClick={() => handlePdfPreview(record)}
                      className="text-blue-600 hover:text-blue-800 text-lg"
                      title={record.pdfFileName || 'PDF 보기'}
                    >
                      📄
                    </button>
                  )}
                </div>
                
                <div className="font-bold text-gray-900 mb-2">
                  {record.product?.name || '-'}
                </div>
                
                <div className="space-y-1.5 text-sm mb-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">거래처:</span>
                    <span className="text-gray-900">{record.vendor?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">수량:</span>
                    <span className="text-gray-900">{record.quantity?.toLocaleString('ko-KR') || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">외화금액:</span>
                    <span className="text-gray-900">{formatCurrency(record.foreignAmount, record.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">환율:</span>
                    <span className="text-gray-900">{record.exchangeRate.toLocaleString('ko-KR')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t">
                    <span className="text-gray-600 font-medium">원화금액:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(record.krwAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">보관:</span>
                    <span className="text-gray-900">
                      {record.storageType === 'WAREHOUSE' ? '창고' : record.storageType === 'OFFICE' ? '사무실' : '-'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <Link
                    href={`/import-export/${record.id}`}
                    className="flex-1 text-center bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm min-h-[44px] flex items-center justify-center"
                  >
                    수정
                  </Link>
                  {record.type === 'IMPORT' && !record.storageType && record.product && (
                    <>
                      <button
                        onClick={() => handleWarehouseTransfer(record.id, 'WAREHOUSE')}
                        className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm min-h-[44px]"
                      >
                        📦창고
                      </button>
                      <button
                        onClick={() => handleWarehouseTransfer(record.id, 'OFFICE')}
                        className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 text-sm min-h-[44px]"
                      >
                        🏢사무실
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm min-h-[44px]"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
            {records.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                등록된 내역이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
      
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
