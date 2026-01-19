'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'
import Link from 'next/link'

interface ProductStatus {
  id: number
  name: string
  unit: string
  description: string | null
  totalPurchaseQty: number
  totalPurchaseAmount: number
  totalSalesQty: number
  totalSalesAmount: number
  currentStock: number
  latestPurchasePrice: number
  latestSalesPrice: number
}

interface ProductDetail {
  product: {
    id: number
    name: string
    unit: string
    description: string | null
    prices: Array<{
      id: number
      effectiveDate: string
      purchasePrice: number
      salesPrice: number
    }>
    sales: Array<{
      id: number
      date: string
      type: string
      quantity: number
      unitPrice: number
      amount: number
      salesperson: { name: string }
      category: { nameKo: string }
      vendor: { name: string } | null
      notes: string | null
    }>
  }
  summary: {
    totalPurchaseQty: number
    totalPurchaseAmount: number
    totalSalesQty: number
    totalSalesAmount: number
    currentStock: number
  }
}

export default function ProductStatusPage() {
  const [productStatus, setProductStatus] = useState<ProductStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null)

  useEffect(() => {
    fetchProductStatus()
  }, [])

  const fetchProductStatus = async () => {
    try {
      const res = await fetch('/api/sales-product-status')
      const data = await res.json()
      setProductStatus(data)
    } catch (error) {
      console.error('Error fetching product status:', error)
      alert('품목 현황 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const fetchProductDetail = async (productId: number) => {
    try {
      const res = await fetch(`/api/sales-product-status?productId=${productId}`)
      const data = await res.json()
      setProductDetail(data)
      setSelectedProductId(productId)
    } catch (error) {
      console.error('Error fetching product detail:', error)
      alert('품목 상세 조회 중 오류가 발생했습니다.')
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">품목별 현황</h1>
        <Link
          href="/sales/products"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          품목 관리
        </Link>
      </div>

      {/* 품목 현황 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">품목명</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">단위</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">총 매입수량</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">총 매입금액</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">총 매출수량</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">총 매출금액</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">현재고</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productStatus.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-gray-900">{product.unit}</td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatNumber(product.totalPurchaseQty, 2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ₩{formatNumber(product.totalPurchaseAmount, 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatNumber(product.totalSalesQty, 2)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    ₩{formatNumber(product.totalSalesAmount, 0)}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${
                    product.currentStock < 0 ? 'text-red-600' : 
                    product.currentStock === 0 ? 'text-gray-500' : 'text-green-600'
                  }`}>
                    {formatNumber(product.currentStock, 2)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => fetchProductDetail(product.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      상세보기
                    </button>
                  </td>
                </tr>
              ))}
              {productStatus.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    등록된 품목이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 품목 상세 모달 */}
      {selectedProductId !== null && productDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">품목 상세</h2>
            
            {/* 품목 정보 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">품목명</div>
                  <div className="text-lg font-bold text-gray-900">{productDetail.product.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">단위</div>
                  <div className="text-lg font-bold text-gray-900">{productDetail.product.unit}</div>
                </div>
                {productDetail.product.description && (
                  <div className="col-span-2">
                    <div className="text-sm text-gray-600">설명</div>
                    <div className="text-gray-900">{productDetail.product.description}</div>
                  </div>
                )}
              </div>
            </div>

            {/* 집계 정보 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600">총 매입수량</div>
                <div className="text-xl font-bold text-blue-900">
                  {formatNumber(productDetail.summary.totalPurchaseQty, 2)}
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600">총 매입금액</div>
                <div className="text-xl font-bold text-blue-900">
                  ₩{formatNumber(productDetail.summary.totalPurchaseAmount, 0)}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600">총 매출수량</div>
                <div className="text-xl font-bold text-green-900">
                  {formatNumber(productDetail.summary.totalSalesQty, 2)}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600">총 매출금액</div>
                <div className="text-xl font-bold text-green-900">
                  ₩{formatNumber(productDetail.summary.totalSalesAmount, 0)}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600">현재고</div>
                <div className={`text-xl font-bold ${
                  productDetail.summary.currentStock < 0 ? 'text-red-600' :
                  productDetail.summary.currentStock === 0 ? 'text-gray-500' : 'text-purple-900'
                }`}>
                  {formatNumber(productDetail.summary.currentStock, 2)}
                </div>
              </div>
            </div>

            {/* 단가 이력 */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-2 text-gray-900">단가 이력</h3>
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">적용일</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">매입단가</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">매출단가</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {productDetail.product.prices.map((price) => (
                      <tr key={price.id}>
                        <td className="px-4 py-2 text-gray-900">
                          {new Date(price.effectiveDate).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          ₩{formatNumber(price.purchasePrice, 0)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          ₩{formatNumber(price.salesPrice, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 거래 내역 */}
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-2 text-gray-900">거래 내역</h3>
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">날짜</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">구분</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">담당자</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">거래처</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">수량</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">단가</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">금액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {productDetail.product.sales.map((sale) => (
                        <tr key={sale.id}>
                          <td className="px-4 py-2 text-gray-900">
                            {new Date(sale.date).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              sale.type === 'SALES' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {sale.type === 'SALES' ? '매출' : '매입'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-900">{sale.salesperson.name}</td>
                          <td className="px-4 py-2 text-gray-900">{sale.vendor?.name || '-'}</td>
                          <td className="px-4 py-2 text-right text-gray-900">
                            {formatNumber(sale.quantity, 2)}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-900">
                            ₩{formatNumber(sale.unitPrice, 0)}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-900">
                            ₩{formatNumber(sale.amount, 0)}
                          </td>
                        </tr>
                      ))}
                      {productDetail.product.sales.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-4 text-center text-gray-500">
                            거래 내역이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => {
                  setSelectedProductId(null)
                  setProductDetail(null)
                }}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
