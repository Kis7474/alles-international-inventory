'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatNumber } from '@/lib/utils'

interface QuotationItem {
  id: number
  itemNo: number
  description: string
  quantity: number
  unit: string | null
  unitPrice: number
  amount: number
}

interface Quotation {
  id: number
  quotationNumber: string
  quotationDate: string
  validUntil: string | null
  customerName: string | null
  customerRef: string | null
  customerPhone: string | null
  customerFax: string | null
  customerEmail: string | null
  salesPersonName: string | null
  salesPersonPhone: string | null
  subtotal: number
  vatAmount: number
  totalAmount: number
  deliveryTerms: string | null
  paymentTerms: string | null
  validityPeriod: string | null
  notes: string | null
  items: QuotationItem[]
}

export default function QuotationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchQuotation()
    }
  }, [params.id])

  const fetchQuotation = async () => {
    try {
      const response = await fetch(`/api/documents/quotation/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setQuotation(data)
      } else {
        alert('견적서를 찾을 수 없습니다.')
        router.push('/documents/quotation')
      }
    } catch (error) {
      console.error('Error fetching quotation:', error)
      alert('견적서 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (!quotation) {
    return null
  }

  return (
    <div className="container mx-auto max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">견적서 상세</h1>
        <div className="flex gap-2">
          <a
            href={`/api/documents/quotation/${quotation.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            PDF 다운로드
          </a>
          <a
            href={`/api/documents/quotation/${quotation.id}/excel`}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Excel 다운로드
          </a>
          <button
            onClick={() => router.back()}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            목록으로
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">기본 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium">견적번호:</span> {quotation.quotationNumber}
            </div>
            <div>
              <span className="font-medium">견적일자:</span>{' '}
              {new Date(quotation.quotationDate).toLocaleDateString('ko-KR')}
            </div>
            {quotation.validUntil && (
              <div>
                <span className="font-medium">유효기한:</span>{' '}
                {new Date(quotation.validUntil).toLocaleDateString('ko-KR')}
              </div>
            )}
          </div>
        </div>

        {/* 담당자 정보 */}
        {(quotation.salesPersonName || quotation.salesPersonPhone) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">견적담당자</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quotation.salesPersonName && (
                <div>
                  <span className="font-medium">담당자명:</span> {quotation.salesPersonName}
                </div>
              )}
              {quotation.salesPersonPhone && (
                <div>
                  <span className="font-medium">연락처:</span> {quotation.salesPersonPhone}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 거래처 정보 */}
        {(quotation.customerName ||
          quotation.customerRef ||
          quotation.customerPhone ||
          quotation.customerFax ||
          quotation.customerEmail) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">거래처 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quotation.customerName && (
                <div>
                  <span className="font-medium">수신:</span> {quotation.customerName}
                </div>
              )}
              {quotation.customerRef && (
                <div>
                  <span className="font-medium">참조:</span> {quotation.customerRef}
                </div>
              )}
              {quotation.customerPhone && (
                <div>
                  <span className="font-medium">전화:</span> {quotation.customerPhone}
                </div>
              )}
              {quotation.customerFax && (
                <div>
                  <span className="font-medium">팩스:</span> {quotation.customerFax}
                </div>
              )}
              {quotation.customerEmail && (
                <div className="md:col-span-2">
                  <span className="font-medium">이메일:</span> {quotation.customerEmail}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 품목 정보 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">품목 정보</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    품목명/설명
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">수량</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">단위</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">단가</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {quotation.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">{item.itemNo}</td>
                    <td className="px-4 py-2">{item.description}</td>
                    <td className="px-4 py-2 text-right">{formatNumber(item.quantity, 2)}</td>
                    <td className="px-4 py-2 text-center">{item.unit || 'EA'}</td>
                    <td className="px-4 py-2 text-right">₩{formatNumber(item.unitPrice, 0)}</td>
                    <td className="px-4 py-2 text-right font-medium">₩{formatNumber(item.amount, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 합계 */}
          <div className="mt-4 border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">합계:</span>
                  <span>₩{formatNumber(quotation.subtotal, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">부가세 (10%):</span>
                  <span>₩{formatNumber(quotation.vatAmount, 0)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>총액:</span>
                  <span>₩{formatNumber(quotation.totalAmount, 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 추가 조건 */}
        {(quotation.deliveryTerms ||
          quotation.paymentTerms ||
          quotation.validityPeriod ||
          quotation.notes) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">추가 조건</h2>
            <div className="space-y-2">
              {quotation.deliveryTerms && (
                <div>
                  <span className="font-medium">납기:</span> {quotation.deliveryTerms}
                </div>
              )}
              {quotation.paymentTerms && (
                <div>
                  <span className="font-medium">지불조건:</span> {quotation.paymentTerms}
                </div>
              )}
              {quotation.validityPeriod && (
                <div>
                  <span className="font-medium">유효기간:</span> {quotation.validityPeriod}
                </div>
              )}
              {quotation.notes && (
                <div>
                  <span className="font-medium">비고:</span>
                  <div className="mt-1 whitespace-pre-wrap">{quotation.notes}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
