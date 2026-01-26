'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
  salesPersonName: string | null
  subtotal: number
  vatAmount: number
  totalAmount: number
  items: QuotationItem[]
}

export default function QuotationListPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuotations()
  }, [])

  const fetchQuotations = async () => {
    try {
      const response = await fetch('/api/documents/quotation')
      const data = await response.json()
      setQuotations(data.data || [])
    } catch (error) {
      console.error('Error fetching quotations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('견적서를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/documents/quotation/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('견적서가 삭제되었습니다.')
        fetchQuotations()
      } else {
        alert('견적서 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error deleting quotation:', error)
      alert('견적서 삭제 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">견적서 목록</h1>
        <Link
          href="/documents/quotation/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 견적서 작성
        </Link>
      </div>

      {quotations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600 mb-4">등록된 견적서가 없습니다.</p>
          <Link
            href="/documents/quotation/new"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            견적서 작성하기
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  견적번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  견적일자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  고객명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  담당자
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  총액
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quotations.map((quotation) => (
                <tr key={quotation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/documents/quotation/${quotation.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {quotation.quotationNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(quotation.quotationDate).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {quotation.customerName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {quotation.salesPersonName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                    ₩{formatNumber(quotation.totalAmount, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2">
                      <a
                        href={`/api/documents/quotation/${quotation.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        PDF
                      </a>
                      <a
                        href={`/api/documents/quotation/${quotation.id}/excel`}
                        className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        Excel
                      </a>
                      <button
                        onClick={() => handleDelete(quotation.id)}
                        className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
