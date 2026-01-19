'use client'

import { useEffect, useState } from 'react'

interface Salesperson {
  id: number
  code: string
  name: string
  commissionRate: number
}

export default function SalespersonPage() {
  const [salespersons, setSalespersons] = useState<Salesperson[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSalesperson, setEditingSalesperson] = useState<Salesperson | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    commissionRate: '',
  })

  useEffect(() => {
    fetchSalespersons()
  }, [])

  const fetchSalespersons = async () => {
    try {
      const res = await fetch('/api/salesperson')
      const data = await res.json()
      setSalespersons(data)
    } catch (error) {
      console.error('Error fetching salespersons:', error)
      alert('담당자 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = '/api/salesperson'
      const method = editingSalesperson ? 'PUT' : 'POST'
      const body = editingSalesperson
        ? { id: editingSalesperson.id, ...formData, commissionRate: parseFloat(formData.commissionRate) / 100 }
        : { ...formData, commissionRate: parseFloat(formData.commissionRate) / 100 }

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

      alert(editingSalesperson ? '담당자가 수정되었습니다.' : '담당자가 등록되었습니다.')
      setShowForm(false)
      setEditingSalesperson(null)
      resetForm()
      fetchSalespersons()
    } catch (error) {
      console.error('Error saving salesperson:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (salesperson: Salesperson) => {
    setEditingSalesperson(salesperson)
    setFormData({
      code: salesperson.code,
      name: salesperson.name,
      commissionRate: (salesperson.commissionRate * 100).toString(),
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/salesperson?id=${id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
        return
      }

      alert('삭제되었습니다.')
      fetchSalespersons()
    } catch (error) {
      console.error('Error deleting salesperson:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      commissionRate: '',
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
        <h1 className="text-3xl font-bold text-gray-900">담당자 관리</h1>
        <button
          onClick={() => {
            setEditingSalesperson(null)
            resetForm()
            setShowForm(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 담당자 등록
        </button>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            {editingSalesperson ? '담당자 수정' : '담당자 등록'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  담당자 코드 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="BS, IK, YR, SJ 등"
                  disabled={!!editingSalesperson}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  담당자 이름 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="이름을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  커미션율 (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="0"
                />
              </div>
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
                  setEditingSalesperson(null)
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

      {/* 담당자 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">코드</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">이름</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">커미션율</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {salespersons.map((person) => (
                <tr key={person.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{person.code}</td>
                  <td className="px-4 py-3 text-gray-900">{person.name}</td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {(person.commissionRate * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEdit(person)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(person.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {salespersons.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    등록된 담당자가 없습니다.
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
