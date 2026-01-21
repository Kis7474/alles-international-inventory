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

interface Part {
  id: number
  code: string | null
  name: string
  unit: string
  categoryId: number | null
  category: Category | null
  description: string | null
  defaultPurchasePrice: number | null
  purchaseVendorId: number
  purchaseVendor: Vendor
  salesVendorId: number | null
  salesVendor: Vendor | null
}

export default function MasterPartsPage() {
  const [parts, setParts] = useState<Part[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)
  
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [filterSearchName, setFilterSearchName] = useState('')
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    unit: 'EA',
    categoryId: '',
    description: '',
    defaultPurchasePrice: '',
    purchaseVendorId: '',
    salesVendorId: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [partsRes, categoriesRes, vendorsRes] = await Promise.all([
        fetch('/api/parts'),
        fetch('/api/categories'),
        fetch('/api/vendors'),
      ])
      const partsData = await partsRes.json()
      const categoriesData = await categoriesRes.json()
      const vendorsData = await vendorsRes.json()
      setParts(partsData)
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
      if (filterCategoryId) params.append('categoryId', filterCategoryId)
      if (filterSearchName) params.append('searchName', filterSearchName)

      const res = await fetch(`/api/parts?${params.toString()}`)
      const data = await res.json()
      setParts(data)
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error filtering parts:', error)
      alert('필터링 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.purchaseVendorId) {
      alert('매입 거래처를 선택해주세요.')
      return
    }
    
    try {
      const url = '/api/parts'
      const method = editingPart ? 'PUT' : 'POST'
      const body = editingPart
        ? { ...formData, id: editingPart.id }
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
      console.error('Error saving part:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/parts?id=${id}`, {
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
      console.error('Error deleting part:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
    } else {
      setSelectedIds(parts.map(r => r.id))
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
      const res = await fetch('/api/parts', {
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
      console.error('Error bulk deleting parts:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (part: Part) => {
    setEditingPart(part)
    setFormData({
      code: part.code || '',
      name: part.name,
      unit: part.unit,
      categoryId: part.categoryId?.toString() || '',
      description: part.description || '',
      defaultPurchasePrice: part.defaultPurchasePrice?.toString() || '',
      purchaseVendorId: part.purchaseVendorId.toString(),
      salesVendorId: part.salesVendorId?.toString() || '',
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingPart(null)
    setFormData({
      code: '',
      name: '',
      unit: 'EA',
      categoryId: '',
      description: '',
      defaultPurchasePrice: '',
      purchaseVendorId: '',
      salesVendorId: '',
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
        <h1 className="text-3xl font-bold text-gray-900">부품 관리</h1>
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
            + 부품 등록
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-bold mb-4 text-gray-900">필터</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">카테고리</label>
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
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
            <label className="block text-sm font-medium mb-1 text-gray-700">부품명 검색</label>
            <input
              type="text"
              value={filterSearchName}
              onChange={(e) => setFilterSearchName(e.target.value)}
              placeholder="부품명 또는 코드로 검색"
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
              setFilterCategoryId('')
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
                  부품명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  단위
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  매입처
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  매출처
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  카테고리
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  매입가
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {parts.map((part) => (
                <tr key={part.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(part.id)}
                      onChange={() => handleSelect(part.id)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {part.code || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {part.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {part.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {part.purchaseVendor?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {part.salesVendor?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {part.category?.nameKo || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {part.defaultPurchasePrice ? formatCurrency(part.defaultPurchasePrice) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button
                      onClick={() => handleEdit(part)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(part.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {parts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    등록된 부품이 없습니다.
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
              {editingPart ? '부품 수정' : '부품 등록'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    매입 거래처 *
                  </label>
                  <select
                    required
                    value={formData.purchaseVendorId}
                    onChange={(e) => setFormData({ ...formData, purchaseVendorId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="">선택하세요</option>
                    {vendors
                      .filter(v => v.type === 'DOMESTIC_PURCHASE' || v.type === 'INTERNATIONAL_PURCHASE')
                      .map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          [{vendor.code}] {vendor.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    매출 거래처
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

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">부품명 *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    부품코드 (선택)
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    단위 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="EA, BOX, SET 등"
                  />
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

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  매입가 (₩)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.defaultPurchasePrice}
                  onChange={(e) => setFormData({ ...formData, defaultPurchasePrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
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
                  {editingPart ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
