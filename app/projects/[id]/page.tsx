'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'



export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    customer: '',
    startDate: '',
    endDate: '',
    status: 'IN_PROGRESS',
    currency: 'KRW',
    exchangeRate: '1',
    partsCost: '',
    laborCost: '',
    customsCost: '',
    shippingCost: '',
    otherCost: '',
    salesPrice: '',
    description: '',
  })
  
  const [calculated, setCalculated] = useState({
    totalCost: 0,
    margin: 0,
    marginRate: 0,
  })

  useEffect(() => {
    fetchProject()
  }, [])
  
  useEffect(() => {
    calculateValues()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.partsCost,
    formData.laborCost,
    formData.customsCost,
    formData.shippingCost,
    formData.otherCost,
    formData.salesPrice,
  ])

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects?id=${id}`)
      if (!res.ok) {
        throw new Error('Project not found')
      }
      const data = await res.json()
      
      setFormData({
        code: data.code,
        name: data.name,
        customer: data.customer || '',
        startDate: new Date(data.startDate).toISOString().split('T')[0],
        endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
        status: data.status,
        currency: data.currency,
        exchangeRate: data.exchangeRate.toString(),
        partsCost: data.partsCost?.toString() || '',
        laborCost: data.laborCost?.toString() || '',
        customsCost: data.customsCost?.toString() || '',
        shippingCost: data.shippingCost?.toString() || '',
        otherCost: data.otherCost?.toString() || '',
        salesPrice: data.salesPrice.toString(),
        description: data.description || '',
      })
      setLoading(false)
    } catch (error) {
      console.error('Error fetching project:', error)
      alert('데이터 로딩 중 오류가 발생했습니다.')
      router.push('/projects')
    }
  }
  
  const calculateValues = () => {
    const partsCost = parseFloat(formData.partsCost) || 0
    const laborCost = parseFloat(formData.laborCost) || 0
    const customsCost = parseFloat(formData.customsCost) || 0
    const shippingCost = parseFloat(formData.shippingCost) || 0
    const otherCost = parseFloat(formData.otherCost) || 0
    const salesPrice = parseFloat(formData.salesPrice) || 0
    
    const totalCost = partsCost + laborCost + customsCost + shippingCost + otherCost
    const margin = salesPrice - totalCost
    const marginRate = salesPrice > 0 ? (margin / salesPrice) * 100 : 0
    
    setCalculated({
      totalCost,
      margin,
      marginRate,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setSubmitting(true)
    
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, id: parseInt(id) }),
      })
      
      if (res.ok) {
        alert('수정되었습니다.')
        router.push('/projects')
      } else {
        const error = await res.json()
        alert(error.error || '수정 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('수정 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">프로젝트 상세</h1>
        <button
          onClick={() => router.push('/projects')}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          목록으로
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        {/* 기본 정보 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">기본 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로젝트 코드 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로젝트명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                고객사
              </label>
              <input
                type="text"
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="고객사명을 입력하세요"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상태 <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="IN_PROGRESS">진행중</option>
                <option value="COMPLETED">완료</option>
                <option value="CANCELLED">취소</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료일 (예정)
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                통화 <span className="text-red-500">*</span>
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="KRW">KRW (원화)</option>
                <option value="USD">USD (미국 달러)</option>
                <option value="EUR">EUR (유로)</option>
                <option value="JPY">JPY (일본 엔)</option>
                <option value="CNY">CNY (중국 위안)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                환율 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="exchangeRate"
                value={formData.exchangeRate}
                onChange={handleChange}
                required
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* 원가 구성 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">원가 구성</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                부품비 (₩)
              </label>
              <input
                type="number"
                name="partsCost"
                value={formData.partsCost}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                인건비 (₩)
              </label>
              <input
                type="number"
                name="laborCost"
                value={formData.laborCost}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                관세 (₩)
              </label>
              <input
                type="number"
                name="customsCost"
                value={formData.customsCost}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                운송비 (₩)
              </label>
              <input
                type="number"
                name="shippingCost"
                value={formData.shippingCost}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                기타비용 (₩)
              </label>
              <input
                type="number"
                name="otherCost"
                value={formData.otherCost}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-green-50 rounded-md">
            <div className="text-sm text-gray-700">
              총 원가: <span className="font-semibold text-green-600">{formatCurrency(calculated.totalCost)}</span>
            </div>
          </div>
        </div>

        {/* 매출 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">매출</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                매출가 (₩) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="salesPrice"
                value={formData.salesPrice}
                onChange={handleChange}
                required
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>
          
          {parseFloat(formData.salesPrice) > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md space-y-2">
              <div className="text-sm text-gray-700">
                마진: <span className={`font-semibold ${calculated.margin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(calculated.margin)}
                </span>
              </div>
              <div className="text-sm text-gray-700">
                마진율: <span className={`font-semibold ${calculated.marginRate >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {calculated.marginRate.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 설명 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">설명</h2>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="프로젝트 설명을 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push('/projects')}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {submitting ? '수정 중...' : '수정'}
          </button>
        </div>
      </form>
    </div>
  )
}
