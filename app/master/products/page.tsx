'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import ProductModal from './ProductModal'

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

interface ProductSalesVendor {
  id: number
  vendorId: number
  vendor: Vendor
}

interface Product {
  id: number
  code: string | null
  name: string
  unit: string
  categoryId: number | null
  category: Category | null
  description: string | null
  defaultPurchasePrice: number | null
  defaultSalesPrice: number | null
  currentCost: number | null
  purchaseVendorId: number
  purchaseVendor: Vendor
  salesVendors: ProductSalesVendor[]
}

export default function MasterProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)
  
  // 필터 상태
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [filterSearchName, setFilterSearchName] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
      ])
      const productsData = await productsRes.json()
      const categoriesData = await categoriesRes.json()
      setProducts(productsData)
      setCategories(categoriesData)
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

      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()
      setProducts(data)
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error filtering products:', error)
      alert('필터링 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/products?id=${id}`, {
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
      console.error('Error deleting product:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
    } else {
      setSelectedIds(products.map(r => r.id))
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
      const res = await fetch('/api/products', {
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
      console.error('Error bulk deleting products:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleProductSave = () => {
    setShowProductModal(false)
    setEditingProductId(null)
    fetchData()
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
        <h1 className="text-3xl font-bold text-gray-900">통합 품목 관리</h1>
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
            onClick={() => {
              setEditingProductId(null)
              setShowProductModal(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 품목 등록
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
            <label className="block text-sm font-medium mb-1 text-gray-700">품목명 검색</label>
            <input
              type="text"
              value={filterSearchName}
              onChange={(e) => setFilterSearchName(e.target.value)}
              placeholder="품목명 또는 코드로 검색"
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
                  품목명
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
                  현재 원가
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={() => handleSelect(product.id)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.code || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.purchaseVendor?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {product.salesVendors && product.salesVendors.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.salesVendors.map((sv) => (
                          <span key={sv.id} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {sv.vendor.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.category?.nameKo || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {product.currentCost ? (
                      <span className="font-semibold text-green-700">
                        {formatCurrency(product.currentCost)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button
                      onClick={() => {
                        setEditingProductId(product.id)
                        setShowProductModal(true)
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      상세/수정
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    등록된 품목이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal - 통합 (등록/상세/수정) */}
      {showProductModal && (
        <ProductModal
          productId={editingProductId}
          onClose={() => {
            setShowProductModal(false)
            setEditingProductId(null)
          }}
          onSave={handleProductSave}
        />
      )}
    </div>
  )
}
