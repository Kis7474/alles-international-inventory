'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
  subtotal: number
  vatAmount: number
  totalAmount: number
  items: TransactionStatementItem[]
}

export default function TransactionStatementListPage() {
  const [statements, setStatements] = useState<TransactionStatement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatements()
  }, [])

  const fetchStatements = async () => {
    try {
      const response = await fetch('/api/documents/transaction-statement')
      const data = await response.json()
      setStatements(data.data || [])
    } catch (error) {
      console.error('Error fetching transaction statements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('거래명세서를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/documents/transaction-statement/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('거래명세서가 삭제되었습니다.')
        fetchStatements()
      } else {
        alert('거래명세서 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error deleting transaction statement:', error)
      alert('거래명세서 삭제 중 오류가 발생했습니다.')
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
        <h1 className="text-3xl font-bold">거래명세서 목록</h1>
        <Link
          href="/documents/transaction-statement/new"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          + 거래명세서 작성
        </Link>
      </div>

      {statements.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600 mb-4">등록된 거래명세서가 없습니다.</p>
          <Link
            href="/documents/transaction-statement/new"
            className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            거래명세서 작성하기
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  거래번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  거래일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  받는분
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  총금액
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {statements.map((statement) => (
                <tr key={statement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/documents/transaction-statement/${statement.id}`}
                      className="text-green-600 hover:text-green-800 font-medium"
                    >
                      {statement.statementNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(statement.deliveryDate).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {statement.recipientName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                    ₩{formatNumber(statement.totalAmount, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2">
                      <a
                        href={`/api/documents/transaction-statement/${statement.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        PDF
                      </a>
                      <a
                        href={`/api/documents/transaction-statement/${statement.id}/excel`}
                        className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        Excel
                      </a>
                      <button
                        onClick={() => handleDelete(statement.id)}
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
