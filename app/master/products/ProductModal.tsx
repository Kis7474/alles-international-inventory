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

interface ProductPriceHistory {
  id: number
  effectiveDate: string
  purchasePrice: number | null
  salesPrice: number | null
  notes: string | null
}

interface ProductMonthlyCost {
  id: number
  yearMonth: string
  baseCost: number
  storageCost: number
  totalCost: number
  quantity: number
}

interface SalesVendorWithPrice {
  id: number
  vendorId: number
  vendor: Vendor
  currentPrice: number | null
  effectiveDate: string | null
}

interface ProductDetail {
  id: number
  code: string | null
  name: string
  unit: string
  type: string
  categoryId: number | null
  category: Category | null
  description: string | null
  defaultPurchasePrice: number | null
  currentCost: number | null
  purchaseVendorId: number | null
  purchaseVendor: Vendor | null
  priceHistory: ProductPriceHistory[]
  monthlyCosts: ProductMonthlyCost[]
  salesVendorsWithPrices: SalesVendorWithPrice[]
}

interface ProductModalProps {
  productId: number | null  // null이면 신규 등록
  onClose: () => void
  onSave: (product: ProductDetail) => void
}

export default function ProductModal({ productId, onClose, onSave }: ProductModalProps) {
  const [isEditMode, setIsEditMode] = useState(productId === null)
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(productId !== null)
  const [saving, setSaving] = useState(false)
  const [showPriceHistory, setShowPriceHistory] = useState(false)
  const [showMonthlyCosts, setShowMonthlyCosts] = useState(false)

  // Master data
  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])

  // Form data for edit/create
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    unit: 'EA',
    categoryId: '',
    description: '',
    purchaseVendorId: '',
  })

  // Sales vendors with prices
  const [salesVendors, setSalesVendors] = useState<Array<{
    vendorId: number
    salesPrice: number | null
    vendor?: Vendor
  }>>([])
  const [newVendorId, setNewVendorId] = useState('')
  const [newSalesPrice, setNewSalesPrice] = useState('')

  useEffect(() => {
    fetchMasterData()
    if (productId) {
      fetchProductDetail()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const fetchMasterData = async () => {
    try {
      const [categoriesRes, vendorsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/vendors'),
      ])
      const categoriesData = await categoriesRes.json()
      const vendorsData = await vendorsRes.json()
      setCategories(categoriesData)
      setVendors(vendorsData)
    } catch (error) {
      console.error('Error fetching master data:', error)
    }
  }

  const fetchProductDetail = async () => {
    if (!productId) return
    
    try {
      const res = await fetch(`/api/products/${productId}`)
      const data = await res.json()
      setProduct(data)
      
      // Initialize form data
      setFormData({
        code: data.code || '',
        name: data.name,
        unit: data.unit,
        categoryId: data.categoryId?.toString() || '',
        description: data.description || '',
        purchaseVendorId: data.purchaseVendorId?.toString() || '',
      })

      // Initialize sales vendors
      setSalesVendors(
        data.salesVendorsWithPrices.map((sv: SalesVendorWithPrice) => ({
          vendorId: sv.vendorId,
          salesPrice: sv.currentPrice,
          vendor: sv.vendor,
        }))
      )
    } catch (error) {
      console.error('Error fetching product detail:', error)
      alert('품목 상세 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name) {
      alert('품목명은 필수입니다.')
      return
    }

    if (!formData.purchaseVendorId) {
      alert('매입 거래처를 선택해주세요.')
      return
    }

    setSaving(true)
    try {
      const url = '/api/products'
      const method = productId ? 'PUT' : 'POST'
      const body = {
        ...(productId ? { id: productId } : {}),
        code: formData.code || null,
        name: formData.name,
        unit: formData.unit,
        categoryId: formData.categoryId || null,
        description: formData.description || null,
        purchaseVendorId: formData.purchaseVendorId,
        salesVendorIds: salesVendors.map(sv => sv.vendorId.toString()),
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || '저장 중 오류가 발생했습니다.')
        return
      }

      const savedProduct = await res.json()

      // If there are sales vendors with prices, save them to VendorProductPrice
      if (salesVendors.some(sv => sv.salesPrice !== null)) {
        await Promise.all(
          salesVendors
            .filter(sv => sv.salesPrice !== null)
            .map(sv => 
              fetch('/api/vendor-product-prices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  vendorId: sv.vendorId,
                  productId: savedProduct.id,
                  salesPrice: sv.salesPrice,
                  effectiveDate: new Date().toISOString(),
                  memo: '품목 등록/수정 시 설정',
                }),
              }).catch(() => {
                // Ignore duplicate errors - they're expected
              })
            )
        )
      }

      onSave(savedProduct)
    } catch (error) {
      console.error('Error saving product:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    if (productId) {
      // Editing existing product - revert to view mode
      setIsEditMode(false)
      fetchProductDetail() // Reload original data
    } else {
      // Creating new product - close modal
      onClose()
    }
  }

  const addSalesVendor = () => {
    if (!newVendorId) {
      alert('거래처를 선택해주세요.')
      return
    }

    if (salesVendors.some(sv => sv.vendorId === parseInt(newVendorId))) {
      alert('이미 추가된 거래처입니다.')
      return
    }

    const vendor = vendors.find(v => v.id === parseInt(newVendorId))
    setSalesVendors([
      ...salesVendors,
      {
        vendorId: parseInt(newVendorId),
        salesPrice: newSalesPrice ? parseFloat(newSalesPrice) : null,
        vendor,
      },
    ])
    setNewVendorId('')
    setNewSalesPrice('')
  }

  const removeSalesVendor = (vendorId: number) => {
    setSalesVendors(salesVendors.filter(sv => sv.vendorId !== vendorId))
  }

  const updateSalesPrice = (vendorId: number, price: string) => {
    setSalesVendors(
      salesVendors.map(sv =>
        sv.vendorId === vendorId
          ? { ...sv, salesPrice: price ? parseFloat(price) : null }
          : sv
      )
    )
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-xl text-gray-700">로딩 중...</div>
        </div>
      </div>
    )
  }

  const availableVendors = vendors.filter(
    v =>
      (v.type === 'DOMESTIC_SALES' || v.type === 'INTERNATIONAL_SALES') &&
      !salesVendors.some(sv => sv.vendorId === v.id)
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {productId ? '품목 상세 정보' : '품목 등록'}
          </h2>
          <div className="flex gap-2">
            {!isEditMode && productId && (
              <button
                onClick={() => setIsEditMode(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                편집
              </button>
            )}
            {isEditMode && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  취소
                </button>
              </>
            )}
            {!isEditMode && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl px-2"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 기본 정보 섹션 */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">기본 정보</h3>
            {isEditMode ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    품목코드
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    품목명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-gray-900"
                  >
                    <option value="">선택</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nameKo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    단위 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-gray-900"
                    placeholder="EA, BOX, KG 등"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md text-gray-900"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">품목코드</label>
                  <p className="text-gray-900">{product?.code || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">품목명</label>
                  <p className="text-gray-900">{product?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">카테고리</label>
                  <p className="text-gray-900">{product?.category?.nameKo || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">단위</label>
                  <p className="text-gray-900">{product?.unit}</p>
                </div>
                {product?.description && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-600">설명</label>
                    <p className="text-gray-900">{product.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 매입 정보 섹션 */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">매입 정보</h3>
            {isEditMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    매입거래처 <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.purchaseVendorId}
                    onChange={(e) => setFormData({ ...formData, purchaseVendorId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-gray-900"
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
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">매입거래처</label>
                  <p className="text-gray-900">
                    {product?.purchaseVendor ? `[${product.purchaseVendor.code}] ${product.purchaseVendor.name}` : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">현재 원가 (창고료 포함)</label>
                  <p className="text-gray-900 font-semibold text-green-700">
                    {product?.currentCost ? formatCurrency(product.currentCost) : '-'}
                  </p>
                  <p className="text-xs text-gray-500">자동 계산 (읽기전용)</p>
                </div>
              </div>
            )}

            {/* 매입가 이력 - 항상 읽기전용 */}
            {!isEditMode && product && (
              <div className="mt-4">
                <button
                  onClick={() => setShowPriceHistory(!showPriceHistory)}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <span className="mr-2">{showPriceHistory ? '▼' : '▶'}</span>
                  매입가 이력 ({product.priceHistory.filter(h => h.purchasePrice !== null).length})
                </button>
                
                {showPriceHistory && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">적용일</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">매입가</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">비고</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {product.priceHistory
                          .filter(h => h.purchasePrice !== null)
                          .map((history) => (
                            <tr key={history.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {new Date(history.effectiveDate).toLocaleDateString('ko-KR')}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                {history.purchasePrice ? formatCurrency(history.purchasePrice) : '-'}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {history.notes || '-'}
                              </td>
                            </tr>
                          ))}
                        {product.priceHistory.filter(h => h.purchasePrice !== null).length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-2 text-center text-gray-500">
                              이력이 없습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 매출 정보 섹션 */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">매출 정보</h3>
            
            {isEditMode ? (
              <div className="space-y-4">
                {/* 매출거래처 목록 - 편집 가능 */}
                {salesVendors.length > 0 && (
                  <div className="space-y-2">
                    {salesVendors.map((sv) => (
                      <div key={sv.vendorId} className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                        <span className="flex-1 text-gray-900">
                          {sv.vendor ? `[${sv.vendor.code}] ${sv.vendor.name}` : `거래처 #${sv.vendorId}`}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={sv.salesPrice || ''}
                          onChange={(e) => updateSalesPrice(sv.vendorId, e.target.value)}
                          placeholder="매출가"
                          className="w-32 px-3 py-2 border rounded-md text-gray-900"
                        />
                        <button
                          onClick={() => removeSalesVendor(sv.vendorId)}
                          className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 매출거래처 추가 */}
                <div className="flex gap-2">
                  <select
                    value={newVendorId}
                    onChange={(e) => setNewVendorId(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md text-gray-900"
                  >
                    <option value="">매출 거래처 선택</option>
                    {availableVendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        [{vendor.code}] {vendor.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={newSalesPrice}
                    onChange={(e) => setNewSalesPrice(e.target.value)}
                    placeholder="매출가 (선택)"
                    className="w-32 px-3 py-2 border rounded-md text-gray-900"
                  />
                  <button
                    onClick={addSalesVendor}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    추가
                  </button>
                </div>
              </div>
            ) : (
              <>
                {product && product.salesVendorsWithPrices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">거래처</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">매출가</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">적용일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {product.salesVendorsWithPrices.map((sv) => (
                          <tr key={sv.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              [{sv.vendor.code}] {sv.vendor.name}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">
                              {sv.currentPrice ? formatCurrency(sv.currentPrice) : '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {sv.effectiveDate ? new Date(sv.effectiveDate).toLocaleDateString('ko-KR') : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">등록된 매출거래처가 없습니다.</p>
                )}
              </>
            )}
          </div>

          {/* 월별 원가 이력 - 항상 읽기전용 */}
          {!isEditMode && product && (
            <div className="border rounded-lg p-4">
              <button
                onClick={() => setShowMonthlyCosts(!showMonthlyCosts)}
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <span className="mr-2">{showMonthlyCosts ? '▼' : '▶'}</span>
                월별 원가 이력 ({product.monthlyCosts.length})
              </button>

              {showMonthlyCosts && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">년월</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">기본원가</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">창고료</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">총원가</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">수량</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {product.monthlyCosts.map((mc) => (
                        <tr key={mc.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{mc.yearMonth}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {formatCurrency(mc.baseCost)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {formatCurrency(mc.storageCost)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">
                            {formatCurrency(mc.totalCost)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {mc.quantity.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {product.monthlyCosts.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-center text-gray-500">
                            이력이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {!isEditMode && (
          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end border-t">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
