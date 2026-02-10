'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Salesperson {
  id: number
  code: string
  name: string
  commissionRate: number
}

interface Category {
  id: number
  code: string
  nameKo: string
}

export default function EditSalesPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [salespersons, setSalespersons] = useState<Salesperson[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    date: '',
    type: 'SALES',
    salespersonId: '',
    categoryId: '',
    vendorId: '', // NEW: preserve vendorId
    productId: '', // NEW: preserve productId
    itemName: '',
    customer: '',
    quantity: '',
    unitPrice: '',
    cost: '',
    notes: '',
  })

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      const [salesRes, salespersonsRes, categoriesRes] = await Promise.all([
        fetch(`/api/sales/${id}`),
        fetch('/api/salesperson'),
        fetch('/api/categories'),
      ])

      const salesData = await salesRes.json()
      const salespersonsData = await salespersonsRes.json()
      const categoriesData = await categoriesRes.json()

      setSalespersons(salespersonsData)
      setCategories(categoriesData)

      setFormData({
        date: new Date(salesData.date).toISOString().split('T')[0],
        type: salesData.type,
        salespersonId: salesData.salespersonId.toString(),
        categoryId: salesData.categoryId.toString(),
        vendorId: salesData.vendorId ? salesData.vendorId.toString() : '', // NEW: preserve vendorId
        productId: salesData.productId ? salesData.productId.toString() : '', // NEW: preserve productId
        itemName: salesData.itemName,
        customer: salesData.customer || '',
        quantity: salesData.quantity.toString(),
        unitPrice: salesData.unitPrice.toString(),
        cost: salesData.cost.toString(),
        notes: salesData.notes || '',
      })
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('데이터 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/sales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(id), ...formData }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '수정 중 오류가 발생했습니다.')
        return
      }

      alert('매입매출이 수정되었습니다.')
      router.push('/sales')
    } catch (error) {
      console.error('Error updating sales record:', error)
      alert('수정 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const calculateAmount = () => {
    const quantity = parseFloat(formData.quantity) || 0
    const unitPrice = parseFloat(formData.unitPrice) || 0
    return quantity * unitPrice
  }

  const calculateMargin = () => {
    if (formData.type !== 'SALES') return 0
    const amount = calculateAmount()
    const cost = parseFloat(formData.cost) || 0
    return amount - cost
  }

  const calculateMarginRate = () => {
    const amount = calculateAmount()
    if (amount === 0) return 0
    const margin = calculateMargin()
    return (margin / amount) * 100
  }

  const getCommissionRate = () => {
    const selectedSalesperson = salespersons.find(
      (sp) => sp.id === parseInt(formData.salespersonId)
    )
    return selectedSalesperson?.commissionRate || 0
  }

  const calculateCommission = () => {
    if (formData.type !== 'SALES') return 0
    const margin = calculateMargin()
    const commissionRate = getCommissionRate()
    return margin * commissionRate
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
        <h1 className="text-3xl font-bold text-gray-900">매입매출 수정</h1>
        <Link
          href="/sales"
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
        >
          목록으로
        </Link>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                날짜 *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                거래유형 *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
              >
                <option value="SALES">매출</option>
                <option value="PURCHASE">매입</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                담당자 *
              </label>
              <select
                required
                value={formData.salespersonId}
                onChange={(e) =>
                  setFormData({ ...formData, salespersonId: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
              >
                <option value="">선택하세요</option>
                {salespersons.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                    {sp.commissionRate > 0 && ` (커미션 ${sp.commissionRate * 100}%)`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 품목 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                카테고리 *
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData({ ...formData, categoryId: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
              >
                <option value="">선택하세요</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nameKo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                품목명 *
              </label>
              <input
                type="text"
                required
                value={formData.itemName}
                onChange={(e) =>
                  setFormData({ ...formData, itemName: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                placeholder="품목명을 입력하세요"
              />
            </div>
          </div>

          {/* 거래처 */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              거래처
            </label>
            <input
              type="text"
              value={formData.customer}
              onChange={(e) =>
                setFormData({ ...formData, customer: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
              placeholder="거래처명을 입력하세요"
            />
          </div>

          {/* 금액 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                수량 *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                단가 *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.unitPrice}
                onChange={(e) =>
                  setFormData({ ...formData, unitPrice: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                placeholder="0"
              />
            </div>

            {formData.type === 'SALES' && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  원가
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="0"
                />
              </div>
            )}
          </div>

          {/* 계산 결과 표시 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-3 text-gray-900">계산 결과</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">금액</div>
                <div className="text-lg font-bold text-gray-900">
                  ₩{calculateAmount().toLocaleString()}
                </div>
              </div>
              {formData.type === 'SALES' && (
                <>
                  <div>
                    <div className="text-sm text-gray-600">마진</div>
                    <div className="text-lg font-bold text-green-600">
                      ₩{calculateMargin().toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">마진율</div>
                    <div className="text-lg font-bold text-purple-600">
                      {calculateMarginRate().toFixed(1)}%
                    </div>
                  </div>
                  {getCommissionRate() > 0 && (
                    <div>
                      <div className="text-sm text-gray-600">
                        커미션 ({getCommissionRate() * 100}%)
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        ₩{calculateCommission().toLocaleString()}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 비고 */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              비고
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
              rows={3}
              placeholder="비고 사항을 입력하세요"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
            <Link
              href="/sales"
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
