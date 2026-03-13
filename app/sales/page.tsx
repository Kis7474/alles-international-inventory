'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatNumber } from '@/lib/utils'
import Link from 'next/link'
import Autocomplete from '@/components/ui/Autocomplete'
import TransactionStatementModal from '@/components/TransactionStatementModal'

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

interface LinkedPurchase {
  id: number
  vendorId: number | null
  vendor: { name: string } | null
  unitPrice: number
  amount: number
  costSource: string | null
  quantity: number
  date: string
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
  costSource?: string | null
  linkedPurchases?: LinkedPurchase[]
  linkedSalesId?: number | null
  linkedSalesRecord?: {
    id: number
    itemName: string
    quantity: number
    unitPrice: number
    amount: number
    date: string
    vendor: { name: string } | null
  } | null
}

type SortField = 'date' | 'amount' | 'marginRate'
type SortDirection = 'asc' | 'desc'

export default function SalesPage() {
  const router = useRouter()
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
  const [filterYearMonth, setFilterYearMonth] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  
  // Phase 4: 정렬 상태
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // 다중 선택 상태
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)
  
  // 거래명세서 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalData, setModalData] = useState<{
    vendorName: string
    vendorPhone?: string
    vendorFax?: string
    items: Array<{
      productName: string
      quantity: number
      unitPrice: number
      amount: number
    }>
  } | null>(null)
  const [detailRecord, setDetailRecord] = useState<SalesRecord | null>(null)

  // Phase 5: 페이지네이션 상태
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50 // Phase 5: 한 페이지에 50건 표시

  useEffect(() => {
    // Only fetch data once on mount - fetchData shouldn't change after initial render
    // and we don't want to refetch when formData changes
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    try {
      const params = new URLSearchParams()
      params.append('page', '1')
      params.append('limit', limit.toString())

      const [salesRes, salespersonsRes, categoriesRes, vendorsRes] = await Promise.all([
        fetch(`/api/sales?${params.toString()}`, { cache: 'no-store' }),
        fetch('/api/salesperson'),
        fetch('/api/categories'),
        fetch('/api/vendors'), // Phase 4
      ])

      const salesResponse = await salesRes.json()
      const salespersonsData = await salespersonsRes.json()
      const categoriesData = await categoriesRes.json()
      const vendorsData = await vendorsRes.json() // Phase 4

      // Phase 5: 페이지네이션 정보 저장
      setSales(salesResponse.data || [])
      setTotalPages(salesResponse.pagination?.totalPages || 1)
      setTotal(salesResponse.pagination?.total || 0)
      
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
      // Phase 5: 페이지네이션 파라미터 추가
      params.append('page', page.toString())
      params.append('limit', limit.toString())
      
      if (filterType) params.append('type', filterType)
      if (filterSalesperson) params.append('salespersonId', filterSalesperson)
      if (filterCategory) params.append('categoryId', filterCategory)
      if (filterVendor) params.append('vendorId', filterVendor) // Phase 4
      if (filterItemName) params.append('itemName', filterItemName) // Phase 4
      if (filterYearMonth) {
        params.append('yearMonth', filterYearMonth)
      } else {
        if (filterStartDate) params.append('startDate', filterStartDate)
        if (filterEndDate) params.append('endDate', filterEndDate)
      }

      const res = await fetch(`/api/sales?${params.toString()}`, { cache: 'no-store' })
      const response = await res.json()
      
      // Phase 5: 페이지네이션 정보 저장
      setSales(response.data || [])
      setTotalPages(response.pagination?.totalPages || 1)
      setTotal(response.pagination?.total || 0)
      
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
    if (!confirm('매출과 연동된 매입 기록도 함께 삭제됩니다.\n정말 삭제하시겠습니까?')) return

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
    if (!confirm(`${selectedIds.length}개 항목과 연동된 매입 기록도 함께 삭제됩니다.\n삭제하시겠습니까?`)) return
    
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

  // 선택한 매출 내역으로 거래명세서 생성 - 미리보기 모달 표시
  const handleCreateTransactionStatement = async () => {
    if (selectedIds.length === 0) {
      alert('거래명세서를 생성할 매출 내역을 선택해주세요.')
      return
    }

    // 선택된 매출 레코드 가져오기
    const selectedSales = sales.filter(s => selectedIds.includes(s.id))
    
    // 매출 레코드만 선택 가능 (매입은 제외)
    const nonSalesRecords = selectedSales.filter(s => s.type !== 'SALES')
    if (nonSalesRecords.length > 0) {
      alert('매출 내역만 선택해주세요. 매입 내역은 거래명세서를 생성할 수 없습니다.')
      return
    }
    
    // 모든 선택된 레코드의 거래처가 같은지 확인
    const vendorNamesSet = new Set(selectedSales.map(s => s.vendor?.name).filter((name): name is string => Boolean(name)))
    const vendorNames = Array.from(vendorNamesSet)
    if (vendorNames.length > 1) {
      alert('같은 거래처의 매출만 선택해주세요.')
      return
    }
    
    if (vendorNames.length === 0) {
      alert('거래처 정보가 없는 매출은 거래명세서를 생성할 수 없습니다.')
      return
    }

    // 거래명세서 아이템 준비
    const items = selectedSales.map(s => ({
      productName: s.itemName,
      quantity: s.quantity,
      unitPrice: s.unitPrice,
      amount: s.amount,
    }))
    
    // 거래처 상세 정보 가져오기 (phone 자동 채움용)
    const firstVendor = selectedSales.find(s => s.vendor)?.vendor
    let vendorPhone = ''
    
    if (firstVendor) {
      try {
        // Fetch vendor details by searching for exact name match
        const vendorRes = await fetch(`/api/vendors?searchName=${encodeURIComponent(firstVendor.name)}`)
        const vendorData = await vendorRes.json()
        if (vendorData && vendorData.length > 0) {
          vendorPhone = vendorData[0].phone || ''
        }
      } catch (error) {
        console.error('Error fetching vendor details:', error)
      }
    }
    
    // 모달 데이터 설정 및 모달 열기
    setModalData({
      vendorName: vendorNames[0],
      vendorPhone: vendorPhone,
      vendorFax: '', // Fax field doesn't exist in Vendor schema
      items: items,
    })
    setIsModalOpen(true)
  }
  
  // 거래명세서 생성 확정 (모달에서 확인 버튼 클릭 시)
  const handleConfirmTransactionStatement = async (deliveryDate: string) => {
    if (!modalData) return

    try {
      setLoading(true)
      
      // 거래명세서 생성 API 호출
      const response = await fetch('/api/documents/transaction-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryDate: deliveryDate,
          recipientName: modalData.vendorName,
          recipientRef: '',
          recipientPhone: modalData.vendorPhone || '',
          recipientFax: modalData.vendorFax || '',
          paymentTerms: '납품 후 익월 현금결제',
          bankAccount: '하나은행 586-910007-02104 (예금주: 알레스인터네셔날 주식회사)',
          receiverName: '',
          items: modalData.items.map(item => ({
            productName: item.productName,
            specification: '',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
          })),
          salesRecordIds: selectedIds, // 매출 레코드 ID 전달
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || '거래명세서 생성에 실패했습니다.')
        return
      }

      const statement = await response.json()
      setIsModalOpen(false)
      setModalData(null)
      alert('거래명세서가 생성되었습니다.')
      router.push(`/documents/transaction-statement/${statement.id}`)
    } catch (error) {
      console.error('Error creating transaction statement:', error)
      alert('거래명세서 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
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

  // Phase 5: 페이지네이션 핸들러
  const handlePageChange = async (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage)
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.append('page', newPage.toString())
        params.append('limit', limit.toString())
        
        if (filterType) params.append('type', filterType)
        if (filterSalesperson) params.append('salespersonId', filterSalesperson)
        if (filterCategory) params.append('categoryId', filterCategory)
        if (filterVendor) params.append('vendorId', filterVendor)
        if (filterItemName) params.append('itemName', filterItemName)
        if (filterYearMonth) {
          params.append('yearMonth', filterYearMonth)
        } else {
          if (filterStartDate) params.append('startDate', filterStartDate)
          if (filterEndDate) params.append('endDate', filterEndDate)
        }

        const res = await fetch(`/api/sales?${params.toString()}`, { cache: 'no-store' })
        const response = await res.json()
        
        setSales(response.data || [])
        setTotalPages(response.pagination?.totalPages || 1)
        setTotal(response.pagination?.total || 0)
        
        setSelectedIds([])
        setSelectAll(false)
      } catch (error) {
        console.error('Error fetching page:', error)
        alert('페이지 조회 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }
  }

  // Phase 5: 필터 적용 시 첫 페이지로 리셋
  const handleFilterApply = () => {
    setPage(1)
    handleFilter()
  }

  // Phase 5: 필터 초기화 시 첫 페이지로 리셋
  const handleFilterReset = () => {
    setFilterType('')
    setFilterSalesperson('')
    setFilterCategory('')
    setFilterVendor('')
    setFilterItemName('')
    setFilterYearMonth('')
    setFilterStartDate('')
    setFilterEndDate('')
    setPage(1)
    fetchData()
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
            <>
              <button
                onClick={handleCreateTransactionStatement}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                📄 거래명세서 생성 ({selectedIds.length}개)
              </button>
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                선택 삭제 ({selectedIds.length}개)
              </button>
            </>
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
            <label className="block text-sm font-medium mb-1 text-gray-700">월별 조회(연-월)</label>
            <input
              type="month"
              value={filterYearMonth}
              onChange={(e) => setFilterYearMonth(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            />
          </div>

          <div className="text-xs text-gray-500 flex items-end pb-2">
            월별 조회를 선택하면 시작일/종료일 조건보다 우선 적용됩니다.
          </div>
        </div>

        {!filterYearMonth && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
        )}

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
            onClick={handleFilterApply}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            필터 적용
          </button>
          <button
            onClick={handleFilterReset}
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
      <div className="bg-white rounded-lg shadow overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
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
                <th 
                  className="px-4 py-3 text-right text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('amount')}
                >
                  금액 {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">카테고리</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">담당자</th>
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
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{record.itemName}</span>
                      {/* P1: Linked purchase indicator for SALES records */}
                      {record.type === 'SALES' && record.linkedPurchases && record.linkedPurchases.length > 0 && (
                        <span 
                          className="cursor-help" 
                          title={`연동 매입: ${record.linkedPurchases.map(p => 
                            `${p.vendor?.name || '알 수 없음'} - ₩${formatNumber(p.unitPrice, 0)} × ${formatNumber(p.quantity, 2)}`
                          ).join(', ')}`}
                        >
                          🔗
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatNumber(record.quantity, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ₩{formatNumber(record.unitPrice, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ₩{formatNumber(record.amount, 0)}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{record.category.nameKo}</td>
                  <td className="px-4 py-3 text-gray-900">{record.salesperson.name}</td>
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
                    <button
                      onClick={() => setDetailRecord(record)}
                      className="text-indigo-600 hover:text-indigo-800 mr-3"
                    >
                      상세
                    </button>
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
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                    등록된 매입매출 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        

        {/* Phase 5: 페이지네이션 UI */}
        {total > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* 아이템 표시 정보 */}
              <div className="text-sm text-gray-700">
                전체 <span className="font-semibold">{total}</span>건 중{' '}
                <span className="font-semibold">{(page - 1) * limit + 1}</span>-
                <span className="font-semibold">{Math.min(page * limit, total)}</span>건 표시
              </div>

              {/* 페이지 버튼 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>

                {/* 페이지 번호 */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 rounded border ${
                          page === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Transaction Statement Modal */}
      {modalData && (
        <TransactionStatementModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setModalData(null)
          }}
          onConfirm={handleConfirmTransactionStatement}
          vendorName={modalData.vendorName}
          items={modalData.items}
          loading={loading}
        />
      )}

      {detailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">매입매출 상세</h3>
              <button
                onClick={() => setDetailRecord(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                닫기
              </button>
            </div>
            <div className="space-y-4 px-6 py-4 text-sm text-gray-800">
              <div>
                <div className="font-semibold text-gray-900">비고</div>
                <div className="mt-1 rounded border bg-gray-50 p-2">{detailRecord.notes || '-'}</div>
              </div>

              <div>
                <div className="font-semibold text-gray-900">연동된 매입</div>
                {detailRecord.linkedPurchases && detailRecord.linkedPurchases.length > 0 ? (
                  <ul className="mt-1 space-y-1 rounded border bg-gray-50 p-2">
                    {detailRecord.linkedPurchases.map((purchase) => (
                      <li key={purchase.id}>
                        #{purchase.id} / {purchase.vendor?.name || '-'} / {new Date(purchase.date).toLocaleDateString('ko-KR')} / 
                        ₩{formatNumber(purchase.unitPrice, 0)} × {formatNumber(purchase.quantity, 0)} = ₩{formatNumber(purchase.amount, 0)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-1 rounded border bg-gray-50 p-2">-</div>
                )}
              </div>

              <div>
                <div className="font-semibold text-gray-900">연동된 매출</div>
                {detailRecord.linkedSalesRecord ? (
                  <div className="mt-1 rounded border bg-gray-50 p-2">
                    #{detailRecord.linkedSalesRecord.id} / {detailRecord.linkedSalesRecord.vendor?.name || '-'} / {new Date(detailRecord.linkedSalesRecord.date).toLocaleDateString('ko-KR')} / {detailRecord.linkedSalesRecord.itemName} / 
                    ₩{formatNumber(detailRecord.linkedSalesRecord.unitPrice, 0)} × {formatNumber(detailRecord.linkedSalesRecord.quantity, 0)} = ₩{formatNumber(detailRecord.linkedSalesRecord.amount, 0)}
                  </div>
                ) : (
                  <div className="mt-1 rounded border bg-gray-50 p-2">-</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
