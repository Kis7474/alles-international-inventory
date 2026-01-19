'use client'

import { useEffect, useState } from 'react'

interface Vendor {
  id: number
  name: string
  type: string
  contact: string | null
  address: string | null
  notes: string | null
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'DOMESTIC',
    contact: '',
    address: '',
    notes: '',
  })

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/vendors')
      const data = await res.json()
      setVendors(data)
    } catch (error) {
      console.error('Error fetching vendors:', error)
      alert('거래처 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = '/api/vendors'
      const method = editingVendor ? 'PUT' : 'POST'
      const body = editingVendor
        ? { id: editingVendor.id, ...formData }
        : formData

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '저장 중 오류가 발생했습니다.')
        return
      }

      alert(editingVendor ? '거래처가 수정되었습니다.' : '거래처가 등록되었습니다.')
      setShowForm(false)
      setEditingVendor(null)
      resetForm()
      fetchVendors()
    } catch (error) {
      console.error('Error saving vendor:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setFormData({
      name: vendor.name,
      type: vendor.type || 'DOMESTIC',
      contact: vendor.contact || '',
      address: vendor.address || '',
      notes: vendor.notes || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/vendors?id=${id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
        return
      }

      alert('삭제되었습니다.')
      fetchVendors()
    } catch (error) {
      console.error('Error deleting vendor:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'DOMESTIC',
      contact: '',
      address: '',
      notes: '',
    })
  }

  if (loading && !showForm) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-700">로딩 중...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">거래처 관리</h1>
        <button
          onClick={() => {
            setEditingVendor(null)
            resetForm()
            setShowForm(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 거래처 등록
        </button>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            {editingVendor ? '거래처 수정' : '거래처 등록'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  거래처명 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="거래처명을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  유형 *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                >
                  <option value="DOMESTIC">국내 (매입/매출용)</option>
                  <option value="OVERSEAS">해외 (수입/수출용)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                연락처
              </label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                placeholder="연락처를 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                주소
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                placeholder="주소를 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                메모
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-gray-900"
                rows={3}
                placeholder="메모를 입력하세요"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingVendor(null)
                  resetForm()
                }}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 거래처 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">거래처명</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">유형</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">연락처</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">주소</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">메모</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{vendor.name}</td>
                  <td className="px-4 py-3 text-gray-900">
                    <span className={`px-2 py-1 rounded-full text-xs ${vendor.type === 'DOMESTIC' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                      {vendor.type === 'DOMESTIC' ? '국내' : '해외'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{vendor.contact || '-'}</td>
                  <td className="px-4 py-3 text-gray-900">{vendor.address || '-'}</td>
                  <td className="px-4 py-3 text-gray-900">{vendor.notes || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEdit(vendor)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(vendor.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {vendors.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    등록된 거래처가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
