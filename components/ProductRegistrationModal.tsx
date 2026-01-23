'use client'

import { useState } from 'react'

interface Vendor {
  id: number
  code: string
  name: string
  type: string
}

interface ProductRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (productId: number) => void
  vendors: Vendor[]
}

export default function ProductRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
  vendors,
}: ProductRegistrationModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    unit: 'EA',
    purchaseVendorId: '',
    code: '',
    description: '',
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.purchaseVendorId) {
      alert('품목명과 매입 거래처는 필수입니다.')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          purchaseVendorId: parseInt(formData.purchaseVendorId),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '품목 등록에 실패했습니다.')
      }

      const newProduct = await res.json()
      alert('품목이 등록되었습니다.')
      
      // Reset form
      setFormData({
        name: '',
        unit: 'EA',
        purchaseVendorId: '',
        code: '',
        description: '',
      })
      
      // Call success callback with new product ID
      onSuccess(newProduct.id)
      onClose()
    } catch (error) {
      console.error('Product registration error:', error)
      alert(error instanceof Error ? error.message : '품목 등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: '',
      unit: 'EA',
      purchaseVendorId: '',
      code: '',
      description: '',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">품목 등록</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* 품목명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                품목명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="품목명을 입력하세요"
              />
            </div>

            {/* 품목 코드 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                품목 코드
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="선택 입력"
              />
            </div>

            {/* 단위 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                단위 <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EA">EA</option>
                <option value="BOX">BOX</option>
                <option value="KG">KG</option>
                <option value="SET">SET</option>
                <option value="ROLL">ROLL</option>
                <option value="M">M</option>
                <option value="L">L</option>
              </select>
            </div>

            {/* 매입 거래처 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                매입 거래처 <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.purchaseVendorId}
                onChange={(e) => setFormData({ ...formData, purchaseVendorId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">거래처 선택</option>
                {vendors
                  .filter((v) => v.type.includes('PURCHASE'))
                  .map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name} ({vendor.code})
                    </option>
                  ))}
              </select>
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="품목에 대한 설명을 입력하세요"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
