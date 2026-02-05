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
  defaultSalesPrice: number | null
  currentCost: number | null
  purchaseVendorId: number | null
  purchaseVendor: Vendor | null
  priceHistory: ProductPriceHistory[]
  monthlyCosts: ProductMonthlyCost[]
  salesVendorsWithPrices: SalesVendorWithPrice[]
}

interface ProductDetailModalProps {
  productId: number
  onClose: () => void
}

export default function ProductDetailModal({ productId, onClose }: ProductDetailModalProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPriceHistory, setShowPriceHistory] = useState(false)
  const [showMonthlyCosts, setShowMonthlyCosts] = useState(false)

  const fetchProductDetail = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`)
      const data = await res.json()
      setProduct(data)
    } catch (error) {
      console.error('Error fetching product detail:', error)
      alert('품목 상세 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProductDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-xl text-gray-700">로딩 중...</div>
        </div>
      </div>
    )
  }

  if (!product) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">품목 상세 정보</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 기본 정보 섹션 */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">기본 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">품목코드</label>
                <p className="text-gray-900">{product.code || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">품목명</label>
                <p className="text-gray-900">{product.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">카테고리</label>
                <p className="text-gray-900">{product.category?.nameKo || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">단위</label>
                <p className="text-gray-900">{product.unit}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">품목유형</label>
                <p className="text-gray-900">{product.type}</p>
              </div>
              {product.description && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-600">설명</label>
                  <p className="text-gray-900">{product.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* 매입 정보 섹션 */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">매입 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">매입거래처</label>
                <p className="text-gray-900">
                  {product.purchaseVendor ? `[${product.purchaseVendor.code}] ${product.purchaseVendor.name}` : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">현재 매입가</label>
                <p className="text-gray-900 font-semibold">
                  {product.defaultPurchasePrice ? formatCurrency(product.defaultPurchasePrice) : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">현재 원가 (창고료 포함)</label>
                <p className="text-gray-900 font-semibold text-green-700">
                  {product.currentCost ? formatCurrency(product.currentCost) : '-'}
                </p>
                <p className="text-xs text-gray-500">자동 계산 (읽기전용)</p>
              </div>
            </div>

            {/* 매입가 이력 */}
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
          </div>

          {/* 매출 정보 섹션 */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">매출 정보</h3>
            
            {product.salesVendorsWithPrices.length > 0 ? (
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
          </div>

          {/* 월별 원가 이력 섹션 */}
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
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
