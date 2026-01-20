'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface Product {
  id: number
  code: string | null
  name: string
  unit: string
  purchaseVendorId: number
  purchaseVendor: {
    id: number
    name: string
  }
}

interface Vendor {
  id: number
  code: string
  name: string
  type: string
  currency: string | null
}

interface Salesperson {
  id: number
  code: string
  name: string
}

interface Category {
  id: number
  code: string
  name: string
  nameKo: string
}

interface ExchangeRate {
  id: number
  date: string
  currency: string
  rate: number
  source: string | null
}

export default function ImportExportEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Master data
  const [products, setProducts] = useState<Product[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [salespeople, setSalespeople] = useState<Salesperson[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  
  // Filtered products based on vendor
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  
  // Exchange rate auto-fetch
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
  const [autoFetchedRate, setAutoFetchedRate] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'IMPORT',
    productId: '',
    vendorId: '',
    salespersonId: '',
    categoryId: '',
    quantity: '',
    currency: 'USD',
    exchangeRate: '',
    foreignAmount: '',
    goodsAmount: '',
    dutyAmount: '',
    shippingCost: '',
    otherCost: '',
    storageType: '',
    vatIncluded: false,
    memo: '',
  })
  
  // Calculated values
  const [calculated, setCalculated] = useState({
    krwAmount: 0,
    totalCost: 0,
    unitCost: 0,
    supplyAmount: 0,
    vatAmount: 0,
    totalAmount: 0,
  })

  useEffect(() => {
    fetchMasterData()
    fetchRecord()
    fetchExchangeRates()
  }, [])
  
  useEffect(() => {
    calculateValues()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.type,
    formData.quantity,
    formData.exchangeRate,
    formData.foreignAmount,
    formData.goodsAmount,
    formData.dutyAmount,
    formData.shippingCost,
    formData.otherCost,
    formData.vatIncluded,
  ])

  // Auto-fetch exchange rate when date and currency change
  useEffect(() => {
    if (formData.date && formData.currency && !autoFetchedRate) {
      autoFetchExchangeRate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.date, formData.currency])

  const fetchMasterData = async () => {
    try {
      const [productsRes, vendorsRes, salespeopleRes, categoriesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/vendors'),
        fetch('/api/salesperson'),
        fetch('/api/categories'),
      ])
      
      const [productsData, vendorsData, salespeopleData, categoriesData] = await Promise.all([
        productsRes.json(),
        vendorsRes.json(),
        salespeopleRes.json(),
        categoriesRes.json(),
      ])
      
      setProducts(productsData)
      setVendors(vendorsData.filter((v: Vendor) => 
        v.type === 'INTERNATIONAL_PURCHASE' || v.type === 'INTERNATIONAL_SALES'
      ))
      setSalespeople(salespeopleData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error fetching master data:', error)
      alert('마스터 데이터 로딩 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecord = async () => {
    try {
      const res = await fetch(`/api/import-export?id=${id}`)
      if (!res.ok) {
        throw new Error('Record not found')
      }
      const data = await res.json()
      
      setFormData({
        date: new Date(data.date).toISOString().split('T')[0],
        type: data.type,
        productId: data.productId.toString(),
        vendorId: data.vendorId.toString(),
        salespersonId: data.salespersonId?.toString() || '',
        categoryId: data.categoryId?.toString() || '',
        quantity: data.quantity.toString(),
        currency: data.currency,
        exchangeRate: data.exchangeRate.toString(),
        foreignAmount: data.foreignAmount.toString(),
        goodsAmount: data.goodsAmount?.toString() || '',
        dutyAmount: data.dutyAmount?.toString() || '',
        shippingCost: data.shippingCost?.toString() || '',
        otherCost: data.otherCost?.toString() || '',
        storageType: data.storageType || '',
        vatIncluded: data.vatIncluded,
        memo: data.memo || '',
      })
      
      // Wait for products to be loaded before filtering
      // This will be handled by the useEffect that watches products and vendorId
    } catch (error) {
      console.error('Error fetching record:', error)
      alert('데이터 로딩 중 오류가 발생했습니다.')
      router.push('/import-export')
    }
  }

  // Update available products when products or vendorId changes
  useEffect(() => {
    if (formData.vendorId && products.length > 0) {
      const filtered = products.filter(p => p.purchaseVendorId === parseInt(formData.vendorId))
      setAvailableProducts(filtered)
    }
  }, [formData.vendorId, products])

  const fetchExchangeRates = async () => {
    try {
      const res = await fetch('/api/exchange-rates')
      const data = await res.json()
      setExchangeRates(data)
    } catch (error) {
      console.error('Error fetching exchange rates:', error)
    }
  }

  const autoFetchExchangeRate = () => {
    const dateStr = formData.date
    const currency = formData.currency
    
    // Find matching exchange rate
    const matchingRate = exchangeRates.find(rate => 
      new Date(rate.date).toISOString().split('T')[0] === dateStr && 
      rate.currency === currency
    )
    
    if (matchingRate && !formData.exchangeRate) {
      setFormData(prev => ({
        ...prev,
        exchangeRate: matchingRate.rate.toString()
      }))
      setAutoFetchedRate(true)
    } else {
      setAutoFetchedRate(false)
    }
  }
  
  const calculateValues = () => {
    const quantity = parseFloat(formData.quantity) || 0
    const exchangeRate = parseFloat(formData.exchangeRate) || 0
    const foreignAmount = parseFloat(formData.foreignAmount) || 0
    const goodsAmount = parseFloat(formData.goodsAmount) || 0
    const dutyAmount = parseFloat(formData.dutyAmount) || 0
    const shippingCost = parseFloat(formData.shippingCost) || 0
    const otherCost = parseFloat(formData.otherCost) || 0
    
    // 원화 환산 금액
    const krwAmount = foreignAmount * exchangeRate
    
    // 수입 원가 계산 (수입인 경우에만)
    let totalCost = 0
    let unitCost = 0
    
    if (formData.type === 'IMPORT' && goodsAmount > 0) {
      const krwGoodsAmount = goodsAmount * exchangeRate
      totalCost = krwGoodsAmount + dutyAmount + shippingCost + otherCost
      unitCost = quantity > 0 ? totalCost / quantity : 0
    }
    
    // 부가세 계산
    let supplyAmount = 0
    let vatAmount = 0
    let totalAmount = 0
    
    if (krwAmount > 0) {
      if (formData.vatIncluded) {
        supplyAmount = Math.round(krwAmount / 1.1)
        vatAmount = krwAmount - supplyAmount
        totalAmount = krwAmount
      } else {
        supplyAmount = krwAmount
        vatAmount = Math.round(krwAmount * 0.1)
        totalAmount = supplyAmount + vatAmount
      }
    }
    
    setCalculated({
      krwAmount,
      totalCost,
      unitCost,
      supplyAmount,
      vatAmount,
      totalAmount,
    })
  }
  
  const handleVendorChange = (vendorId: string) => {
    setFormData({ ...formData, vendorId, productId: '' })
    
    if (vendorId) {
      // 수입/수출: 선택한 거래처가 매입처인 품목 필터링
      const filtered = products.filter(p => p.purchaseVendorId === parseInt(vendorId))
      setAvailableProducts(filtered)
    } else {
      setAvailableProducts([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.productId || !formData.vendorId || !formData.quantity) {
      alert('필수 항목을 입력해주세요.')
      return
    }
    
    setSubmitting(true)
    
    try {
      const res = await fetch('/api/import-export', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, id: parseInt(id) }),
      })
      
      if (res.ok) {
        alert('수정되었습니다.')
        router.push('/import-export')
      } else {
        const error = await res.json()
        alert(error.error || '수정 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('수정 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
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
        <h1 className="text-3xl font-bold text-gray-900">수입/수출 수정</h1>
        <button
          onClick={() => router.push('/import-export')}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          목록으로
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        {/* 기본 정보 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">기본 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                거래일자 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                거래유형 <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="IMPORT">수입</option>
                <option value="EXPORT">수출</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                거래처 (해외) <span className="text-red-500">*</span>
              </label>
              <select
                name="vendorId"
                value={formData.vendorId}
                onChange={(e) => handleVendorChange(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">선택하세요</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    [{vendor.code}] {vendor.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                품목 <span className="text-red-500">*</span>
              </label>
              <select
                name="productId"
                value={formData.productId}
                onChange={handleChange}
                required
                disabled={!formData.vendorId}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">{formData.vendorId ? '품목을 선택하세요' : '거래처를 먼저 선택하세요'}</option>
                {availableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    [{product.code}] {product.name} ({product.unit})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                담당자
              </label>
              <select
                name="salespersonId"
                value={formData.salespersonId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">선택하세요</option>
                {salespeople.map((salesperson) => (
                  <option key={salesperson.id} value={salesperson.id}>
                    [{salesperson.code}] {salesperson.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리
              </label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">선택하세요</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nameKo} ({category.name})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수량 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* 외화 정보 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">외화 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                통화 <span className="text-red-500">*</span>
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="JPY">JPY</option>
                <option value="CNY">CNY</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                환율 <span className="text-red-500">*</span>
                {autoFetchedRate && <span className="text-xs text-green-600 ml-2">✓ 자동 적용됨</span>}
              </label>
              <input
                type="number"
                name="exchangeRate"
                value={formData.exchangeRate}
                onChange={handleChange}
                required
                step="0.01"
                placeholder="예: 1350.50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                외화 금액 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="foreignAmount"
                value={formData.foreignAmount}
                onChange={handleChange}
                required
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <div className="text-sm text-gray-700">
              원화 환산 금액: <span className="font-semibold text-blue-600">{formatCurrency(calculated.krwAmount)}</span>
            </div>
          </div>
        </div>

        {/* 수입 원가 구성 (수입인 경우에만) */}
        {formData.type === 'IMPORT' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">수입 원가 구성</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  물품대금 (외화)
                </label>
                <input
                  type="number"
                  name="goodsAmount"
                  value={formData.goodsAmount}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  관세 (원화)
                </label>
                <input
                  type="number"
                  name="dutyAmount"
                  value={formData.dutyAmount}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  운송료 (원화)
                </label>
                <input
                  type="number"
                  name="shippingCost"
                  value={formData.shippingCost}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  기타비용 (원화)
                </label>
                <input
                  type="number"
                  name="otherCost"
                  value={formData.otherCost}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>
            
            {calculated.totalCost > 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-md space-y-2">
                <div className="text-sm text-gray-700">
                  총 원가: <span className="font-semibold text-green-600">{formatCurrency(calculated.totalCost)}</span>
                </div>
                <div className="text-sm text-gray-700">
                  단위 원가: <span className="font-semibold text-green-600">{formatCurrency(calculated.unitCost)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 보관 옵션 */}
        {formData.type === 'IMPORT' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">보관 옵션</h2>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="storageType"
                  value="WAREHOUSE"
                  checked={formData.storageType === 'WAREHOUSE'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-700">🏭 창고 입고 (입고 관리에 자동 등록)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="storageType"
                  value="OFFICE"
                  checked={formData.storageType === 'OFFICE'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-700">🏢 사무실 보관 (입고 관리에 자동 등록)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="storageType"
                  value="DIRECT_DELIVERY"
                  checked={formData.storageType === 'DIRECT_DELIVERY'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-700">🚚 직접 배송 (입고 안 함)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="storageType"
                  value=""
                  checked={formData.storageType === ''}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-gray-700">선택 안함</span>
              </label>
            </div>
          </div>
        )}

        {/* 부가세 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">부가세</h2>
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="vatIncluded"
                checked={formData.vatIncluded}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-gray-700">부가세 포함</span>
            </label>
          </div>
          
          {calculated.krwAmount > 0 && (
            <div className="p-4 bg-purple-50 rounded-md space-y-2">
              <div className="text-sm text-gray-700">
                공급가액: <span className="font-semibold text-purple-600">{formatCurrency(calculated.supplyAmount)}</span>
              </div>
              <div className="text-sm text-gray-700">
                부가세액: <span className="font-semibold text-purple-600">{formatCurrency(calculated.vatAmount)}</span>
              </div>
              <div className="text-sm text-gray-700">
                합계: <span className="font-semibold text-purple-600">{formatCurrency(calculated.totalAmount)}</span>
              </div>
            </div>
          )}
        </div>

        {/* 비고 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">비고</h2>
          <textarea
            name="memo"
            value={formData.memo}
            onChange={handleChange}
            rows={4}
            placeholder="메모를 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push('/import-export')}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {submitting ? '수정 중...' : '수정'}
          </button>
        </div>
      </form>
    </div>
  )
}
