'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import ProductModal from '@/app/master/products/ProductModal'
import PdfPreviewModal from '@/components/PdfPreviewModal'

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

interface ImportExportItem {
  id: number
  productId: number
  product: Product
  quantity: number
  unitPrice: number
  amount: number
  krwAmount: number
}

interface InventoryLot {
  id: number
  lotCode: string | null
  receivedDate: string
  quantityReceived: number
  quantityRemaining: number
  unitCost: number
  storageLocation: string
  product: Product | null
}

interface ImportExportData {
  id: number
  date: string
  type: string
  productId: number | null
  product: Product | null
  vendor: Vendor
  salesperson: Salesperson | null
  category: Category | null
  quantity: number | null
  currency: string
  exchangeRate: number
  foreignAmount: number
  krwAmount: number
  goodsAmount: number | null
  dutyAmount: number | null
  shippingCost: number | null
  otherCost: number | null
  totalCost: number | null
  unitCost: number | null
  storageType: string | null
  vatIncluded: boolean
  supplyAmount: number | null
  vatAmount: number | null
  totalAmount: number | null
  memo: string | null
  items: ImportExportItem[]
  inventoryLots?: InventoryLot[]
  pdfFileName: string | null
  pdfFilePath: string | null
  pdfUploadedAt: string | null
}

// Multi-item support
interface ItemEntry {
  productId: string
  quantity: string
  unitPrice: string
}

