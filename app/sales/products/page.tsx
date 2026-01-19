'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'

interface ProductPrice {
  id: number
  effectiveDate: string
  purchasePrice: number
  salesPrice: number
  notes: string | null
}

interface Product {
  id: number
  name: string
  description: string | null
  unit: string
  notes: string | null
  prices: ProductPrice[]
}

export default function SalesProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showPriceHistory, setShowPriceHistory] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'EA',
    notes: '',
    purchasePrice: '',
    salesPrice: '',
    effectiveDate: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/sales-products')
      const data = await res.json()
      setProducts(data)
    } catch (error) {
      console.error('Error fetching products:', error)
      alert('품목 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingProduct ? '/api/sales-products' : '/api/sales-products'
      const method = editingProduct ? 'PUT' : 'POST'
      const body = editingProduct
        ? { id: editingProduct.id, ...formData }
        : formData

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '저장 중 오류가 발생했습니다.')
        return
      }

      alert(editingProduct ? '품목이 수정되었습니다.' : '품목이 등록되었습니다.')
      setShowForm(false)
      setEditingProduct(null)
      resetForm()
      fetchProducts()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    const latestPrice = product.prices[0] || { purchasePrice: 0, salesPrice: 0 }
    setFormData({
      name: product.name,
      description: product.description || '',
      unit: product.unit,
      notes: product.notes || '',
      purchasePrice: latestPrice.purchasePrice.toString(),
      salesPrice: latestPrice.salesPrice.toString(),
      effectiveDate: new Date().toISOString().split('T')[0],
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/sales-products?id=${id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
        return
      }

      alert('삭제되었습니다.')
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleAddPrice = async (productId: number) => {
    const purchasePrice = prompt('매입 단가를 입력하세요:')
    const salesPrice = prompt('매출 단가를 입력하세요:')
    const effectiveDate = prompt('적용일을 입력하세요 (YYYY-MM-DD):', new Date().toISOString().split('T')[0])

    if (!purchasePrice || !salesPrice || !effectiveDate) return

    try {
      const res = await fetch('/api/sales-product-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          purchasePrice: parseFloat(purchasePrice),
          salesPrice: parseFloat(salesPrice),
          effectiveDate,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '단가 추가 중 오류가 발생했습니다.')
        return
      }

      alert('단가가 추가되었습니다.')
      fetchProducts()
    } catch (error) {
      console.error('Error adding price:', error)
      alert('단가 추가 중 오류가 발생했습니다.')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      unit: 'EA',
      notes: '',
      purchasePrice: '',
      salesPrice: '',
      effectiveDate: new Date().toISOString().split('T')[0],
    })
  }

  if (loading && !showForm) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-700">로딩 중...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">품목 관리</h1>
        <button
          onClick={() => {
            setEditingProduct(null)
            resetForm()
            setShowForm(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 품목 등록
        </button>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            {editingProduct ? '품목 수정' : '품목 등록'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  품목명 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="품목명을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  단위 *
                </label>
                <select
                  required
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                >
                  <option value="EA">EA</option>
                  <option value="BOX">BOX</option>
                  <option value="KG">KG</option>
                  <option value="SET">SET</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                설명
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                placeholder="품목 설명을 입력하세요"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  매입 단가
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  매출 단가
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.salesPrice}
                  onChange={(e) => setFormData({ ...formData, salesPrice: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  적용일
                </label>
                <input
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                비고
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                rows={2}
                placeholder="비고 사항을 입력하세요"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingProduct(null)
                  resetForm()
                }}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 품목 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">품목명</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">단위</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">설명</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">최신 매입단가</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">최신 매출단가</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => {
                const latestPrice = product.prices[0]
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-gray-900">{product.unit}</td>
                    <td className="px-4 py-3 text-gray-900">{product.description || '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {latestPrice ? `₩${formatNumber(latestPrice.purchasePrice, 0)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900">
                      {latestPrice ? `₩${formatNumber(latestPrice.salesPrice, 0)}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => setShowPriceHistory(product.id)}
                        className="text-green-600 hover:text-green-800 mr-3"
                      >
                        단가이력
                      </button>
                      <button
                        onClick={() => handleAddPrice(product.id)}
                        className="text-purple-600 hover:text-purple-800 mr-3"
                      >
                        단가추가
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                )
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    등록된 품목이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 단가 이력 모달 */}
      {showPriceHistory !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">단가 이력</h2>
            {(() => {
              const product = products.find((p) => p.id === showPriceHistory)
              if (!product) return null

              return (
                <div>
                  <div className="mb-4">
                    <div className="text-lg font-semibold text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-600">{product.description}</div>
                  </div>
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">적용일</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">매입단가</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">매출단가</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {product.prices.map((price) => (
                        <tr key={price.id}>
                          <td className="px-4 py-2 text-gray-900">
                            {new Date(price.effectiveDate).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-900">
                            ₩{formatNumber(price.purchasePrice, 0)}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-900">
                            ₩{formatNumber(price.salesPrice, 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}
            <div className="mt-4">
              <button
                onClick={() => setShowPriceHistory(null)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
