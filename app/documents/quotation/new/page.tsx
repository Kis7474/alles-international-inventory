'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface QuotationItem {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  amount: number
}

export default function NewQuotationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // 견적서 기본 정보
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerRef, setCustomerRef] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerFax, setCustomerFax] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [salesPersonName, setSalesPersonName] = useState('')
  const [salesPersonPhone, setSalesPersonPhone] = useState('')
  const [deliveryTerms, setDeliveryTerms] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [validityPeriod, setValidityPeriod] = useState('발행일로부터 30일간 유효')
  const [notes, setNotes] = useState('')

  // 품목
  const [items, setItems] = useState<QuotationItem[]>([
    { description: '', quantity: 1, unit: 'EA', unitPrice: 0, amount: 0 }
  ])

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit: 'EA', unitPrice: 0, amount: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof QuotationItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // 금액 자동 계산
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice
    }
    
    setItems(newItems)
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const vatAmount = Math.round(subtotal * 0.1)
    const totalAmount = subtotal + vatAmount
    return { subtotal, vatAmount, totalAmount }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/documents/quotation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quotationDate,
          validUntil: validUntil || null,
          customerName,
          customerRef,
          customerPhone,
          customerFax,
          customerEmail,
          salesPersonName,
          salesPersonPhone,
          deliveryTerms,
          paymentTerms,
          validityPeriod,
          notes,
          items,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        alert('견적서가 생성되었습니다.')
        router.push(`/documents/quotation/${data.id}`)
      } else {
        alert('견적서 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error creating quotation:', error)
      alert('견적서 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()

  return (
    <div className="container mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">견적서 작성</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">기본 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                견적일자 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                유효기한
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 담당자 정보 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">견적담당자 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                담당자명
              </label>
              <input
                type="text"
                value={salesPersonName}
                onChange={(e) => setSalesPersonName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                연락처
              </label>
              <input
                type="text"
                value={salesPersonPhone}
                onChange={(e) => setSalesPersonPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 거래처 정보 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">거래처 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                수신 (회사명)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                참조 (담당자)
              </label>
              <input
                type="text"
                value={customerRef}
                onChange={(e) => setCustomerRef(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                전화
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                팩스
              </label>
              <input
                type="text"
                value={customerFax}
                onChange={(e) => setCustomerFax(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 품목 정보 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">품목 정보</h2>
            <button
              type="button"
              onClick={addItem}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + 품목 추가
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">품목명/설명</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">수량</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">단위</th>
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
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        required
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
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded"
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

          {/* 합계 */}
          <div className="mt-4 border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">합계:</span>
                  <span>₩{totals.subtotal.toLocaleString('ko-KR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">부가세 (10%):</span>
                  <span>₩{totals.vatAmount.toLocaleString('ko-KR')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>총액:</span>
                  <span>₩{totals.totalAmount.toLocaleString('ko-KR')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 추가 조건 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">추가 조건</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                납기
              </label>
              <input
                type="text"
                value={deliveryTerms}
                onChange={(e) => setDeliveryTerms(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예) 계약 후 30일 이내"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                지불조건
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예) 납품 후 익월 현금결제"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                유효기간
              </label>
              <input
                type="text"
                value={validityPeriod}
                onChange={(e) => setValidityPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비고
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? '저장 중...' : '견적서 생성'}
          </button>
        </div>
      </form>
    </div>
  )
}
