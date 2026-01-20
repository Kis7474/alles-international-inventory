'use client'

import { useEffect, useState } from 'react'

interface Category {
  id: number
  code: string
  name: string
  nameKo: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)
  
  // 필터 상태
  const [filterSearchName, setFilterSearchName] = useState('')
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameKo: '',
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
      alert('카테고리 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterSearchName) params.append('searchName', filterSearchName)

      const res = await fetch(`/api/categories?${params.toString()}`)
      const data = await res.json()
      setCategories(data)
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error filtering categories:', error)
      alert('필터링 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = '/api/categories'
      const method = editingCategory ? 'PUT' : 'POST'
      const body = editingCategory
        ? { id: editingCategory.id, ...formData }
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

      alert(editingCategory ? '카테고리가 수정되었습니다.' : '카테고리가 등록되었습니다.')
      setShowForm(false)
      setEditingCategory(null)
      resetForm()
      fetchCategories()
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error saving category:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      code: category.code,
      name: category.name,
      nameKo: category.nameKo,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
        return
      }

      alert('삭제되었습니다.')
      fetchCategories()
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
    } else {
      setSelectedIds(categories.map(r => r.id))
    }
    setSelectAll(!selectAll)
  }

  const handleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.length}개 항목을 삭제하시겠습니까?`)) return
    
    try {
      const res = await fetch('/api/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || '삭제 중 오류가 발생했습니다.')
        return
      }

      alert(`${selectedIds.length}개 항목이 삭제되었습니다.`)
      fetchCategories()
      setSelectedIds([])
      setSelectAll(false)
    } catch (error) {
      console.error('Error bulk deleting categories:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      nameKo: '',
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
        <h1 className="text-3xl font-bold text-gray-900">카테고리 관리</h1>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              선택 삭제 ({selectedIds.length}개)
            </button>
          )}
          <button
            onClick={() => {
              setEditingCategory(null)
              resetForm()
              setShowForm(true)
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + 카테고리 등록
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-bold mb-4 text-gray-900">필터</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">카테고리명 검색</label>
            <input
              type="text"
              value={filterSearchName}
              onChange={(e) => setFilterSearchName(e.target.value)}
              placeholder="코드, 영문명, 한글명으로 검색"
              className="w-full px-3 py-2 border rounded-lg text-gray-900"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <button
            onClick={handleFilter}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            필터 적용
          </button>
          <button
            onClick={() => {
              setFilterSearchName('')
              fetchCategories()
            }}
            className="ml-2 bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 등록/수정 폼 */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            {editingCategory ? '카테고리 수정' : '카테고리 등록'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  카테고리 코드 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="MACHINE, PARTS 등"
                  disabled={!!editingCategory}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  영문명 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="Machine, Parts 등"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  한글명 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nameKo}
                  onChange={(e) => setFormData({ ...formData, nameKo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="기계, 부품 등"
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
                  setEditingCategory(null)
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

      {/* 카테고리 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">코드</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">영문명</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">한글명</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(category.id)}
                      onChange={() => handleSelect(category.id)}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{category.code}</td>
                  <td className="px-4 py-3 text-gray-900">{category.name}</td>
                  <td className="px-4 py-3 text-gray-900">{category.nameKo}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEdit(category)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    등록된 카테고리가 없습니다.
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
