'use client'

import { useEffect, useMemo, useState } from 'react'

interface Category {
  id: number
  nameKo: string
}

interface Vendor {
  id: number
  name: string
}

interface Service {
  id: number
  name: string
  description: string | null
  serviceHours: number | null
  salesVendorId: number | null
  salesVendor: Vendor | null
  categoryId: number | null
  category: Category | null
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    serviceHours: '',
    salesVendorId: '',
    categoryId: '',
  })

  const vendorHourSummary = useMemo(() => {
    const map = new Map<string, number>()
    services.forEach((service) => {
      const key = service.salesVendor?.name ?? '미지정 거래처'
      const prev = map.get(key) ?? 0
      map.set(key, prev + (service.serviceHours ?? 0))
    })
    return Array.from(map.entries()).map(([vendorName, totalHours]) => ({ vendorName, totalHours }))
      .sort((a, b) => b.totalHours - a.totalHours)
  }, [services])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [servicesRes, categoriesRes, vendorsRes] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/categories'),
        fetch('/api/vendors'),
      ])
      const [servicesData, categoriesData, vendorsData] = await Promise.all([
        servicesRes.json(),
        categoriesRes.json(),
        vendorsRes.json(),
      ])

      setServices(servicesData)
      setCategories(categoriesData)
      setVendors(vendorsData)
    } catch (error) {
      console.error('Error fetching services data:', error)
      alert('데이터 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', serviceHours: '', salesVendorId: '', categoryId: '' })
    setEditingService(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const method = editingService ? 'PUT' : 'POST'
    const payload = editingService
      ? { id: editingService.id, ...formData }
      : formData

    try {
      const res = await fetch('/api/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '저장 중 오류가 발생했습니다.')
        return
      }

      await fetchData()
      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Error saving service:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description ?? '',
      serviceHours: service.serviceHours?.toString() ?? '',
      salesVendorId: service.salesVendorId?.toString() ?? '',
      categoryId: service.categoryId?.toString() ?? '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/services?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '삭제에 실패했습니다.')
        return
      }

      await fetchData()
    } catch (error) {
      console.error('Error deleting service:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-lg">로딩 중...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">서비스</h1>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          + 서비스 등록
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">거래처별 작업시간 합계</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left">거래처</th>
                <th className="px-3 py-2 text-right">총 작업시간</th>
              </tr>
            </thead>
            <tbody>
              {vendorHourSummary.map((row) => (
                <tr key={row.vendorName} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{row.vendorName}</td>
                  <td className="px-3 py-2 text-right font-medium">{row.totalHours.toFixed(2)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">거래처</th>
              <th className="px-4 py-3 text-left">서비스명</th>
              <th className="px-4 py-3 text-left">설명</th>
              <th className="px-4 py-3 text-right">시간</th>
              <th className="px-4 py-3 text-left">카테고리</th>
              <th className="px-4 py-3 text-center">작업</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id} className="border-b last:border-b-0 hover:bg-gray-50">
                <td className="px-4 py-3">{service.salesVendor?.name ?? '-'}</td>
                <td className="px-4 py-3 font-medium">{service.name}</td>
                <td className="px-4 py-3">{service.description || '-'}</td>
                <td className="px-4 py-3 text-right">{(service.serviceHours ?? 0).toFixed(2)}h</td>
                <td className="px-4 py-3">{service.category?.nameKo ?? '-'}</td>
                <td className="px-4 py-3 text-center">
                  <div className="inline-flex gap-2">
                    <button onClick={() => handleEdit(service)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">수정</button>
                    <button onClick={() => handleDelete(service.id)} className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700">삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">{editingService ? '서비스 수정' : '서비스 등록'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">서비스명 *</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">거래처</label>
                <select
                  value={formData.salesVendorId}
                  onChange={(e) => setFormData((p) => ({ ...p, salesVendorId: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">선택 안함</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">시간</label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={formData.serviceHours}
                  onChange={(e) => setFormData((p) => ({ ...p, serviceHours: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">카테고리</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData((p) => ({ ...p, categoryId: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">선택 안함</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.nameKo}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300">취소</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
