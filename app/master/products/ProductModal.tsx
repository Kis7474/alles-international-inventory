'use client'

import { useState, useEffect } from 'react'

interface ProductModalProps {
  productId: number | null  // null이면 신규 등록
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export default function ProductModal({ productId, isOpen, onClose, onSave }: ProductModalProps) {
  const [isEditMode, setIsEditMode] = useState(productId === null)
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  
  // 폼 데이터
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    unit: '',
    categoryId: '',
    purchaseVendorId: '',
  })
  
  // 매출거래처별 가격 관리
  const [salesVendorPrices, setSalesVendorPrices] = useState<Array<{
    vendorId: number
    vendorName: string
    salesPrice: number
  }>>([])
  
  // 새 매출거래처 추가용
  const [newVendorId, setNewVendorId] = useState('')
  const [newSalesPrice, setNewSalesPrice] = useState('')
  
  // 거래처 목록, 카테고리 목록 fetch
  const [vendors, setVendors] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    if (isOpen) {
      fetchVendors()
      fetchCategories()
      if (productId) {
        fetchProduct()
        setIsEditMode(false)
      } else {
        // 신규 등록
        setProduct(null)
        setFormData({ code: '', name: '', unit: '', categoryId: '', purchaseVendorId: '' })
        setSalesVendorPrices([])
        setIsEditMode(true)
      }
    }
  }, [isOpen, productId])

  const fetchProduct = async () => {
    setLoading(true)
    const res = await fetch(`/api/products/${productId}`)
    const data = await res.json()
    setProduct(data)
    setFormData({
      code: data.code || '',
      name: data.name || '',
      unit: data.unit || '',
      categoryId: data.categoryId?.toString() || '',
      purchaseVendorId: data.purchaseVendorId?.toString() || '',
    })
    // 매출거래처별 가격 로드
    if (data.vendorPrices) {
      // Group by vendor and get the latest price for each
      const pricesByVendor = new Map<number, any>()
      data.vendorPrices.forEach((vp: any) => {
        if (vp.salesPrice !== null && vp.salesPrice !== undefined) {
          // Only keep the latest entry per vendor (they are already sorted by effectiveDate desc)
          if (!pricesByVendor.has(vp.vendorId)) {
            pricesByVendor.set(vp.vendorId, vp)
          }
        }
      })
      
      setSalesVendorPrices(Array.from(pricesByVendor.values()).map((vp: any) => ({
        vendorId: vp.vendorId,
        vendorName: vp.vendor?.name || '',
        salesPrice: vp.salesPrice,
      })))
    }
    setLoading(false)
  }

  const fetchVendors = async () => {
    const res = await fetch('/api/vendors')
    const data = await res.json()
    setVendors(data)
  }

  const fetchCategories = async () => {
    const res = await fetch('/api/categories')
    const data = await res.json()
    setCategories(data)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const payload = {
        ...formData,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
        purchaseVendorId: formData.purchaseVendorId ? parseInt(formData.purchaseVendorId) : null,
        salesVendors: salesVendorPrices.map(sv => ({
          vendorId: sv.vendorId,
          salesPrice: sv.salesPrice,
        })),
      }

      if (productId) {
        // 수정
        await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: productId, ...payload }),
        })
      } else {
        // 신규 등록
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
    setLoading(false)
  }

  const addSalesVendor = () => {
    if (!newVendorId || !newSalesPrice) return
    const vendor = vendors.find(v => v.id === parseInt(newVendorId))
    if (!vendor) return
    
    // 이미 추가된 거래처인지 확인
    if (salesVendorPrices.some(sv => sv.vendorId === parseInt(newVendorId))) {
      alert('이미 추가된 거래처입니다.')
      return
    }
    
    setSalesVendorPrices([...salesVendorPrices, {
      vendorId: parseInt(newVendorId),
      vendorName: vendor.name,
      salesPrice: parseFloat(newSalesPrice),
    }])
    setNewVendorId('')
    setNewSalesPrice('')
  }

  const removeSalesVendor = (vendorId: number) => {
    setSalesVendorPrices(salesVendorPrices.filter(sv => sv.vendorId !== vendorId))
  }

  const updateSalesPrice = (vendorId: number, price: string) => {
    setSalesVendorPrices(salesVendorPrices.map(sv => 
      sv.vendorId === vendorId ? { ...sv, salesPrice: parseFloat(price) || 0 } : sv
    ))
  }

  if (!isOpen) return null

  // 매입거래처 필터 (type이 PURCHASE 또는 BOTH)
  const purchaseVendors = vendors.filter(v => 
    v.type === 'DOMESTIC_PURCHASE' || v.type === 'INTERNATIONAL_PURCHASE'
  )
  // 매출거래처 필터 (type이 SALES 또는 BOTH)
  const salesVendors = vendors.filter(v => 
    v.type === 'DOMESTIC_SALES' || v.type === 'INTERNATIONAL_SALES'
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {productId ? (isEditMode ? '품목 수정' : '품목 상세') : '품목 등록'}
          </h2>
          <div className="flex gap-2">
            {!isEditMode && productId && (
              <button
                onClick={() => setIsEditMode(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                편집
              </button>
            )}
            {isEditMode && (
              <>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
                >
                  저장
                </button>
                {productId && (
                  <button
                    onClick={() => {
                      setIsEditMode(false)
                      fetchProduct()
                    }}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  >
                    취소
                  </button>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              닫기
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 기본 정보 섹션 */}
          <section>
            <h3 className="text-lg font-semibold mb-3 border-b pb-2">기본 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">품목코드</label>
                {isEditMode ? (
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="자동생성 가능"
                  />
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded">{product?.code || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">품목명 *</label>
                {isEditMode ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded">{product?.name || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">단위 *</label>
                {isEditMode ? (
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="예: EA, BOX, KG"
                    required
                  />
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded">{product?.unit || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">카테고리</label>
                {isEditMode ? (
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">선택안함</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.nameKo}</option>
                    ))}
                  </select>
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded">{product?.category?.nameKo || '-'}</p>
                )}
              </div>
            </div>
          </section>

          {/* 매입 정보 섹션 */}
          <section>
            <h3 className="text-lg font-semibold mb-3 border-b pb-2">매입 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">매입거래처</label>
                {isEditMode ? (
                  <select
                    value={formData.purchaseVendorId}
                    onChange={(e) => setFormData({ ...formData, purchaseVendorId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">선택안함</option>
                    {purchaseVendors.map((vendor: any) => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded">{product?.purchaseVendor?.name || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">현재 원가 (창고료 포함)</label>
                <p className="px-3 py-2 bg-gray-100 rounded text-gray-600">
                  {product?.currentCost ? `₩${product.currentCost.toLocaleString()}` : '-'}
                  <span className="text-xs text-gray-400 ml-2">(자동계산, 읽기전용)</span>
                </p>
              </div>
            </div>

            {/* 매입가 이력 - 읽기전용 */}
            {product?.priceHistory && product.priceHistory.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                  매입가 이력 보기 ({product.priceHistory.length}건)
                </summary>
                <table className="w-full mt-2 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">적용일</th>
                      <th className="px-3 py-2 text-right">매입가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.priceHistory.map((ph: any, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">{new Date(ph.effectiveDate).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-right">₩{ph.purchasePrice?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </section>

          {/* 매출 정보 섹션 */}
          <section>
            <h3 className="text-lg font-semibold mb-3 border-b pb-2">매출 정보 (거래처별 매출가)</h3>
            
            {/* 매출거래처별 가격 목록 */}
            <table className="w-full text-sm mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">거래처</th>
                  <th className="px-3 py-2 text-right">매출가</th>
                  {isEditMode && <th className="px-3 py-2 w-20">관리</th>}
                </tr>
              </thead>
              <tbody>
                {salesVendorPrices.length === 0 ? (
                  <tr>
                    <td colSpan={isEditMode ? 3 : 2} className="px-3 py-4 text-center text-gray-400">
                      등록된 매출거래처가 없습니다.
                    </td>
                  </tr>
                ) : (
                  salesVendorPrices.map((sv) => (
                    <tr key={sv.vendorId} className="border-t">
                      <td className="px-3 py-2">{sv.vendorName}</td>
                      <td className="px-3 py-2 text-right">
                        {isEditMode ? (
                          <input
                            type="number"
                            value={sv.salesPrice}
                            onChange={(e) => updateSalesPrice(sv.vendorId, e.target.value)}
                            className="w-32 border rounded px-2 py-1 text-right"
                          />
                        ) : (
                          `₩${sv.salesPrice?.toLocaleString()}`
                        )}
                      </td>
                      {isEditMode && (
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => removeSalesVendor(sv.vendorId)}
                            className="text-red-500 hover:text-red-700"
                          >
                            삭제
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* 새 매출거래처 추가 (편집 모드에서만) */}
            {isEditMode && (
              <div className="flex gap-2 items-end bg-gray-50 p-3 rounded">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">거래처</label>
                  <select
                    value={newVendorId}
                    onChange={(e) => setNewVendorId(e.target.value)}
                    className="w-full border rounded px-2 py-1"
                  >
                    <option value="">선택...</option>
                    {salesVendors
                      .filter(v => !salesVendorPrices.some(sv => sv.vendorId === v.id))
                      .map((vendor: any) => (
                        <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                      ))}
                  </select>
                </div>
                <div className="w-32">
                  <label className="block text-xs text-gray-500 mb-1">매출가</label>
                  <input
                    type="number"
                    value={newSalesPrice}
                    onChange={(e) => setNewSalesPrice(e.target.value)}
                    className="w-full border rounded px-2 py-1"
                    placeholder="0"
                  />
                </div>
                <button
                  onClick={addSalesVendor}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  추가
                </button>
              </div>
            )}
          </section>

          {/* 월별 원가 이력 - 읽기전용 */}
          {product?.monthlyCosts && product.monthlyCosts.length > 0 && (
            <section>
              <details>
                <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                  월별 원가 이력 보기 ({product.monthlyCosts.length}건)
                </summary>
                <table className="w-full mt-2 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">년월</th>
                      <th className="px-3 py-2 text-right">평균 원가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.monthlyCosts.map((mc: any, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">{mc.yearMonth}</td>
                        <td className="px-3 py-2 text-right">₩{mc.totalCost?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
