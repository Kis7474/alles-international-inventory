'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import ProductModal from '@/app/master/products/ProductModal'

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

export default function ImportExportNewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Master data
  const [products, setProducts] = useState<Product[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [salespeople, setSalespeople] = useState<Salesperson[]>([])
  
  // Filtered products based on vendor
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  
  // Multi-item support
  interface ItemEntry {
    productId: string
    quantity: string
    unitPrice: string
    palletQuantities: string
  }
  const [items, setItems] = useState<ItemEntry[]>([])
  const [currentItem, setCurrentItem] = useState<ItemEntry>({
    productId: '',
    quantity: '',
    unitPrice: '',
    palletQuantities: ''
  })
  
  // Product registration modal state
  const [showProductModal, setShowProductModal] = useState(false)
  
  // 새 품목 생성 후 콜백
  const handleProductCreated = async () => {
    // 품목 목록 새로고침
    const res = await fetch('/api/products')
    const updatedProducts = await res.json()
    setProducts(updatedProducts)
    
    // If a vendor is selected, update available products
    if (formData.vendorId) {
      const filtered = updatedProducts.filter((p: Product) => p.purchaseVendorId === parseInt(formData.vendorId))
      setAvailableProducts(filtered)
      
      // 방금 생성된 품목 자동 선택 (가장 최근 품목)
      if (filtered.length > 0) {
        const latestProduct = filtered[filtered.length - 1]
        setCurrentItem({ ...currentItem, productId: latestProduct.id.toString() })
      }
    }
  }
  
  // Form data
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'IMPORT',
    vendorId: '',
    salespersonId: '',
    currency: 'USD',
    exchangeRate: '',
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
  
  // Exchange rate source tracking
  const [exchangeRateSource, setExchangeRateSource] = useState<string>('')
  const [exchangeRateMessage, setExchangeRateMessage] = useState<string>('')

  useEffect(() => {
    fetchMasterData()
  }, [])
  
  useEffect(() => {
    calculateValues()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.exchangeRate,
    formData.dutyAmount,
    formData.shippingCost,
    formData.otherCost,
    formData.vatIncluded,
    items,
  ])

  // 통화 또는 날짜 변경 시 환율 자동 조회
  useEffect(() => {
    if (formData.currency && formData.currency !== 'KRW' && formData.date) {
      fetchExchangeRate(formData.currency, formData.date)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.currency, formData.date])

  const fetchMasterData = async () => {
    try {
      const [productsRes, vendorsRes, salespeopleRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/vendors'),
        fetch('/api/salesperson'),
      ])
      
      const [productsData, vendorsData, salespeopleData] = await Promise.all([
        productsRes.json(),
        vendorsRes.json(),
        salespeopleRes.json(),
      ])
      
      setProducts(productsData)
      setVendors(vendorsData.filter((v: Vendor) => 
        v.type === 'INTERNATIONAL_PURCHASE' || v.type === 'INTERNATIONAL_SALES'
      ))
      setSalespeople(salespeopleData)
    } catch (error) {
      console.error('Error fetching master data:', error)
      alert('마스터 데이터 로딩 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }
  
  // 통화 또는 날짜 변경 시 환율 자동 조회
  const fetchExchangeRate = async (currency: string, date: string) => {
    if (!currency || currency === 'KRW' || !date) {
      setFormData(prev => ({ ...prev, exchangeRate: '1' }))
      setExchangeRateSource('')
      setExchangeRateMessage('')
      return
    }
    
    try {
      // 특정 날짜의 환율을 조회 (by-date API 사용)
      const res = await fetch(`/api/exchange-rates/by-date?currency=${currency}&date=${date}`)
      const result = await res.json()
      
      if (result.success && result.rate) {
        setFormData(prev => ({ ...prev, exchangeRate: result.rate.toString() }))
        setExchangeRateSource(result.source || '')
        setExchangeRateMessage(result.message || '')
      } else {
        // 환율 데이터가 없으면 경고 표시
        console.warn(`${currency} 환율 데이터를 가져올 수 없습니다:`, result.error)
        setExchangeRateSource('')
        setExchangeRateMessage(result.error || '')
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error)
      setExchangeRateSource('')
      setExchangeRateMessage('환율 조회 중 오류가 발생했습니다.')
    }
  }
  
  const calculateValues = () => {
    // Calculate total quantity from items
    const quantity = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)
    const exchangeRate = parseFloat(formData.exchangeRate) || 0
    
    // Calculate foreign amount from items (always)
    const foreignAmount = items.reduce((sum, item) => {
      const itemAmount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
      return sum + itemAmount
    }, 0)
    
    const dutyAmount = parseFloat(formData.dutyAmount) || 0
    const shippingCost = parseFloat(formData.shippingCost) || 0
    const otherCost = parseFloat(formData.otherCost) || 0
    
    // 원화 환산 금액
    const krwAmount = foreignAmount * exchangeRate
    
    // 수입 원가 계산 - Use krwAmount as the goods amount
    let totalCost = 0
    let unitCost = 0
    
    if (krwAmount > 0) {
      totalCost = krwAmount + dutyAmount + shippingCost + otherCost
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
    setFormData({ ...formData, vendorId })
    
    if (vendorId) {
      // 수입/수출: 선택한 거래처가 매입처인 품목 필터링
      const filtered = products.filter(p => p.purchaseVendorId === parseInt(vendorId))
      setAvailableProducts(filtered)
    } else {
      setAvailableProducts([])
    }
  }

  // 통화 변경 핸들러
  const handleCurrencyChange = (currency: string) => {
    setFormData(prev => ({ ...prev, currency }))
    fetchExchangeRate(currency, formData.date)
  }

  // 날짜 변경 핸들러
  const handleDateChange = (date: string) => {
    setFormData(prev => ({ ...prev, date }))
    fetchExchangeRate(formData.currency, date)
  }

  const handleAddItem = () => {
    if (!currentItem.productId || !currentItem.quantity || !currentItem.unitPrice) {
      alert('품목, 수량, 단가를 모두 입력해주세요.')
      return
    }

    const parsedPalletQuantities = currentItem.palletQuantities
      .split(',')
      .map((value) => parseFloat(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (parsedPalletQuantities.length > 0) {
      const quantity = parseFloat(currentItem.quantity)
      const palletTotal = parsedPalletQuantities.reduce((sum, value) => sum + value, 0)
      if (Math.abs(palletTotal - quantity) > 0.0001) {
        alert('파레트 수량 합계가 품목 수량과 일치해야 합니다.')
        return
      }
    }

    setItems([...items, currentItem])
    setCurrentItem({
      productId: '',
      quantity: '',
      unitPrice: '',
      palletQuantities: ''
    })
  }
  
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.vendorId) {
      alert('거래처를 선택해주세요.')
      return
    }
    
    // Check if using items - must have at least one
    if (items.length === 0) {
      alert('품목 목록에 최소 1개 이상의 항목을 추가해주세요.')
      return
    }
    
    setSubmitting(true)
    
    try {
      const payload = {
        ...formData,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          palletQuantities: item.palletQuantities
            .split(',')
            .map((value) => parseFloat(value.trim()))
            .filter((value) => Number.isFinite(value) && value > 0),
        })),
      }
      
      const res = await fetch('/api/import-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (res.ok) {
        alert('등록되었습니다.')
        router.push('/import-export')
      } else {
        const error = await res.json()
        alert(error.error || '등록 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('등록 중 오류가 발생했습니다.')
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
        <h1 className="text-3xl font-bold text-gray-900">수입 등록</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                거래일자 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={(e) => handleDateChange(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                거래처 (해외) <span className="text-red-500">*</span> <span className="text-xs text-blue-600">(해외 매입 거래처)</span>
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
          </div>
        </div>

        {/* 품목 목록 (다중 품목) */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">품목 목록</h2>
          <p className="text-sm text-gray-600 mb-4">
            여러 품목을 한 번에 등록하려면 아래에서 품목을 추가하세요. 품목 목록을 사용하면 위의 단일 품목 및 수량 입력은 무시됩니다.
          </p>
          
          {/* 품목 추가 폼 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                품목
              </label>
              <div className="flex gap-2">
                <select
                  value={currentItem.productId}
                  onChange={(e) => setCurrentItem({ ...currentItem, productId: e.target.value })}
                  disabled={!formData.vendorId}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">{formData.vendorId ? '품목 선택' : '거래처 먼저 선택'}</option>
                  {availableProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      [{product.code}] {product.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowProductModal(true)}
                  className="px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 whitespace-nowrap"
                >
                  + 새 품목
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수량
              </label>
              <input
                type="number"
                value={currentItem.quantity}
                onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                step="0.01"
                placeholder="수량"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                단가 (외화)
              </label>
              <input
                type="number"
                value={currentItem.unitPrice}
                onChange={(e) => setCurrentItem({ ...currentItem, unitPrice: e.target.value })}
                step="0.01"
                placeholder="단가"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                파레트 분할 (선택)
              </label>
              <input
                type="text"
                value={currentItem.palletQuantities}
                onChange={(e) => setCurrentItem({ ...currentItem, palletQuantities: e.target.value })}
                placeholder="예: 30,30,40"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                &nbsp;
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                품목 추가
              </button>
            </div>
          </div>
          
          {/* 품목 목록 테이블 */}
          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">품목</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">수량</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">파레트 분할</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">단가</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">금액</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">원화 금액</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const product = products.find(p => p.id === parseInt(item.productId))
                    const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
                    const krwAmount = amount * (parseFloat(formData.exchangeRate) || 0)
                    const currencySymbol = formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : formData.currency === 'JPY' ? '¥' : formData.currency === 'CNY' ? '¥' : '₩'
                    return (
                      <tr key={index} className="border-b">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {product ? `[${product.code}] ${product.name}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {parseFloat(item.quantity).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {item.palletQuantities || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {currencySymbol}{parseFloat(item.unitPrice).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">
                          {currencySymbol}{amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">
                          ₩{Math.round(krwAmount).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={4} className="px-4 py-2 text-sm text-gray-900 text-right">
                      합계:
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">
                      {(() => {
                        const total = items.reduce((sum, item) => {
                          const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
                          return sum + amount
                        }, 0)
                        const currencySymbol = formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : formData.currency === 'JPY' ? '¥' : formData.currency === 'CNY' ? '¥' : '₩'
                        return `${currencySymbol}${total.toFixed(2)}`
                      })()}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">
                      {(() => {
                        const totalKrw = items.reduce((sum, item) => {
                          const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
                          return sum + (amount * (parseFloat(formData.exchangeRate) || 0))
                        }, 0)
                        return `₩${Math.round(totalKrw).toLocaleString()}`
                      })()}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
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
                onChange={(e) => handleCurrencyChange(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="USD">USD (미국 달러)</option>
                <option value="EUR">EUR (유로)</option>
                <option value="JPY">JPY (일본 엔)</option>
                <option value="CNY">CNY (중국 위안)</option>
                <option value="KRW">KRW (원화)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                환율 (원/외화) <span className="text-red-500">*</span>
                {exchangeRateSource && (
                  <span className={`text-xs ml-2 ${
                    exchangeRateSource === 'database' || exchangeRateSource === 'KOREAEXIM' ? 'text-green-600' :
                    exchangeRateSource === 'auto_fetch' ? 'text-blue-600' :
                    'text-orange-600'
                  }`}>
                    ({exchangeRateSource === 'database' ? '✓ DB 조회' : 
                      exchangeRateSource === 'KOREAEXIM' ? '✓ 자동 조회' :
                      exchangeRateSource === 'auto_fetch' ? '✓ 자동 조회' : 
                      '⚠ 기본값'})
                  </span>
                )}
                {!exchangeRateSource && (
                  <span className="text-xs text-blue-600 ml-2">(자동 조회됨)</span>
                )}
              </label>
              <input
                type="number"
                name="exchangeRate"
                value={formData.exchangeRate}
                onChange={handleChange}
                required
                step="0.01"
                placeholder="환율이 자동으로 입력됩니다"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              {exchangeRateMessage && (
                <p className="text-xs text-orange-600 mt-1">{exchangeRateMessage}</p>
              )}
              {!exchangeRateMessage && (
                <p className="text-xs text-gray-500 mt-1">
                  환율 데이터가 없으면 환율 관리에서 먼저 등록하세요.
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                외화 금액 <span className="text-xs text-green-600">(품목 합계로 자동 계산)</span>
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 font-semibold">
                {(() => {
                  const total = items.reduce((sum, item) => {
                    const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
                    return sum + amount
                  }, 0)
                  const currencySymbol = formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : formData.currency === 'JPY' ? '¥' : formData.currency === 'CNY' ? '¥' : '₩'
                  return total > 0 ? `${currencySymbol}${total.toFixed(2)}` : '-'
                })()}
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <div className="text-sm text-gray-700">
              원화 환산 금액: <span className="font-semibold text-blue-600">{formatCurrency(calculated.krwAmount)}</span>
            </div>
          </div>
        </div>

        {/* 수입 원가 구성 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">수입 원가 구성</h2>
          
          {/* Display total goods amount in KRW (auto-calculated from items) */}
          <div className="mb-4 p-4 bg-blue-50 rounded-md">
            <div className="text-sm text-gray-700">
              총 물품대금(원화): <span className="font-semibold text-blue-600">
                {formatCurrency(calculated.krwAmount)} <span className="text-xs text-gray-600">(품목 합계 × 환율)</span>
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="mt-4 p-4 bg-green-50 rounded-md">
              <div className="text-sm text-gray-700">
                총 원가: <span className="font-semibold text-green-600">{formatCurrency(calculated.totalCost)}</span>
              </div>
            </div>
          )}
        </div>

        {/* 보관 옵션 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            보관 방식 <span className="text-red-500">*</span>
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            창고 입고 또는 사무실 보관 선택 시 자동으로 입고 관리에 등록됩니다.
          </p>
          <div className="space-y-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="storageType"
                value="WAREHOUSE"
                checked={formData.storageType === 'WAREHOUSE'}
                onChange={handleChange}
                required
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
                required
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
                required
                className="mr-2"
              />
              <span className="text-gray-700">🚚 직접 배송 (입고 안 함)</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="storageType"
                value="OTHER"
                checked={formData.storageType === 'OTHER'}
                onChange={handleChange}
                required
                className="mr-2"
              />
              <span className="text-gray-700">📦 기타</span>
            </label>
          </div>
        </div>

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
            {submitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
      
      {/* 품목 등록 모달 */}
      <ProductModal
        productId={null}
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSave={handleProductCreated}
      />
    </div>
  )
}
