'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatNumber } from '@/lib/utils'

interface TransactionStatementItem {
  id: number
  itemNo: number
  productName: string
  specification: string | null
  quantity: number
  unitPrice: number
  amount: number
}

interface TransactionStatement {
  id: number
  statementNumber: string
  deliveryDate: string
  recipientName: string | null
  recipientRef: string | null
  recipientPhone: string | null
  recipientFax: string | null
  subtotal: number
  vatAmount: number
  totalAmount: number
  paymentTerms: string | null
  bankAccount: string | null
  receiverName: string | null
  items: TransactionStatementItem[]
}

export default function TransactionStatementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [statement, setStatement] = useState<TransactionStatement | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchStatement()
    }
  }, [params.id])

  const fetchStatement = async () => {
    try {
      const response = await fetch(`/api/documents/transaction-statement/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setStatement(data)
      } else {
        alert('거래명세서를 찾을 수 없습니다.')
        router.push('/documents/transaction-statement')
      }
    } catch (error) {
      console.error('Error fetching transaction statement:', error)
      alert('거래명세서 조회 중 오류가 발생했습니다.')
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

  if (!statement) {
    return null
  }

  return (
    <div className="container mx-auto max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">거래명세서 상세</h1>
        <div className="flex gap-2">
          <a
            href={`/api/documents/transaction-statement/${statement.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            PDF 다운로드
          </a>
          <a
            href={`/api/documents/transaction-statement/${statement.id}/excel`}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Excel 다운로드
          </a>
          <button
            onClick={() => router.back()}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            목록으로
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">기본 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium">거래번호:</span> {statement.statementNumber}
            </div>
            <div>
              <span className="font-medium">거래일:</span>{' '}
              {new Date(statement.deliveryDate).toLocaleDateString('ko-KR')}
            </div>
          </div>
        </div>

        {(statement.recipientName || statement.recipientRef || statement.recipientPhone || statement.recipientFax) && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">거래처 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {statement.recipientName && (
                <div>
                  <span className="font-medium">받는분:</span> {statement.recipientName}
                </div>
              )}
              {statement.recipientRef && (
                <div>
                  <span className="font-medium">참조:</span> {statement.recipientRef}
                </div>
              )}
              {statement.recipientPhone && (
                <div>
                  <span className="font-medium">전화:</span> {statement.recipientPhone}
                </div>
              )}
              {statement.recipientFax && (
                <div>
                  <span className="font-medium">팩스:</span> {statement.recipientFax}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">품목 정보</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">제품명</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">규격</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">수량</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">단가</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {statement.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">{item.itemNo}</td>
                    <td className="px-4 py-2">{item.productName}</td>
                    <td className="px-4 py-2">{item.specification || '-'}</td>
                    <td className="px-4 py-2 text-right">{formatNumber(item.quantity, 2)}</td>
                    <td className="px-4 py-2 text-right">₩{formatNumber(item.unitPrice, 0)}</td>
                    <td className="px-4 py-2 text-right font-medium">₩{formatNumber(item.amount, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">금액(공급가액):</span>
                  <span>₩{formatNumber(statement.subtotal, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">부가세 (10%):</span>
                  <span>₩{formatNumber(statement.vatAmount, 0)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>총금액:</span>
                  <span>₩{formatNumber(statement.totalAmount, 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">지불 조건</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">지불조건:</span>{' '}
              {statement.paymentTerms || '납품 후 익월 현금결제'}
            </div>
            <div>
              <span className="font-medium">계좌번호:</span>{' '}
              {statement.bankAccount || '하나은행 586-910007-02104 (예금주: 알레스인터네셔날 주식회사)'}
            </div>
            {statement.receiverName && (
              <div>
                <span className="font-medium">인수자:</span> {statement.receiverName}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
