'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'
import Link from 'next/link'
import Autocomplete from '@/components/ui/Autocomplete'

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

interface Vendor {
  id: number
  code: string
  name: string
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
  vendor: { name: string } | null
  vatIncluded: boolean
  totalAmount: number | null
  notes: string | null
}

type SortField = 'date' | 'amount' | 'marginRate'
type SortDirection = 'asc' | 'desc'

export default function SalesPage() {
  const [sales, setSales] = useState<SalesRecord[]>([])
  const [salespersons, setSalespersons] = useState<Salesperson[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([]) // Phase 4
  // Phase 4: products loaded for autocomplete but we use itemName filter instead
  const [loading, setLoading] = useState(true)
  
  // 필터 상태
  const [filterType, setFilterType] = useState('')
  const [filterSalesperson, setFilterSalesperson] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterVendor, setFilterVendor] = useState('') // Phase 4
  const [filterItemName, setFilterItemName] = useState('') // Phase 4
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  
  // Phase 4: 정렬 상태
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // 다중 선택 상태
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [salesRes, salespersonsRes, categoriesRes, vendorsRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/salesperson'),
        fetch('/api/categories'),
        fetch('/api/vendors'), // Phase 4
      ])

      const salesResponse = await salesRes.json()
      const salespersonsData = await salespersonsRes.json()
      const categoriesData = await categoriesRes.json()
      const vendorsData = await vendorsRes.json() // Phase 4

      // 하위 호환성: 배열이면 그대로 사용, 객체면 data 속성 사용
      if (Array.isArray(salesResponse)) {
        setSales(salesResponse)
      } else {
        setSales(salesResponse.data || [])
      }
      
      setSalespersons(salespersonsData)
      setCategories(categoriesData)
      setVendors(vendorsData) // Phase 4
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
      if (filterVendor) params.append('vendorId', filterVendor) // Phase 4
      if (filterItemName) params.append('itemName', filterItemName) // Phase 4
      if (filterStartDate) params.append('startDate', filterStartDate)
      if (filterEndDate) params.append('endDate', filterEndDate)

      const res = await fetch(`/api/sales?${params.toString()}`)
      const response = await res.json()
      
      // 하위 호환성: 배열이면 그대로 사용, 객체면 data 속성 사용
      if (Array.isArray(response)) {
        setSales(response)
      } else {
        setSales(response.data || [])
      }
      
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
      if (filterVendor) params.append('vendorId', filterVendor) // Phase 4
      if (filterItemName) params.append('itemName', filterItemName) // Phase 4
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

  // Phase 4: 정렬 기능
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Phase 4: 정렬된 데이터
  const sortedSales = [...sales].sort((a, b) => {
    let aVal: number | string = 0
    let bVal: number | string = 0

    if (sortField === 'date') {
      aVal = new Date(a.date).getTime()
      bVal = new Date(b.date).getTime()
    } else if (sortField === 'amount') {
      aVal = a.amount
      bVal = b.amount
    } else if (sortField === 'marginRate') {
      aVal = a.marginRate
      bVal = b.marginRate
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })

  // Phase 4: 요약 계산
  const summary = {
    totalRevenue: sales.filter(s => s.type === 'SALES').reduce((sum, s) => sum + s.amount, 0),
    totalMargin: sales.filter(s => s.type === 'SALES').reduce((sum, s) => sum + s.margin, 0),
    totalPurchase: sales.filter(s => s.type === 'PURCHASE').reduce((sum, s) => sum + s.amount, 0),
    count: sales.length,
  }
  const avgMarginRate = summary.totalRevenue > 0 
    ? (summary.totalMargin / summary.totalRevenue) * 100 
    : 0

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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

        {/* Phase 4: 거래처/품목명 필터 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Autocomplete
            label="거래처"
            options={vendors.map(v => ({ 
              id: v.id, 
              label: v.name, 
              sublabel: v.code 
            }))}
            value={filterVendor}
            onChange={setFilterVendor}
            placeholder="거래처 검색..."
          />

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">품목명</label>
            <input
              type="text"
              value={filterItemName}
              onChange={(e) => setFilterItemName(e.target.value)}
              placeholder="품목명 검색..."
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
              setFilterVendor('') // Phase 4
              setFilterItemName('') // Phase 4
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

      {/* Phase 4: 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">총 매출액</div>
          <div className="text-2xl font-bold text-blue-600">
            ₩{formatNumber(summary.totalRevenue, 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">총 마진</div>
          <div className="text-2xl font-bold text-green-600">
            ₩{formatNumber(summary.totalMargin, 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">평균 마진율</div>
          <div className="text-2xl font-bold text-purple-600">
            {avgMarginRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">총 매입액</div>
          <div className="text-2xl font-bold text-orange-600">
            ₩{formatNumber(summary.totalPurchase, 0)}
          </div>
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
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date')}
                >
                  날짜 {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">구분</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">거래처</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">품목명</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">수량</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">단가</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">금액(부가세포함)</th>
                <th 
                  className="px-4 py-3 text-right text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount')}
                >
                  금액 {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">담당자</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">카테고리</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">마진</th>
                <th 
                  className="px-4 py-3 text-right text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('marginRate')}
                >
                  마진율 {sortField === 'marginRate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedSales.map((record) => (
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
                  <td className="px-4 py-3 text-gray-900">
                    {record.vendor?.name || record.customer || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{record.itemName}</td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatNumber(record.quantity, 2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ₩{formatNumber(record.unitPrice, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ₩{formatNumber(record.totalAmount || record.amount, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ₩{formatNumber(record.amount, 0)}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{record.salesperson.name}</td>
                  <td className="px-4 py-3 text-gray-900">{record.category.nameKo}</td>
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
              {sortedSales.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-gray-500">
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
