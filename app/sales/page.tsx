'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'
import Link from 'next/link'

interface Salesperson {
  id: number
  code: string
  name: string
}

interface Category {
  id: number
  code: string
  nameKo: string
}

interface SalesRecord {
  id: number
  date: string
  type: string
  itemName: string
  customer: string | null
  quantity: number
  unitPrice: number
  amount: number
  cost: number
  margin: number
  marginRate: number
  salesperson: Salesperson
  category: Category
  notes: string | null
}

export default function SalesPage() {
  const [sales, setSales] = useState<SalesRecord[]>([])
  const [salespersons, setSalespersons] = useState<Salesperson[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  // 필터 상태
  const [filterType, setFilterType] = useState('')
  const [filterSalesperson, setFilterSalesperson] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  // 다중 선택 상태
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [salesRes, salespersonsRes, categoriesRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/salesperson'),
        fetch('/api/categories'),
      ])

      const salesData = await salesRes.json()
      const salespersonsData = await salespersonsRes.json()
      const categoriesData = await categoriesRes.json()

      setSales(salesData)
      setSalespersons(salespersonsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('데이터 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType) params.append('type', filterType)
      if (filterSalesperson) params.append('salespersonId', filterSalesperson)
      if (filterCategory) params.append('categoryId', filterCategory)
      if (filterStartDate) params.append('startDate', filterStartDate)
      if (filterEndDate) params.append('endDate', filterEndDate)

      const res = await fetch(`/api/sales?${params.toString()}`)
      const data = await res.json()
      setSales(data)
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error filtering sales:', error)
      alert('필터링 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/sales?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '삭제 중 오류가 발생했습니다.')
        return
      }

      alert('삭제되었습니다.')
      fetchData()
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error deleting sales record:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  // 전체 선택 토글
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
    } else {
      setSelectedIds(sales.map(r => r.id))
    }
    setSelectAll(!selectAll)
  }

  // 개별 선택
  const handleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  // 선택 삭제
  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.length}개 항목을 삭제하시겠습니까?`)) return
    
    try {
      const res = await fetch('/api/sales', {
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
      fetchData()
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error bulk deleting sales records:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  // 엑셀 다운로드
  const handleExcelDownload = async () => {
    try {
      const params = new URLSearchParams()
      if (filterType) params.append('type', filterType)
      if (filterSalesperson) params.append('salespersonId', filterSalesperson)
      if (filterCategory) params.append('categoryId', filterCategory)
      if (filterStartDate) params.append('startDate', filterStartDate)
      if (filterEndDate) params.append('endDate', filterEndDate)
      
      const response = await fetch(`/api/sales/export?${params.toString()}`)
      
      if (!response.ok) {
        alert('엑셀 다운로드 중 오류가 발생했습니다.')
        return
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `매입매출내역_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading Excel:', error)
      alert('엑셀 다운로드 중 오류가 발생했습니다.')
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">매입매출 내역</h1>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              선택 삭제 ({selectedIds.length}개)
            </button>
          )}
          <button
            onClick={handleExcelDownload}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            📥 엑셀 내려받기
          </button>
          <Link
            href="/master/upload"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            📤 엑셀 업로드
          </Link>
          <Link
            href="/sales/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + 매입매출 등록
          </Link>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-bold mb-4 text-gray-900">필터</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">거래유형</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            >
              <option value="">전체</option>
              <option value="SALES">매출</option>
              <option value="PURCHASE">매입</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">담당자</label>
            <select
              value={filterSalesperson}
              onChange={(e) => setFilterSalesperson(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            >
              <option value="">전체</option>
              {salespersons.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">카테고리</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            >
              <option value="">전체</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nameKo}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">시작일</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">종료일</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={handleFilter}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            필터 적용
          </button>
          <button
            onClick={() => {
              setFilterType('')
              setFilterSalesperson('')
              setFilterCategory('')
              setFilterStartDate('')
              setFilterEndDate('')
              fetchData()
            }}
            className="ml-2 bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 매입매출 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">날짜</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">구분</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">담당자</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">카테고리</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">품목명</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">거래처</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">수량</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">단가</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">총액(부가세제외)</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">마진</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">마진율</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sales.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(record.id)}
                      onChange={() => handleSelect(record.id)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {new Date(record.date).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      record.type === 'SALES' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {record.type === 'SALES' ? '매출' : '매입'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{record.salesperson.name}</td>
                  <td className="px-4 py-3 text-gray-900">{record.category.nameKo}</td>
                  <td className="px-4 py-3 text-gray-900">{record.itemName}</td>
                  <td className="px-4 py-3 text-gray-900">{record.customer || '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatNumber(record.quantity, 2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ₩{formatNumber(record.unitPrice, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ₩{formatNumber(record.amount, 0)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {record.type === 'SALES' ? (
                      <span className={record.margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ₩{formatNumber(record.margin, 0)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {record.type === 'SALES' ? (
                      <span className={record.marginRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {record.marginRate.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/sales/${record.id}`}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      수정
                    </Link>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                    등록된 매입매출 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