export default function ImportExportEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  
  // Validate ID parameter
  useEffect(() => {
    if (!id || isNaN(parseInt(id))) {
      alert('잘못된 접근입니다.')
      router.push('/import-export')
    }
  }, [id, router])
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Master data
  const [products, setProducts] = useState<Product[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [salespeople, setSalespeople] = useState<Salesperson[]>([])
  
  // Filtered products based on vendor
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  
  // Multi-item support
  const [items, setItems] = useState<ItemEntry[]>([])
  const [currentItem, setCurrentItem] = useState<ItemEntry>({
    productId: '',
    quantity: '',
    unitPrice: ''
  })
  
  // Editable items from existing record
  const [editableItems, setEditableItems] = useState<(ImportExportItem & { edited?: boolean })[]>([])
  
  // Product registration modal state
  const [showProductModal, setShowProductModal] = useState(false)
  
  // PDF state
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState('')
  const [currentPdfName, setCurrentPdfName] = useState('')
  
  // Store record data for displaying existing items
  const [recordData, setRecordData] = useState<ImportExportData | null>(null)
  
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
  
  // Constants
  const KRW_EXCHANGE_RATE = '1'
  
  // Memoize the total foreign amount calculation
  const totalForeignAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
      return sum + amount
    }, 0)
  }, [items])
  
  // Helper function to get the current items to use
  const getCurrentItems = (): ItemEntry[] => {
    if (editableItems.length > 0) {
      return editableItems.map(item => ({
        productId: item.productId.toString(),
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString()
      }))
    }
    if (items.length > 0) {
      return items
    }
    return (recordData?.items || []).map(item => ({
      productId: item.productId.toString(),
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString()
    }))
  }

  useEffect(() => {
    fetchMasterData()
    fetchRecord()
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
    totalForeignAmount,
    items,
    editableItems,
  ])

  // Update available products when products or vendorId changes
  useEffect(() => {
    if (formData.vendorId && products.length > 0) {
      const filtered = products.filter(p => p.purchaseVendorId === parseInt(formData.vendorId))
      setAvailableProducts(filtered)
    }
  }, [formData.vendorId, products])

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

  const fetchRecord = async () => {
    try {
      const res = await fetch(`/api/import-export?id=${id}`)
      if (!res.ok) {
        throw new Error('Record not found')
      }
      const data: ImportExportData = await res.json()
      
      setFormData({
        date: new Date(data.date).toISOString().split('T')[0],
        type: data.type,
        vendorId: data.vendor.id.toString(),
        salespersonId: data.salesperson?.id.toString() || '',
        currency: data.currency,
        exchangeRate: data.exchangeRate.toString(),
        dutyAmount: data.dutyAmount?.toString() || '',
        shippingCost: data.shippingCost?.toString() || '',
        otherCost: data.otherCost?.toString() || '',
        storageType: data.storageType || '',
        vatIncluded: data.vatIncluded,
        memo: data.memo || '',
      })
      
      // Store record data for displaying existing items
      setRecordData(data)
      
      // Initialize editable items from existing items
      if (data.items && data.items.length > 0) {
        setEditableItems(data.items.map(item => ({ ...item, edited: false })))
      }
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

  // Auto-fetch exchange rate when currency or date changes
  const fetchExchangeRate = async (currency: string, date: string) => {
    if (!currency || currency === 'KRW' || !date) {
      setFormData(prev => ({ ...prev, exchangeRate: KRW_EXCHANGE_RATE }))
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
    // Get items to calculate using the helper function
    const itemsToCalculate = getCurrentItems()
    
    // Calculate total quantity from items
    const quantity = itemsToCalculate.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)
    const exchangeRate = parseFloat(formData.exchangeRate) || 0
    
    // Calculate foreign amount from items
    const foreignAmount = itemsToCalculate.reduce((sum, item) => {
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
      const filtered = products.filter(p => p.purchaseVendorId === parseInt(vendorId))
      setAvailableProducts(filtered)
    } else {
      setAvailableProducts([])
    }
  }

  // Currency change handler
  const handleCurrencyChange = (currency: string) => {
    setFormData(prev => ({ ...prev, currency }))
    fetchExchangeRate(currency, formData.date)
  }
  
  // Date change handler
  const handleDateChange = (date: string) => {
    setFormData(prev => ({ ...prev, date }))
    fetchExchangeRate(formData.currency, date)
  }
  
  // Product save handler
  const handleProductSave = async (product: {id: number}) => {
    const res = await fetch('/api/products')
    const updatedProducts = await res.json()
    setProducts(updatedProducts)
    
    if (formData.vendorId) {
      const filtered = updatedProducts.filter((p: Product) => p.purchaseVendorId === parseInt(formData.vendorId))
      setAvailableProducts(filtered)
    }
    
    // Set the newly registered product in currentItem for adding to items
    setCurrentItem({ ...currentItem, productId: product.id.toString() })
    
    // Close modal
    setShowProductModal(false)
  }

  const handleAddItem = () => {
    if (!currentItem.productId || !currentItem.quantity || !currentItem.unitPrice) {
      alert('품목, 수량, 단가를 모두 입력해주세요.')
      return
    }
    
    setItems([...items, currentItem])
    setCurrentItem({
      productId: '',
      quantity: '',
      unitPrice: ''
    })
  }
  
  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }
  
  // Handler for editing existing items
  const handleEditableItemChange = (index: number, field: 'quantity' | 'unitPrice', value: string) => {
    const updatedItems = [...editableItems]
    const item = updatedItems[index]
    
    if (field === 'quantity') {
      item.quantity = parseFloat(value) || 0
    } else if (field === 'unitPrice') {
      item.unitPrice = parseFloat(value) || 0
    }
    
    // Recalculate amount and krwAmount
    item.amount = item.quantity * item.unitPrice
    item.krwAmount = item.amount * parseFloat(formData.exchangeRate || '0')
    item.edited = true
    
    setEditableItems(updatedItems)
  }
  
  // Handler for removing existing items
  const handleRemoveEditableItem = (index: number) => {
    setEditableItems(editableItems.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.vendorId) {
      alert('거래처를 선택해주세요.')
      return
    }
    
    // Use helper function to get current items
    const itemsToSubmit = getCurrentItems()
    
    if (itemsToSubmit.length === 0) {
      alert('품목 목록이 없습니다. 품목을 추가해주세요.')
      return
    }
    
    setSubmitting(true)
    
    try {
      const payload = { ...formData, items: itemsToSubmit, id: parseInt(id) }
      
      const res = await fetch('/api/import-export', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
  
  // PDF upload handler
  const handlePdfUpload = async () => {
    if (!pdfFile) {
      alert('PDF 파일을 선택해주세요.')
      return
    }
    
    try {
      setUploadingPdf(true)
      
      const formDataUpload = new FormData()
      formDataUpload.append('file', pdfFile)
      formDataUpload.append('type', 'import-export')
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      })
      
      if (!uploadRes.ok) {
        const error = await uploadRes.json()
        throw new Error(error.error || 'PDF 업로드에 실패했습니다.')
      }
      
      const uploadData = await uploadRes.json()
      
      // Update the record with PDF info
      const updateRes = await fetch('/api/import-export', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(id),
          pdfFileName: uploadData.fileName,
          pdfFilePath: uploadData.filePath,
          pdfUploadedAt: uploadData.uploadedAt,
        }),
      })
      
      if (!updateRes.ok) {
        throw new Error('PDF 정보 저장에 실패했습니다.')
      }
      
      alert('PDF가 업로드되었습니다.')
      setPdfFile(null)
      
      // Refresh the record data
      await fetchRecord()
    } catch (error) {
      console.error('PDF upload error:', error)
      alert(error instanceof Error ? error.message : 'PDF 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadingPdf(false)
    }
  }
  
  // PDF preview handler
  const handlePdfPreview = () => {
    if (recordData?.pdfFilePath) {
      setCurrentPdfUrl(recordData.pdfFilePath)
      setCurrentPdfName(recordData.pdfFileName || 'document.pdf')
      setShowPdfModal(true)
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
        <h1 className="text-3xl font-bold text-gray-900">수입 수정</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
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
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap"
                  title="새 품목 등록"
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
                    <td colSpan={3} className="px-4 py-2 text-sm text-gray-900 text-right">
                      합계:
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">
                      {(() => {
                        const currencySymbol = formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : formData.currency === 'JPY' ? '¥' : formData.currency === 'CNY' ? '¥' : '₩'
                        return `${currencySymbol}${totalForeignAmount.toFixed(2)}`
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

        {/* 등록된 품목 목록 (기존 데이터 표시) */}
        {editableItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">등록된 품목 목록</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">품목</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">수량</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">단가</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">금액</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">원화 금액</th>
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {editableItems.map((item, index) => {
                    const currencySymbol = formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : formData.currency === 'JPY' ? '¥' : formData.currency === 'CNY' ? '¥' : '₩'
                    return (
                      <tr key={item.id} className="border-b">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          [{item.product.code}] {item.product.name}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleEditableItemChange(index, 'quantity', e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                          />
                          <span className="ml-1">{item.product.unit}</span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          <span className="mr-1">{currencySymbol}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleEditableItemChange(index, 'unitPrice', e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">
                          {currencySymbol}{item.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">
                          ₩{Math.round(item.krwAmount).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveEditableItem(index)}
                            className="text-red-600 hover:text-red-800 font-bold"
                          >
                            X
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={3} className="px-4 py-2 text-sm text-gray-900 text-right">
                      합계:
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">
                      {(() => {
                        const currencySymbol = formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : formData.currency === 'JPY' ? '¥' : formData.currency === 'CNY' ? '¥' : '₩'
                        return `${currencySymbol}${editableItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}`
                      })()}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">
                      ₩{Math.round(editableItems.reduce((sum, item) => sum + item.krwAmount, 0)).toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * 수량과 단가를 직접 수정할 수 있습니다. 변경 시 금액과 원화 금액이 자동으로 재계산됩니다.
            </p>
          </div>
        )}

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
                  const itemsToCalculate = items.length > 0 ? items : (recordData?.items || []).map(item => ({
                    productId: item.productId.toString(),
                    quantity: item.quantity.toString(),
                    unitPrice: item.unitPrice.toString()
                  }))
                  const total = itemsToCalculate.reduce((sum, item) => {
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

        {/* 연결된 입고 내역 (LOT) */}
        {recordData && recordData.type === 'IMPORT' && recordData.inventoryLots && recordData.inventoryLots.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">연결된 입고 내역 (LOT)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">LOT 코드</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">품목</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">입고 수량</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">잔량</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">단가</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">보관 위치</th>
                  </tr>
                </thead>
                <tbody>
                  {recordData.inventoryLots.map((lot) => (
                    <tr key={lot.id} className="border-b">
                      <td className="px-4 py-2 text-sm text-gray-900">{lot.lotCode || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {lot.product ? `[${lot.product.code}] ${lot.product.name}` : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {lot.quantityReceived.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {lot.quantityRemaining.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {formatCurrency(lot.unitCost)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {lot.storageLocation === 'WAREHOUSE' ? '창고' : '사무실'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <a
                href={`/warehouse/lots?importExportId=${id}`}
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                입고관리에서 보기
              </a>
            </div>
          </div>
        )}

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

        {/* PDF 첨부 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">PDF 첨부</h2>
          
          {/* 기존 PDF가 있는 경우 */}
          {recordData?.pdfFilePath && (
            <div className="mb-4 p-4 bg-blue-50 rounded-md border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {recordData.pdfFileName || 'document.pdf'}
                    </p>
                    <p className="text-xs text-gray-500">
                      업로드됨: {recordData.pdfUploadedAt ? new Date(recordData.pdfUploadedAt).toLocaleString('ko-KR') : '-'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePdfPreview}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  미리보기
                </button>
              </div>
            </div>
          )}
          
          {/* PDF 업로드 */}
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <button
              type="button"
              onClick={handlePdfUpload}
              disabled={!pdfFile || uploadingPdf}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {uploadingPdf ? '업로드 중...' : 'PDF 업로드'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            * PDF 파일을 선택한 후 &apos;PDF 업로드&apos; 버튼을 클릭하세요.
          </p>
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
      
      {/* Product Modal - 신규 품목 등록 */}
      {showProductModal && (
        <ProductModal
          productId={null}
          onClose={() => setShowProductModal(false)}
          onSave={handleProductSave}
        />
      )}
      
      {/* PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        pdfUrl={currentPdfUrl}
        fileName={currentPdfName}
      />
    </div>
  )
}
