'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { VAT_RATE } from '@/lib/document-utils'

interface StatementItem {
  productName: string
  specification: string
  quantity: number
  unitPrice: number
  amount: number
}

export default function NewTransactionStatementPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0])
  const [recipientName, setRecipientName] = useState('')
  const [recipientRef, setRecipientRef] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientFax, setRecipientFax] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('납품 후 익월 현금결제')
  const [bankAccount, setBankAccount] = useState('하나은행 586-910007-02104 (예금주: 알레스인터네셔날 주식회사)')
  const [receiverName, setReceiverName] = useState('')

  const [items, setItems] = useState<StatementItem[]>([
    { productName: '', specification: '', quantity: 1, unitPrice: 0, amount: 0 }
  ])

  const addItem = () => {
    setItems([...items, { productName: '', specification: '', quantity: 1, unitPrice: 0, amount: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof StatementItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice
    }
    
    setItems(newItems)
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const vatAmount = Math.round(subtotal * VAT_RATE)
    const totalAmount = subtotal + vatAmount
    return { subtotal, vatAmount, totalAmount }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/documents/transaction-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryDate,
          recipientName,
          recipientRef,
          recipientPhone,
          recipientFax,
          paymentTerms,
          bankAccount,
          receiverName,
          items,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        alert('거래명세서가 생성되었습니다.')
        router.push(`/documents/transaction-statement/${data.id}`)
      } else {
        alert('거래명세서 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error creating transaction statement:', error)
      alert('거래명세서 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()

  return (
    <div className="container mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">거래명세서 작성</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">기본 정보</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              거래일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">거래처 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">받는분</label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">참조</label>
              <input
                type="text"
                value={recipientRef}
                onChange={(e) => setRecipientRef(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">전화</label>
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">팩스</label>
              <input
                type="text"
                value={recipientFax}
                onChange={(e) => setRecipientFax(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">품목 정보</h2>
            <button
              type="button"
              onClick={addItem}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              + 품목 추가
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">제품명</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">규격</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">수량</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">단가</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">금액</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">{index + 1}</td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => updateItem(index, 'productName', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.specification}
                        onChange={(e) => updateItem(index, 'specification', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-32 px-2 py-1 border border-gray-300 rounded"
                        min="0"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-4 py-2 font-medium">
                      {item.amount.toLocaleString('ko-KR')}
                    </td>
                    <td className="px-4 py-2">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          삭제
                        </button>
                      )}
                    </td>
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
                  <span>₩{totals.subtotal.toLocaleString('ko-KR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">부가세 (10%):</span>
                  <span>₩{totals.vatAmount.toLocaleString('ko-KR')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>총금액:</span>
                  <span>₩{totals.totalAmount.toLocaleString('ko-KR')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">지불 조건</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">지불조건</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">계좌번호</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">인수자명</label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? '저장 중...' : '거래명세서 생성'}
          </button>
        </div>
      </form>
    </div>
  )
}
