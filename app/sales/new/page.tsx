'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  purchaseVendor: {
    id: number
    name: string
  }
  salesVendors: {
    id: number
    vendorId: number
    vendor: {
      id: number
      name: string
    }
  }[]
  category: {
    id: number
    code: string
    nameKo: string
  } | null
}

interface Vendor {
  id: number
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

export default function NewSalesPage() {
  const router = useRouter()
  const [salespersons, setSalespersons] = useState<Salesperson[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(false)
  
  // Filtered products based on vendor and type
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  
  // Search states
  const [vendorSearch, setVendorSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'SALES',
    salespersonId: '',
    categoryId: '',
    productId: '',
    vendorId: '',
    itemName: '',
    customer: '',
    quantity: '',
    unitPrice: '',
    cost: '',
    notes: '',
  })

  useEffect(() => {
    fetchMasterData()
  }, [])

  const fetchMasterData = async () => {
    try {
      const [salespersonsRes, categoriesRes, productsRes, vendorsRes] = await Promise.all([
        fetch('/api/salesperson'),
        fetch('/api/categories'),
        fetch('/api/products'),
        fetch('/api/vendors'),
      ])

      const salespersonsData = await salespersonsRes.json()
      const categoriesData = await categoriesRes.json()
      const productsData = await productsRes.json()
      const vendorsData = await vendorsRes.json()

      setSalespersons(salespersonsData)
      setCategories(categoriesData)
      setProducts(productsData)
      setVendors(vendorsData)
    } catch (error) {
      console.error('Error fetching master data:', error)
      alert('기초 데이터 조회 중 오류가 발생했습니다.')
    }
  }

  const handleProductChange = (productId: string) => {
    if (productId) {
      const product = products.find((p) => p.id === parseInt(productId))
      if (product) {
        // Auto-fill category from product
        const categoryId = product.categoryId ? product.categoryId.toString() : ''
        
        // Auto-fill purchase price from product's defaultPurchasePrice
        const purchasePrice = product.defaultPurchasePrice || 0
        
        setFormData((prev) => ({ 
          ...prev, 
          productId, 
          itemName: product.name,
          categoryId: categoryId,
          cost: purchasePrice.toString(), // Set cost to purchase price
        }))
        
        // Fetch vendor-specific price if vendor is selected
        if (formData.vendorId) {
          fetchVendorPrice(parseInt(productId), parseInt(formData.vendorId), formData.date, formData.type)
        } else {
          // Use product's default sales price if available
          const salesPrice = product.defaultSalesPrice || 0
          setFormData((prev) => ({ 
            ...prev, 
            productId, 
            itemName: product.name, 
            categoryId: categoryId,
            cost: purchasePrice.toString(),
            unitPrice: salesPrice.toString() 
          }))
        }
      }
    } else {
      setFormData((prev) => ({ ...prev, productId: '', itemName: '', unitPrice: '', cost: '' }))
    }
  }

  const handleVendorChange = (vendorId: string) => {
    setFormData((prev) => ({ ...prev, vendorId, productId: '', itemName: '' }))
    setProductSearch('')
    
    if (vendorId) {
      if (formData.type === 'PURCHASE') {
        // 매입: 해당 거래처가 매입처인 품목
        const filtered = products.filter(p => p.purchaseVendorId === parseInt(vendorId))
        setAvailableProducts(filtered)
      } else {
        // 매출: 해당 거래처가 매출처로 등록된 품목
        const filtered = products.filter(p => 
          p.salesVendors?.some(sv => sv.vendorId === parseInt(vendorId))
        )
        setAvailableProducts(filtered)
      }
    } else {
      setAvailableProducts([])
    }
  }
  
  const handleTypeChange = (type: string) => {
    setFormData({ ...formData, type, vendorId: '', productId: '', itemName: '' })
    setAvailableProducts([])
    setVendorSearch('')
    setProductSearch('')
  }

  const fetchVendorPrice = async (productId: number, vendorId: number, date: string, type: string) => {
    try {
      const res = await fetch(`/api/vendor-product-prices?productId=${productId}&vendorId=${vendorId}`)
      const prices: VendorPrice[] = await res.json()
      
      if (prices.length > 0) {
        // Get the most recent price before or on the transaction date
        const transactionDate = new Date(date)
        const applicablePrice = prices
          .filter((p: VendorPrice) => new Date(p.effectiveDate) <= transactionDate)
          .sort((a: VendorPrice, b: VendorPrice) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0]
        
        if (applicablePrice) {
          const price = type === 'PURCHASE' ? applicablePrice.purchasePrice : applicablePrice.salesPrice
          if (price) {
            setFormData((prev) => ({ ...prev, unitPrice: price.toString() }))
            return
          }
        }
      }
      
      // Fall back to product's default price
      const product = products.find((p) => p.id === productId)
      if (product) {
        const salesPrice = product.defaultSalesPrice || 0
        setFormData((prev) => ({ ...prev, unitPrice: salesPrice.toString() }))
      }
    } catch (error) {
      console.error('Error fetching vendor price:', error)
      // Fall back to product's default price
      const product = products.find((p) => p.id === productId)
      if (product) {
        const salesPrice = product.defaultSalesPrice || 0
        setFormData((prev) => ({ ...prev, unitPrice: salesPrice.toString() }))
      }
    }
  }

  const handleDateChange = (date: string) => {
    setFormData((prev) => ({ ...prev, date }))
    
    // 날짜 변경 시 품목이 선택되어 있으면 단가 재계산
    if (formData.productId) {
      if (formData.vendorId) {
        fetchVendorPrice(parseInt(formData.productId), parseInt(formData.vendorId), date, formData.type)
      } else {
        const product = products.find((p) => p.id === parseInt(formData.productId))
        if (product) {
          const salesPrice = product.defaultSalesPrice || 0
          setFormData((prev) => ({ ...prev, date, unitPrice: salesPrice.toString() }))
        }
      }
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
    setLoading(true)

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '등록 중 오류가 발생했습니다.')
        return
      }

      alert('매입매출이 등록되었습니다.')
      router.push('/sales')
    } catch (error) {
      console.error('Error creating sales record:', error)
      alert('등록 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
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
    const cost = parseFloat(formData.cost) || 0
    return amount - cost
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">매입매출 등록</h1>
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
                onChange={(e) => handleDateChange(e.target.value)}
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
                onChange={(e) => handleTypeChange(e.target.value)}
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

          {/* 거래처/고객 - 거래처 먼저 선택하도록 순서 변경 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                거래처 선택 * {formData.type === 'PURCHASE' && <span className="text-xs text-blue-600">(매입 거래처만 표시)</span>}
                {formData.type === 'SALES' && <span className="text-xs text-blue-600">(매출 거래처만 표시)</span>}
              </label>
              <select
                required
                value={formData.vendorId}
                onChange={(e) => handleVendorChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
              >
                <option value="">거래처를 선택하세요</option>
                {filteredVendors
                  .filter(v => 
                    v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
                    v.code.toLowerCase().includes(vendorSearch.toLowerCase())
                  )
                  .map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      [{vendor.code}] {vendor.name}
                    </option>
                  ))}
              </select>
            </div>

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
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                품목 선택 <span className="text-xs text-blue-600">(선택한 거래처의 품목만 표시)</span>
              </label>
              <select
                value={formData.productId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                disabled={!formData.vendorId}
              >
                <option value="">{formData.vendorId ? '품목을 선택하세요' : '거래처를 먼저 선택하세요'}</option>
                {availableProducts
                  .filter(p => 
                    p.name.toLowerCase().includes(productSearch.toLowerCase())
                  )
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.unit})
                    </option>
                  ))}
              </select>
            </div>

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
                단가 * {formData.productId && <span className="text-xs text-blue-600">(품목 단가 자동 적용됨)</span>}
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
                  원가 {formData.productId && <span className="text-xs text-blue-600">(품목에서 자동 설정됨)</span>}
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
                  disabled={!!formData.productId}
                />
              </div>
            )}
          </div>

          {/* 계산 결과 표시 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-3 text-gray-900">계산 결과</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">금액</div>
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
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? '저장 중...' : '저장'}
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
