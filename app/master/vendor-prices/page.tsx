'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface Vendor {
  id: number
  code: string
  name: string
  type: string
}

interface Product {
  id: number
  code: string
  name: string
  defaultPurchasePrice: number | null
  category: {
    id: number
    nameKo: string
  } | null
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
  updatedAt: string
}

export default function VendorPricesPage() {
  const [prices, setPrices] = useState<VendorProductPrice[]>([])
  const [filteredPrices, setFilteredPrices] = useState<VendorProductPrice[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [editingPrice, setEditingPrice] = useState<VendorProductPrice | null>(null)
  const [selectedHistory, setSelectedHistory] = useState<VendorProductPrice[]>([])
  
  // Filter state
  const [filterVendorId, setFilterVendorId] = useState<string>('')
  const [filterProductId, setFilterProductId] = useState<string>('')
  
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

  useEffect(() => {
    // Apply filters whenever prices or filter values change
    let filtered = prices
    
    if (filterVendorId) {
      filtered = filtered.filter(p => p.vendorId === parseInt(filterVendorId))
    }
    
    if (filterProductId) {
      filtered = filtered.filter(p => p.productId === parseInt(filterProductId))
    }
    
    setFilteredPrices(filtered)
  }, [prices, filterVendorId, filterProductId])

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

  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === parseInt(productId))
    if (product && product.defaultPurchasePrice !== null) {
      setFormData({
        ...formData,
        productId,
        purchasePrice: product.defaultPurchasePrice.toString(),
      })
    } else {
      setFormData({
        ...formData,
        productId,
      })
    }
  }

  const handleVendorChange = async (vendorId: string) => {
    setFormData({ ...formData, vendorId, productId: '' })
    
    if (!vendorId) {
      setFilteredProducts([])
      return
    }
    
    // Fetch products that are sold to this vendor (해당 거래처에 판매하는 품목)
    try {
      const res = await fetch(`/api/products?salesVendorId=${vendorId}`)
      const productsData = await res.json()
      setFilteredProducts(productsData)
    } catch (error) {
      console.error('Error fetching products for vendor:', error)
      setFilteredProducts([])
    }
  }

  const handleShowHistory = async (vendorId: number, productId: number) => {
    try {
      const res = await fetch(
        `/api/vendor-product-prices/history?vendorId=${vendorId}&productId=${productId}`
      )
      const history = await res.json()
      setSelectedHistory(history)
      setShowHistoryModal(true)
    } catch (error) {
      console.error('Error fetching price history:', error)
      alert('가격 이력을 불러오는 중 오류가 발생했습니다.')
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">가격 관리</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 가격 등록
        </button>
      </div>

      {/* 필터 섹션 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">필터</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              거래처
            </label>
            <select
              value={filterVendorId}
              onChange={(e) => setFilterVendorId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">전체</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              품목
            </label>
            <select
              value={filterProductId}
              onChange={(e) => setFilterProductId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">전체</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterVendorId('')
                setFilterProductId('')
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              필터 초기화
            </button>
          </div>
        </div>
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
              {filteredPrices.map((price) => (
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
                      onClick={() => handleShowHistory(price.vendorId, price.productId)}
                      className="text-purple-600 hover:text-purple-900 mr-3"
                    >
                      이력
                    </button>
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
              {filteredPrices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    {filterVendorId || filterProductId ? '필터 조건에 맞는 가격이 없습니다.' : '등록된 가격이 없습니다.'}
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
                    거래처 (판매처) *
                  </label>
                  <select
                    required
                    value={formData.vendorId}
                    onChange={(e) => handleVendorChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={!!editingPrice}
                  >
                    <option value="">거래처를 선택하세요</option>
                    {vendors
                      .filter(v => v.type === 'DOMESTIC_SALES' || v.type === 'INTERNATIONAL_SALES')
                      .map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          [{vendor.code}] {vendor.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    품목 *
                    {formData.vendorId && (
                      <span className="text-xs text-blue-600 ml-1">
                        (선택한 거래처에 판매하는 품목만 표시 - {filteredProducts.length}개)
                      </span>
                    )}
                  </label>
                  <select
                    required
                    value={formData.productId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={!formData.vendorId || !!editingPrice}
                  >
                    <option value="">{formData.vendorId ? '품목을 선택하세요' : '거래처를 먼저 선택하세요'}</option>
                    {filteredProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    매입가 (₩) {formData.productId && <span className="text-xs text-blue-600">(품목에서 자동 설정됨, 읽기전용)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-gray-100"
                    disabled={!!formData.productId}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    매출가 (₩) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
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

      {/* 가격 이력 모달 */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">가격 변경 이력</h2>
            
            {selectedHistory.length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 rounded-md">
                <div className="text-sm text-gray-700">
                  <strong>거래처:</strong> {selectedHistory[0].vendor.name} | 
                  <strong className="ml-2">품목:</strong> {selectedHistory[0].product.name}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      적용일자
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      매입가
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      매출가
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      매입가 변동
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      매출가 변동
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      메모
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      변경일시
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedHistory.map((price, index) => {
                    const prevPrice = selectedHistory[index + 1]
                    const purchaseDiff = prevPrice && price.purchasePrice && prevPrice.purchasePrice 
                      ? price.purchasePrice - prevPrice.purchasePrice 
                      : null
                    const salesDiff = prevPrice && price.salesPrice && prevPrice.salesPrice 
                      ? price.salesPrice - prevPrice.salesPrice 
                      : null

                    return (
                      <tr key={price.id} className={index === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(price.effectiveDate).toLocaleDateString('ko-KR')}
                          {index === 0 && <span className="ml-2 text-xs text-green-600 font-semibold">현재</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {price.purchasePrice ? formatCurrency(price.purchasePrice) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                          {price.salesPrice ? formatCurrency(price.salesPrice) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          {purchaseDiff !== null ? (
                            <span className={purchaseDiff > 0 ? 'text-red-600' : purchaseDiff < 0 ? 'text-blue-600' : 'text-gray-500'}>
                              {purchaseDiff > 0 ? '+' : ''}{formatCurrency(purchaseDiff)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          {salesDiff !== null ? (
                            <span className={salesDiff > 0 ? 'text-red-600' : salesDiff < 0 ? 'text-blue-600' : 'text-gray-500'}>
                              {salesDiff > 0 ? '+' : ''}{formatCurrency(salesDiff)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {price.memo || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(price.updatedAt).toLocaleString('ko-KR')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
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
