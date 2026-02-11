'use client'

import { useState } from 'react'
import { formatNumber } from '@/lib/utils'

interface ModalItem {
  productName: string
  quantity: number
  unitPrice: number
  amount: number
}

interface TransactionStatementModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (deliveryDate: string) => void
  vendorName: string
  items: ModalItem[]
  loading?: boolean
}

export default function TransactionStatementModal({
  isOpen,
  onClose,
  onConfirm,
  vendorName,
  items,
  loading = false,
}: TransactionStatementModalProps) {
  // Default to today's date
  const today = new Date().toISOString().split('T')[0]
  const [deliveryDate, setDeliveryDate] = useState(today)

  if (!isOpen) return null

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  const handleConfirm = () => {
    onConfirm(deliveryDate)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">거래명세서 생성 미리보기</h2>
              <p className="text-sm text-gray-600 mt-1">생성 전 내용을 확인해주세요</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <span className="text-2xl">✕</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Vendor Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">거래처명</p>
                <p className="text-xl font-bold text-gray-900">{vendorName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">총 품목 수</p>
                <p className="text-xl font-bold text-blue-600">{items.length}개</p>
              </div>
            </div>
          </div>

          {/* Delivery Date Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              납품일자 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">거래명세서에 표시될 납품일자를 선택하세요</p>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">품목 목록</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        품목명
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                        수량
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                        단가
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                        금액
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.productName}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {formatNumber(item.quantity, 2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          ₩{formatNumber(item.unitPrice, 0)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">
                          ₩{formatNumber(item.amount, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan={2} className="px-4 py-3 text-sm font-bold text-gray-900">
                        합계
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                        {formatNumber(totalQuantity, 2)}
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-blue-600">
                        ₩{formatNumber(totalAmount, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">총 품목 수</p>
              <p className="text-2xl font-bold text-gray-900">{items.length}개</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">총 수량</p>
              <p className="text-2xl font-bold text-gray-900">{formatNumber(totalQuantity, 2)}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">총 금액</p>
              <p className="text-2xl font-bold text-blue-600">₩{formatNumber(totalAmount, 0)}</p>
            </div>
          </div>

          {/* Info Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <span className="text-yellow-600 mr-2">ℹ️</span>
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">안내사항</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>거래명세서 생성 후 상세 페이지로 이동합니다</li>
                  <li>생성 후 수정이 필요한 경우 상세 페이지에서 편집할 수 있습니다</li>
                  <li>결제조건 및 계좌정보는 기본값이 적용됩니다</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              disabled={loading}
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading || !deliveryDate}
            >
              {loading ? '생성 중...' : '거래명세서 생성'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
