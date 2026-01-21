'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface Category {
  id: number
  code: string
  name: string
  nameKo: string
}

interface Vendor {
  id: number
  code: string
  name: string
  type: string
}

interface Service {
  id: number
  code: string | null
  name: string
  description: string | null
  serviceHours: number | null
  salesVendorId: number | null
  salesVendor: Vendor | null
  categoryId: number | null
  category: Category | null
}

export default function MasterServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)
  
  const [filterSearchName, setFilterSearchName] = useState('')
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    serviceHours: '',
    salesVendorId: '',
    categoryId: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [servicesRes, categoriesRes, vendorsRes] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/categories'),
        fetch('/api/vendors'),
      ])
      const servicesData = await servicesRes.json()
      const categoriesData = await categoriesRes.json()
      const vendorsData = await vendorsRes.json()
      setServices(servicesData)
      setCategories(categoriesData)
      setVendors(vendorsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSearchName) params.append('searchName', filterSearchName)

      const res = await fetch(`/api/services?${params.toString()}`)
      const data = await res.json()
      setServices(data)
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error filtering services:', error)
      alert('필터링 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = '/api/services'
      const method = editingService ? 'PUT' : 'POST'
      const body = editingService
        ? { ...formData, id: editingService.id }
        : formData

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        await fetchData()
        handleCloseModal()
        setSelectedIds([])
        setSelectAll(false)
      } else {
        const error = await res.json()
        alert(error.error || '오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error saving service:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/services?id=${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchData()
        setSelectedIds([])
        setSelectAll(false)
      } else {
        const error = await res.json()
        alert(error.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting service:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
    } else {
      setSelectedIds(services.map(r => r.id))
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
      const res = await fetch('/api/services', {
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
      console.error('Error bulk deleting services:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setFormData({
      code: service.code || '',
      name: service.name,
      description: service.description || '',
      serviceHours: service.serviceHours?.toString() || '',
      salesVendorId: service.salesVendorId?.toString() || '',
      categoryId: service.categoryId?.toString() || '',
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingService(null)
    setFormData({
      code: '',
      name: '',
      description: '',
      serviceHours: '',
      salesVendorId: '',
      categoryId: '',
    })
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">서비스 관리</h1>
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
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 서비스 등록
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-bold mb-4 text-gray-900">필터</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">서비스명 검색</label>
            <input
              type="text"
              value={filterSearchName}
              onChange={(e) => setFilterSearchName(e.target.value)}
              placeholder="서비스명 또는 코드로 검색"
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
              setFilterSearchName('')
              fetchData()
            }}
            className="ml-2 bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
          >
            초기화
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
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
                  코드
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  서비스명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  설명
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  서비스 시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  매출처
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  카테고리
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map((service) => (
                <tr key={service.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(service.id)}
                      onChange={() => handleSelect(service.id)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {service.code || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {service.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {service.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {service.serviceHours ? service.serviceHours + '시간' : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {service.salesVendor?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {service.category?.nameKo || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button
                      onClick={() => handleEdit(service)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    등록된 서비스가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {editingService ? '서비스 수정' : '서비스 등록'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    서비스코드 (선택)
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">서비스명 *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    서비스 시간 (선택)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.serviceHours}
                    onChange={(e) => setFormData({ ...formData, serviceHours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="시간 단위"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    매출처
                  </label>
                  <select
                    value={formData.salesVendorId}
                    onChange={(e) => setFormData({ ...formData, salesVendorId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">선택하세요</option>
                    {vendors
                      .filter(v => v.type === 'DOMESTIC_SALES' || v.type === 'INTERNATIONAL_SALES')
                      .map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          [{vendor.code}] {vendor.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">선택</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nameKo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingService ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
