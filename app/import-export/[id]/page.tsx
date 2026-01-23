'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import ProductRegistrationModal from '@/components/ProductRegistrationModal'
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
  const [categories, setCategories] = useState<Category[]>([])
  
  // Filtered products based on vendor
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  
  // Search states
  const [productSearch, setProductSearch] = useState('')
  
  // Multi-item support
  const [items, setItems] = useState<ItemEntry[]>([])
  const [currentItem, setCurrentItem] = useState<ItemEntry>({
    productId: '',
    quantity: '',
    unitPrice: ''
  })
  
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
  
  // Memoize the total foreign amount calculation
  const totalForeignAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
      return sum + amount
    }, 0)
  }, [items])

  useEffect(() => {
    fetchMasterData()
    fetchRecord()
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
    items,
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
      const data: ImportExportData = await res.json()
      
      setFormData({
        date: new Date(data.date).toISOString().split('T')[0],
        type: data.type,
        productId: data.productId?.toString() || '',
        vendorId: data.vendor.id.toString(),
        salespersonId: data.salesperson?.id.toString() || '',
        categoryId: data.category?.id.toString() || '',
        quantity: data.quantity?.toString() || '',
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
      
      // Store record data for displaying existing items
      setRecordData(data)
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
      setFormData(prev => ({ ...prev, exchangeRate: '1' }))
      return
    }
    
    try {
      const res = await fetch(`/api/exchange-rates?currency=${currency}&date=${date}`)
      
      if (!res.ok) {
        console.warn(`환율 조회 실패: ${res.status}`)
        return
      }
      
      const rates = await res.json()
      
      if (rates && rates.length > 0) {
        setFormData(prev => ({ ...prev, exchangeRate: rates[0].rate.toString() }))
      } else {
        console.warn(`${currency} 환율 데이터가 없습니다.`)
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error)
    }
  }
  
  const calculateValues = () => {
    const quantity = parseFloat(formData.quantity) || 0
    const exchangeRate = parseFloat(formData.exchangeRate) || 0
    let foreignAmount = parseFloat(formData.foreignAmount) || 0
    
    // If items exist, calculate total from items
    if (items.length > 0) {
      foreignAmount = items.reduce((sum, item) => {
        const itemAmount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
        return sum + itemAmount
      }, 0)
    }
    
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
    setProductSearch('')
    
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
  
  // Product registration success handler
  const handleProductRegistrationSuccess = async (productId: number) => {
    const res = await fetch('/api/products')
    const updatedProducts = await res.json()
    setProducts(updatedProducts)
    
    if (formData.vendorId) {
      const filtered = updatedProducts.filter((p: Product) => p.purchaseVendorId === parseInt(formData.vendorId))
      setAvailableProducts(filtered)
    }
    
    setFormData({ ...formData, productId: productId.toString() })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.vendorId) {
      alert('거래처를 선택해주세요.')
      return
    }
    
    // Check if using items or single product
    if (items.length === 0) {
      if (!formData.productId || !formData.quantity) {
        alert('품목과 수량을 입력하거나 품목 목록에 항목을 추가해주세요.')
        return
      }
    }
    
    setSubmitting(true)
    
    try {
      const payload = items.length > 0 
        ? { ...formData, items, id: parseInt(id) } 
        : { ...formData, id: parseInt(id) }
      
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
                onChange={(e) => handleDateChange(e.target.value)}
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
            
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  품목 <span className="text-red-500">*</span> <span className="text-xs text-blue-600">(선택한 거래처의 품목)</span>
                </label>
                <select
                  name="productId"
                  value={formData.productId}
                  onChange={handleChange}
                  required={items.length === 0}
                  disabled={!formData.vendorId || items.length > 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
                >
                  <option value="">{formData.vendorId ? '품목을 선택하세요' : '거래처를 먼저 선택하세요'}</option>
                  {availableProducts
                    .filter(p => 
                      p.name.toLowerCase().includes(productSearch.toLowerCase())
                    )
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        [{product.code}] {product.name} ({product.unit})
                      </option>
                    ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setShowProductModal(true)}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-lg"
                title="새 품목 등록"
              >
                +
              </button>
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
                required={items.length === 0}
                step="0.01"
                disabled={items.length > 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
              />
              {items.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">품목 목록 사용 중</p>
              )}
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
              <select
                value={currentItem.productId}
                onChange={(e) => setCurrentItem({ ...currentItem, productId: e.target.value })}
                disabled={!formData.vendorId}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">{formData.vendorId ? '품목 선택' : '거래처 먼저 선택'}</option>
                {availableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    [{product.code}] {product.name}
                  </option>
                ))}
              </select>
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
                    <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const product = products.find(p => p.id === parseInt(item.productId))
                    const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
                    const qty = parseFloat(item.quantity) || 0
                    const price = parseFloat(item.unitPrice) || 0
                    return (
                      <tr key={index} className="border-b">
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {product ? `[${product.code}] ${product.name}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {qty.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right">
                          {price.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">
                          {amount.toLocaleString()}
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
                      총 외화 금액:
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">
                      {totalForeignAmount.toLocaleString()} {formData.currency}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 품목 목록 (다중 품목인 경우 표시) */}
        {recordData && recordData.items && recordData.items.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">등록된 품목 목록</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">품목</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">수량</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">단가 ({recordData.currency})</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">금액 ({recordData.currency})</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">원화 금액</th>
                  </tr>
                </thead>
                <tbody>
                  {recordData.items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-2 text-sm text-gray-900">
                        [{item.product.code}] {item.product.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {item.quantity.toLocaleString()} {item.product.unit}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {formatCurrency(item.krwAmount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={3} className="px-4 py-2 text-sm text-gray-900 text-right">
                      합계:
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">
                      {formatCurrency(recordData.items.reduce((sum, item) => sum + item.amount, 0))} {recordData.currency}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 text-right">
                      {formatCurrency(recordData.items.reduce((sum, item) => sum + item.krwAmount, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * 다중 품목으로 등록된 거래입니다. 수정이 필요한 경우 해당 거래를 삭제하고 다시 등록하세요.
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
                <span className="text-xs text-blue-600 ml-2">(자동 조회됨)</span>
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
              <p className="text-xs text-gray-500 mt-1">
                환율 데이터가 없으면 환율 관리에서 먼저 등록하세요.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                외화 금액 <span className="text-red-500">*</span>
                {items.length > 0 && <span className="text-xs text-green-600 ml-2">(품목 목록에서 자동 계산됨)</span>}
              </label>
              <input
                type="number"
                name="foreignAmount"
                value={items.length > 0 ? totalForeignAmount : formData.foreignAmount}
                onChange={handleChange}
                required={items.length === 0}
                step="0.01"
                disabled={items.length > 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
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
            * PDF 파일을 선택한 후 &quot;PDF 업로드&quot; 버튼을 클릭하세요.
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
      
      {/* Product Registration Modal */}
      <ProductRegistrationModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSuccess={handleProductRegistrationSuccess}
        vendors={vendors}
      />
      
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
