'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Autocomplete from '@/components/ui/Autocomplete'

interface Salesperson {
  id: number
  code: string
  name: string
  commissionRate: number
}

interface Category {
  id: number
  code: string
  nameKo: string
}

interface Product {
  id: number
  name: string
  unit: string
  categoryId: number | null
  defaultPurchasePrice: number | null
  defaultSalesPrice: number | null
  purchaseVendorId: number
  currentCost: number | null
  vendorPrices: {
    id: number
    vendorId: number
    vendor: {
      id: number
      name: string
    }
    purchasePrice: number | null
    salesPrice: number | null
    effectiveDate: string
  }[]
}

interface Vendor {
  id: number
  code: string
  name: string
  type: string
}

interface VendorPrice {
  id: number
  productId: number
  vendorId: number
  purchasePrice: number | null
  salesPrice: number | null
  effectiveDate: string
}

export default function EditSalesPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [salespersons, setSalespersons] = useState<Salesperson[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Filtered products based on vendor and type
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  
  const [formData, setFormData] = useState({
    date: '',
    type: 'SALES',
    salespersonId: '',
    categoryId: '',
    vendorId: '',
    productId: '',
    itemName: '',
    customer: '',
    quantity: '',
    unitPrice: '',
    cost: '',
    notes: '',
  })

  useEffect(() => {
    // Fetch data once on mount when ID is available
    // fetchData shouldn't change after initial render, and we only want to fetch when id changes
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchData = async () => {
    try {
      const [salesRes, salespersonsRes, categoriesRes, productsRes, vendorsRes] = await Promise.all([
        fetch(`/api/sales/${id}`),
        fetch('/api/salesperson'),
        fetch('/api/categories'),
        fetch('/api/products'),
        fetch('/api/vendors'),
      ])

      const salesData = await salesRes.json()
      const salespersonsData = await salespersonsRes.json()
      const categoriesData = await categoriesRes.json()
      const productsData = await productsRes.json()
      const vendorsData = await vendorsRes.json()

      setSalespersons(salespersonsData)
      setCategories(categoriesData)
      setProducts(productsData)
      setVendors(vendorsData)

      const loadedFormData = {
        date: new Date(salesData.date).toISOString().split('T')[0],
        type: salesData.type,
        salespersonId: salesData.salespersonId.toString(),
        categoryId: salesData.categoryId.toString(),
        vendorId: salesData.vendorId ? salesData.vendorId.toString() : '',
        productId: salesData.productId ? salesData.productId.toString() : '',
        itemName: salesData.itemName,
        customer: salesData.customer || '',
        quantity: salesData.quantity.toString(),
        unitPrice: salesData.unitPrice.toString(),
        cost: salesData.cost.toString(),
        notes: salesData.notes || '',
      }
      
      setFormData(loadedFormData)
      
      // Phase 5: 기존 값이 있으면 품목 필터링
      if (loadedFormData.vendorId) {
        filterProductsByVendor(loadedFormData.vendorId, loadedFormData.type, productsData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('데이터 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // Phase 5: 거래처에 따라 품목 필터링
  const filterProductsByVendor = (vendorId: string, type: string, productList: Product[] = products) => {
    if (vendorId) {
      if (type === 'PURCHASE') {
        // 매입: 해당 거래처가 매입처인 품목
        const filtered = productList.filter(p => p.purchaseVendorId === parseInt(vendorId))
        setAvailableProducts(filtered)
      } else {
        // 매출: vendorPrices에서 해당 거래처에 salesPrice가 있는 품목 필터
        const filtered = productList.filter(p => 
          p.vendorPrices?.some(vp => vp.vendorId === parseInt(vendorId) && vp.salesPrice !== null)
        )
        setAvailableProducts(filtered)
      }
    } else {
      setAvailableProducts([])
    }
  }

  // Phase 5: 거래처 변경 핸들러
  const handleVendorChange = (vendorId: string) => {
    const prevProductId = formData.productId
    
    // 품목 목록 필터링
    filterProductsByVendor(vendorId, formData.type)
    
    // Phase 5: 이전 품목이 새 거래처에서도 유효하면 유지
    if (prevProductId && vendorId) {
      const product = products.find(p => p.id === parseInt(prevProductId))
      if (product) {
        let isValid = false
        if (formData.type === 'PURCHASE') {
          isValid = product.purchaseVendorId === parseInt(vendorId)
        } else {
          isValid = product.vendorPrices?.some(vp => vp.vendorId === parseInt(vendorId) && vp.salesPrice !== null) || false
        }
        
        if (isValid) {
          // 품목 유지하고 단가만 재조회
          setFormData(prev => ({ ...prev, vendorId }))
          fetchVendorPrice(parseInt(prevProductId), parseInt(vendorId), formData.date, formData.type)
          return
        }
      }
    }
    
    // 품목 리셋
    setFormData(prev => ({ ...prev, vendorId, productId: '', itemName: '', unitPrice: '', cost: '' }))
  }

  // Phase 5: 품목 변경 핸들러
  const handleProductChange = (productId: string) => {
    if (productId) {
      const product = products.find(p => p.id === parseInt(productId))
      if (product) {
        const categoryId = product.categoryId ? product.categoryId.toString() : ''
        
        // Phase 5: 원가 자동 설정 (currentCost 사용)
        const cost = product.currentCost || 0
        
        setFormData(prev => ({ 
          ...prev, 
          productId, 
          itemName: product.name,
          categoryId: categoryId,
          cost: cost.toString(),
        }))
        
        // 거래처가 선택되어 있으면 단가 자동 조회
        if (formData.vendorId) {
          fetchVendorPrice(parseInt(productId), parseInt(formData.vendorId), formData.date, formData.type)
        } else {
          // 거래처 없으면 기본 단가 사용 (거래유형에 따라)
          const defaultPrice = formData.type === 'PURCHASE' 
            ? (product.defaultPurchasePrice || 0)
            : (product.defaultSalesPrice || 0)
          setFormData(prev => ({ 
            ...prev, 
            productId, 
            itemName: product.name, 
            categoryId: categoryId,
            unitPrice: defaultPrice.toString(),
            cost: cost.toString(),
          }))
        }
      }
    } else {
      setFormData(prev => ({ ...prev, productId: '', itemName: '', unitPrice: '', cost: '' }))
    }
  }

  // Phase 5: 거래처별 단가 조회
  const fetchVendorPrice = async (productId: number, vendorId: number, date: string, type: string) => {
    try {
      const res = await fetch(`/api/vendor-product-prices?productId=${productId}&vendorId=${vendorId}`)
      const prices: VendorPrice[] = await res.json()
      
      if (prices.length > 0) {
        const transactionDate = new Date(date)
        const applicablePrice = prices
          .filter(p => new Date(p.effectiveDate) <= transactionDate)
          .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0]
        
        if (applicablePrice) {
          const price = type === 'PURCHASE' ? applicablePrice.purchasePrice : applicablePrice.salesPrice
          if (price && price > 0) {
            setFormData(prev => ({ ...prev, unitPrice: price.toString() }))
            return
          }
        }
      }
      
      // Phase 5: 단가가 0이면 경고 표시
      const product = products.find(p => p.id === productId)
      if (product) {
        const defaultPrice = type === 'PURCHASE' 
          ? (product.defaultPurchasePrice || 0)
          : (product.defaultSalesPrice || 0)
        if (defaultPrice === 0) {
          alert('⚠️ 단가가 설정되지 않았습니다. 수동으로 입력해주세요.')
        }
        setFormData(prev => ({ ...prev, unitPrice: defaultPrice.toString() }))
      }
    } catch (error) {
      console.error('Error fetching vendor price:', error)
      alert('⚠️ 단가 조회 중 오류가 발생했습니다.')
    }
  }

  // Filter vendors based on transaction type
  const filteredVendors = vendors.filter((vendor) => {
    if (formData.type === 'PURCHASE') {
      return vendor.type === 'DOMESTIC_PURCHASE' || vendor.type === 'INTERNATIONAL_PURCHASE'
    } else if (formData.type === 'SALES') {
      return vendor.type === 'DOMESTIC_SALES' || vendor.type === 'INTERNATIONAL_SALES'
    }
    return true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/sales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(id), ...formData }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '수정 중 오류가 발생했습니다.')
        return
      }

      alert('매입매출이 수정되었습니다.')
      router.push('/sales')
    } catch (error) {
      console.error('Error updating sales record:', error)
      alert('수정 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const calculateAmount = () => {
    const quantity = parseFloat(formData.quantity) || 0
    const unitPrice = parseFloat(formData.unitPrice) || 0
    return quantity * unitPrice
  }

  const calculateMargin = () => {
    if (formData.type !== 'SALES') return 0
    const amount = calculateAmount()
    const unitCost = parseFloat(formData.cost) || 0
    const quantity = parseFloat(formData.quantity) || 0
    const totalCost = unitCost * quantity
    return amount - totalCost
  }

  const calculateMarginRate = () => {
    const amount = calculateAmount()
    if (amount === 0) return 0
    const margin = calculateMargin()
    return (margin / amount) * 100
  }

  const getCommissionRate = () => {
    const selectedSalesperson = salespersons.find(
      (sp) => sp.id === parseInt(formData.salespersonId)
    )
    return selectedSalesperson?.commissionRate || 0
  }

  const calculateCommission = () => {
    if (formData.type !== 'SALES') return 0
    const margin = calculateMargin()
    const commissionRate = getCommissionRate()
    return margin * commissionRate
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
        <h1 className="text-3xl font-bold text-gray-900">매입매출 수정</h1>
        <Link
          href="/sales"
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
        >
          목록으로
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                날짜 *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => {
                  const newDate = e.target.value
                  setFormData({ ...formData, date: newDate })
                  // 날짜 변경 시 품목이 선택되어 있으면 단가 재조회
                  if (formData.productId && formData.vendorId) {
                    fetchVendorPrice(parseInt(formData.productId), parseInt(formData.vendorId), newDate, formData.type)
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                거래유형 *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value
                  // 거래유형 변경 시 연관 데이터 초기화
                  setFormData({ 
                    ...formData, 
                    type: newType,
                    vendorId: '', // 거래처 리셋
                    productId: '', // 품목 리셋
                    itemName: '', // 품목명 리셋
                    unitPrice: '', // 단가 리셋
                  })
                  setAvailableProducts([]) // 품목 목록 초기화
                }}
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
              >
                <option value="SALES">매출</option>
                <option value="PURCHASE">매입</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                담당자 *
              </label>
              <select
                required
                value={formData.salespersonId}
                onChange={(e) =>
                  setFormData({ ...formData, salespersonId: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
              >
                <option value="">선택하세요</option>
                {salespersons.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                    {sp.commissionRate > 0 && ` (커미션 ${sp.commissionRate * 100}%)`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Phase 5: 거래처/고객 - 거래처 먼저 선택하도록 순서 변경 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Autocomplete
              label={`거래처 선택 ${formData.type === 'PURCHASE' ? '(매입 거래처만 표시)' : '(매출 거래처만 표시)'}`}
              required
              options={filteredVendors.map(v => ({
                id: v.id,
                label: v.name,
                sublabel: v.code
              }))}
              value={formData.vendorId}
              onChange={(value) => handleVendorChange(value)}
              placeholder="거래처를 검색하세요"
            />

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                거래처/고객명 (참고용)
              </label>
              <input
                type="text"
                value={formData.customer}
                onChange={(e) =>
                  setFormData({ ...formData, customer: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                placeholder="참고용 거래처명 입력 (선택)"
              />
            </div>
          </div>

          {/* 품목 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Autocomplete
              label="품목 선택 (선택한 거래처의 품목만 표시)"
              options={availableProducts.map(p => ({
                id: p.id,
                label: p.name,
                sublabel: p.unit
              }))}
              value={formData.productId}
              onChange={(value) => handleProductChange(value)}
              placeholder={formData.vendorId ? '품목을 검색하세요' : '거래처를 먼저 선택하세요'}
              disabled={!formData.vendorId}
            />

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                카테고리 * {formData.productId && <span className="text-xs text-blue-600">(품목에서 자동 설정됨)</span>}
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData({ ...formData, categoryId: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                disabled={!!formData.productId}
              >
                <option value="">선택하세요</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nameKo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              품목명 *
            </label>
            <input
              type="text"
              required
              value={formData.itemName}
              onChange={(e) =>
                setFormData({ ...formData, itemName: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
              placeholder="품목명을 입력하세요 (또는 위에서 품목 선택)"
              disabled={!!formData.productId}
            />
          </div>

          {/* 금액 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                수량 *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                {formData.type === 'PURCHASE' ? '매입단가' : '매출단가'} * {formData.productId && <span className="text-xs text-blue-600">(품목 단가 자동 적용됨)</span>}
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.unitPrice}
                onChange={(e) =>
                  setFormData({ ...formData, unitPrice: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                placeholder="0"
              />
            </div>

            {formData.type === 'SALES' && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  원가 {formData.productId && <span className="text-xs text-blue-600">(품목에서 자동 설정됨, 수정 가능)</span>}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="0"
                />
              </div>
            )}
          </div>

          {/* 계산 결과 표시 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-3 text-gray-900">계산 결과</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">공급가액</div>
                <div className="text-lg font-bold text-gray-900">
                  ₩{calculateAmount().toLocaleString()}
                </div>
              </div>
              {formData.type === 'SALES' && (
                <>
                  <div>
                    <div className="text-sm text-gray-600">마진</div>
                    <div className="text-lg font-bold text-green-600">
                      ₩{calculateMargin().toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">마진율</div>
                    <div className="text-lg font-bold text-purple-600">
                      {calculateMarginRate().toFixed(1)}%
                    </div>
                  </div>
                  {getCommissionRate() > 0 && (
                    <div>
                      <div className="text-sm text-gray-600">
                        커미션 ({getCommissionRate() * 100}%)
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        ₩{calculateCommission().toLocaleString()}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 비고 */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              비고
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
              rows={3}
              placeholder="비고 사항을 입력하세요"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <Link
              href="/sales"
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
