'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface Vendor {
  id: number
  code: string
  name: string
}

interface Product {
  id: number
  code: string
  name: string
}

interface VendorProductPrice {
  id: number
  vendorId: number
  vendor: Vendor
  productId: number
  product: Product
  purchasePrice: number | null
  salesPrice: number | null
  effectiveDate: string
  memo: string | null
}

export default function VendorPricesPage() {
  const [prices, setPrices] = useState<VendorProductPrice[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPrice, setEditingPrice] = useState<VendorProductPrice | null>(null)
  
  const [formData, setFormData] = useState({
    vendorId: '',
    productId: '',
    purchasePrice: '',
    salesPrice: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    memo: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [pricesRes, vendorsRes, productsRes] = await Promise.all([
        fetch('/api/vendor-product-prices'),
        fetch('/api/vendors'),
        fetch('/api/products'),
      ])
      const pricesData = await pricesRes.json()
      const vendorsData = await vendorsRes.json()
      const productsData = await productsRes.json()
      setPrices(pricesData)
      setVendors(vendorsData)
      setProducts(productsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = '/api/vendor-product-prices'
      const method = editingPrice ? 'PUT' : 'POST'
      const body = editingPrice
        ? { ...formData, id: editingPrice.id }
        : formData

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        await fetchData()
        handleCloseModal()
      } else {
        const error = await res.json()
        alert(error.error || '오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error saving price:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/vendor-product-prices?id=${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchData()
      } else {
        const error = await res.json()
        alert(error.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting price:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (price: VendorProductPrice) => {
    setEditingPrice(price)
    setFormData({
      vendorId: price.vendorId.toString(),
      productId: price.productId.toString(),
      purchasePrice: price.purchasePrice?.toString() || '',
      salesPrice: price.salesPrice?.toString() || '',
      effectiveDate: new Date(price.effectiveDate).toISOString().split('T')[0],
      memo: price.memo || '',
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingPrice(null)
    setFormData({
      vendorId: '',
      productId: '',
      purchasePrice: '',
      salesPrice: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      memo: '',
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
        <h1 className="text-3xl font-bold text-gray-900">거래처별 품목 가격 관리</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 가격 등록
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  거래처
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  품목
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  매입가
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  매출가
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  적용일자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  메모
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {prices.map((price) => (
                <tr key={price.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {price.vendor.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {price.product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {price.purchasePrice ? formatCurrency(price.purchasePrice) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {price.salesPrice ? formatCurrency(price.salesPrice) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(price.effectiveDate).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {price.memo || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button
                      onClick={() => handleEdit(price)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(price.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {prices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    등록된 가격이 없습니다.
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
              {editingPrice ? '가격 수정' : '가격 등록'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    거래처 *
                  </label>
                  <select
                    required
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={!!editingPrice}
                  >
                    <option value="">선택</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    품목 *
                  </label>
                  <select
                    required
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={!!editingPrice}
                  >
                    <option value="">선택</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    매입가 (₩)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    매출가 (₩)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.salesPrice}
                    onChange={(e) => setFormData({ ...formData, salesPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  적용일자 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  메모
                </label>
                <textarea
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
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
                  {editingPrice ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
