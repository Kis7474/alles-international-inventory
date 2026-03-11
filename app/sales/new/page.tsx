'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  currentCost: number | null
  purchaseVendorId: number
  purchaseVendor: {
    id: number
    name: string
  }
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
  category: {
    id: number
    code: string
    nameKo: string
  } | null
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


interface BulkLineForm {
  productId: string
  itemName: string
  quantity: string
  unitPrice: string
  cost: string
  purchasePriceOverride: string
  autoCreatePurchase: boolean
  notes: string
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
  const [bulkLines, setBulkLines] = useState<BulkLineForm[]>([
    {
      productId: '',
      itemName: '',
      quantity: '',
      unitPrice: '',
      cost: '',
      purchasePriceOverride: '',
      autoCreatePurchase: true,
      notes: '',
    },
  ])

  
  // Phase 4: vendorSearch and productSearch removed - now using Autocomplete component
  
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
    purchasePriceOverride: '', // 매입가 오버라이드
    autoCreatePurchase: true,
  })

  useEffect(() => {
    fetchMasterData()
  }, [])

  const fetchMasterData = async () => {
    try {
      const [salespersonsRes, categoriesRes, productsRes, vendorsRes] = await Promise.all([
        fetch('/api/salesperson', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/vendors', { cache: 'no-store' }),
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

  const toDateOnly = (value: string | Date) => {
    const d = new Date(value)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }

  const handleVendorChange = (vendorId: string) => {
    const prevProductId = formData.productId
    
    if (vendorId) {
      if (formData.type === 'PURCHASE') {
        // 매입: 해당 거래처가 매입처인 품목
        const filtered = products.filter(p => p.purchaseVendorId === parseInt(vendorId))
        setAvailableProducts(filtered)
      } else {
        // 매출: vendorPrices에서 해당 거래처에 salesPrice가 있는 품목 필터
        const filtered = products.filter(p => 
          p.vendorPrices?.some(vp => vp.vendorId === parseInt(vendorId) && vp.salesPrice !== null)
        )
        setAvailableProducts(filtered)
      }
    } else {
      setAvailableProducts([])
    }
    
    // Phase 5: 이전 품목이 새 거래처에서도 유효하면 유지하고 단가만 재조회
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
          setFormData((prev) => ({ ...prev, vendorId }))
          fetchVendorPrice(parseInt(prevProductId), parseInt(vendorId), formData.date, formData.type)
          return
        }
      }
    }
    
    // 품목 리셋
    setFormData((prev) => ({ ...prev, vendorId, productId: '', itemName: '' }))
  }
  
  const handleTypeChange = (type: string) => {
    setFormData({ ...formData, type, vendorId: '', productId: '', itemName: '' })
    setAvailableProducts([])
  }

  const fetchVendorPrice = async (productId: number, vendorId: number, date: string, type: string) => {
    try {
      const res = await fetch(`/api/vendor-product-prices?productId=${productId}&vendorId=${vendorId}`)
      const prices: VendorPrice[] = await res.json()
      const transactionDate = toDateOnly(date)
      
      if (prices.length > 0) {
        const applicablePrice = prices
          .filter((p: VendorPrice) => toDateOnly(p.effectiveDate) <= transactionDate)
          .sort((a: VendorPrice, b: VendorPrice) => toDateOnly(b.effectiveDate).getTime() - toDateOnly(a.effectiveDate).getTime())[0]
        
        if (applicablePrice) {
          const price = type === 'PURCHASE' ? applicablePrice.purchasePrice : applicablePrice.salesPrice
          if (price && price > 0) {
            setFormData((prev) => ({ ...prev, unitPrice: price.toString() }))
            return
          }
        }
      }

      if (type === 'SALES') {
        setFormData((prev) => ({ ...prev, unitPrice: '' }))
        alert('선택한 거래처의 매출단가가 없습니다. 거래처별 가격을 등록해주세요.')
        return
      }

      const product = products.find((p) => p.id === productId)
      if (product) {
        const defaultPrice = product.defaultPurchasePrice || product.currentCost || 0
        if (defaultPrice === 0) {
          alert('⚠️ 매입단가가 설정되지 않았습니다. 수동으로 입력해주세요.')
        }
        setFormData((prev) => ({ ...prev, unitPrice: defaultPrice.toString() }))
      }
    } catch (error) {
      console.error('Error fetching vendor price:', error)
      if (type === 'SALES') {
        setFormData((prev) => ({ ...prev, unitPrice: '' }))
        alert('⚠️ 거래처별 매출단가 조회 중 오류가 발생했습니다.')
      } else {
        const product = products.find((p) => p.id === productId)
        if (product) {
          const defaultPrice = product.defaultPurchasePrice || product.currentCost || 0
          if (defaultPrice === 0) {
            alert('⚠️ 매입단가 조회 중 오류가 발생했습니다. 수동으로 입력해주세요.')
          }
          setFormData((prev) => ({ ...prev, unitPrice: defaultPrice.toString() }))
        }
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
          const defaultPrice = product.defaultPurchasePrice || product.currentCost || 0
          setFormData((prev) => ({ ...prev, date, unitPrice: formData.type === 'SALES' ? '' : defaultPrice.toString() }))
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

  const updateBulkLine = (index: number, patch: Partial<BulkLineForm>) => {
    setBulkLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const addBulkLine = () => {
    setBulkLines((prev) => [
      ...prev,
      {
        productId: '',
        itemName: '',
        quantity: '',
        unitPrice: '',
        cost: '',
        purchasePriceOverride: '',
        autoCreatePurchase: formData.autoCreatePurchase,
        notes: '',
      },
    ])
  }

  const removeBulkLine = (index: number) => {
    setBulkLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleBulkProductChange = async (index: number, productId: string) => {
    const product = products.find((p) => p.id === parseInt(productId, 10))
    if (!product) return

    let unitPrice = ''
    if (formData.vendorId) {
      try {
        const res = await fetch(`/api/vendor-product-prices?productId=${product.id}&vendorId=${formData.vendorId}`)
        const prices: VendorPrice[] = await res.json()
        const txDate = toDateOnly(formData.date)
        const applicable = prices
          .filter((p) => toDateOnly(p.effectiveDate) <= txDate)
          .sort((a, b) => toDateOnly(b.effectiveDate).getTime() - toDateOnly(a.effectiveDate).getTime())[0]

        const price = formData.type === 'SALES' ? applicable?.salesPrice : applicable?.purchasePrice
        if (price && price > 0) unitPrice = String(price)
      } catch (e) {
        console.error('bulk price lookup failed', e)
      }
    }

    updateBulkLine(index, {
      productId,
      itemName: product.name,
      cost: String(product.currentCost || 0),
      purchasePriceOverride: String(product.defaultPurchasePrice || product.currentCost || 0),
      unitPrice,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
        if (!formData.date || !formData.type || !formData.salespersonId || !formData.categoryId) {
        alert('날짜/거래유형/담당자/카테고리를 먼저 입력해주세요.')
        setLoading(false)
        return
      }

      const invalidLine = bulkLines.find((line) => !line.productId || !line.quantity || !line.unitPrice)
        if (invalidLine) {
          alert('다품목 모드에서는 각 라인의 품목/수량/단가를 입력해주세요.')
          setLoading(false)
          return
        }

        const res = await fetch('/api/sales/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            header: {
              date: formData.date,
              type: formData.type,
              salespersonId: formData.salespersonId,
              categoryId: formData.categoryId,
              vendorId: formData.vendorId,
              customer: formData.customer,
              notes: formData.notes,
              autoCreatePurchaseDefault: formData.autoCreatePurchase,
            },
            lines: bulkLines.map((line, idx) => ({
              lineNo: idx + 1,
              productId: line.productId,
              itemName: line.itemName,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              cost: line.cost,
              purchasePriceOverride: line.purchasePriceOverride,
              autoCreatePurchase: line.autoCreatePurchase,
              notes: line.notes,
            })),
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          const lineError = data?.lineErrors?.[0]
          alert(lineError ? `${lineError.lineNo}행 오류: ${lineError.message}` : (data.error || '다품목 등록 중 오류가 발생했습니다.'))
          setLoading(false)
          return
        }

        alert(`다품목 등록 완료 (매출 ${data.summary?.createdSales || 0}건)`)
        router.push('/sales')
        return
    } catch (error) {
      console.error('Error creating sales record:', error)
      alert('등록 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
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

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">카테고리 *</label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
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

          {/* 거래처/고객 - 거래처 먼저 선택하도록 순서 변경 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phase 4: Autocomplete for vendor */}
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-blue-900">다품목 입력</h3>
                <button type="button" onClick={addBulkLine} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">+ 행 추가</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-2 py-1 text-left">품목</th>
                      <th className="px-2 py-1 text-right">수량</th>
                      <th className="px-2 py-1 text-right">단가</th>
                      <th className="px-2 py-1 text-right">원가</th>
                      <th className="px-2 py-1 text-center">자동매입</th>
                      <th className="px-2 py-1 text-center">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkLines.map((line, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-2 py-1">
                          <select
                            value={line.productId}
                            onChange={(e) => handleBulkProductChange(index, e.target.value)}
                            className="w-full border rounded px-2 py-1 text-gray-900"
                          >
                            <option value="">선택하세요</option>
                            {(availableProducts.length > 0 ? availableProducts : products).map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input type="number" step="1" min="1" value={line.quantity} onChange={(e) => updateBulkLine(index, { quantity: e.target.value })} className="w-24 border rounded px-2 py-1 text-right text-gray-900" />
                        </td>
                        <td className="px-2 py-1">
                          <input type="number" step="0.01" value={line.unitPrice} onChange={(e) => updateBulkLine(index, { unitPrice: e.target.value })} className="w-28 border rounded px-2 py-1 text-right text-gray-900" />
                        </td>
                        <td className="px-2 py-1">
                          <input type="number" step="0.01" value={line.cost} onChange={(e) => updateBulkLine(index, { cost: e.target.value })} className="w-28 border rounded px-2 py-1 text-right text-gray-900" />
                        </td>
                        <td className="px-2 py-1 text-center">
                          <input type="checkbox" checked={line.autoCreatePurchase} onChange={(e) => updateBulkLine(index, { autoCreatePurchase: e.target.checked })} />
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button type="button" onClick={() => removeBulkLine(index)} className="text-red-600 text-xs" disabled={bulkLines.length === 1}>삭제</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          {formData.type === 'SALES' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoCreatePurchase}
                  onChange={(e) => setFormData((prev) => ({ ...prev, autoCreatePurchase: e.target.checked }))}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-semibold text-amber-900">매출 등록 시 매입 자동등록</div>
                  <div className="text-xs text-amber-800 mt-1">라인별 체크를 해제하면 해당 품목은 자동매입 생성하지 않습니다.</div>
                </div>
              </label>
            </div>
          )}

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
