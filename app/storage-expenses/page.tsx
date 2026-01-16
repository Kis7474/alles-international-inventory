'use client'

import { useEffect, useState } from 'react'
import { formatNumber, formatMonth } from '@/lib/utils'

interface StorageExpense {
  id: number
  period: string
  dateFrom: string
  dateTo: string
  amount: number
  memo: string | null
}

export default function StorageExpensesPage() {
  const [expenses, setExpenses] = useState<StorageExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<StorageExpense | null>(
    null
  )
  const [formData, setFormData] = useState({
    period: formatMonth(new Date()),
    dateFrom: '',
    dateTo: '',
    amount: '',
    memo: '',
  })

  useEffect(() => {
    fetchExpenses()
  }, [])

  // 기간 변경 시 dateFrom, dateTo 자동 설정
  useEffect(() => {
    if (formData.period && formData.period.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = formData.period.split('-')
      const firstDay = `${year}-${month}-01`
      const lastDay = new Date(parseInt(year), parseInt(month), 0)
        .toISOString()
        .split('T')[0]
      setFormData((prev) => ({
        ...prev,
        dateFrom: firstDay,
        dateTo: lastDay,
      }))
    }
  }, [formData.period])

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/storage-expenses')
      const data = await res.json()
      setExpenses(data)
    } catch (error) {
      console.error('Error fetching expenses:', error)
      alert('창고료 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      period: formData.period,
      dateFrom: formData.dateFrom,
      dateTo: formData.dateTo,
      amount: parseFloat(formData.amount),
      memo: formData.memo || null,
    }

    try {
      const url = '/api/storage-expenses'
      const method = editingExpense ? 'PUT' : 'POST'
      const body = editingExpense ? { id: editingExpense.id, ...data } : data

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await res.json()

      if (!res.ok) {
        alert(result.error || '저장 중 오류가 발생했습니다.')
        return
      }

      alert(
        editingExpense
          ? '창고료가 수정되었습니다.'
          : '창고료가 등록되었습니다.'
      )
      setShowForm(false)
      setEditingExpense(null)
      setFormData({
        period: formatMonth(new Date()),
        dateFrom: '',
        dateTo: '',
        amount: '',
        memo: '',
      })
      fetchExpenses()
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (expense: StorageExpense) => {
    setEditingExpense(expense)
    setFormData({
      period: expense.period,
      dateFrom: new Date(expense.dateFrom).toISOString().split('T')[0],
      dateTo: new Date(expense.dateTo).toISOString().split('T')[0],
      amount: expense.amount.toString(),
      memo: expense.memo || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/storage-expenses?id=${id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || '삭제 중 오류가 발생했습니다.')
        return
      }

      alert('창고료가 삭제되었습니다.')
      fetchExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingExpense(null)
    setFormData({
      period: formatMonth(new Date()),
      dateFrom: '',
      dateTo: '',
      amount: '',
      memo: '',
    })
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  if (loading) {
    return <div>로딩 중...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">창고료 관리</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 창고료 등록
        </button>
      </div>

      {/* 창고료 등록/수정 폼 */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingExpense ? '창고료 수정' : '창고료 등록'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  기간 (YYYY-MM) *
                </label>
                <input
                  type="text"
                  required
                  pattern="\d{4}-\d{2}"
                  value={formData.period}
                  onChange={(e) =>
                    setFormData({ ...formData, period: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="2026-02"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  금액 (₩) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  시작일 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.dateFrom}
                  onChange={(e) =>
                    setFormData({ ...formData, dateFrom: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  종료일 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.dateTo}
                  onChange={(e) =>
                    setFormData({ ...formData, dateTo: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">메모</label>
                <textarea
                  value={formData.memo}
                  onChange={(e) =>
                    setFormData({ ...formData, memo: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-yellow-800">
                💡 창고료는 기간비용으로 처리되며, 재고 원가에는 포함되지
                않습니다.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                저장
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 총 창고료 요약 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="text-sm text-gray-600 mb-2">총 창고료 (전체 기간)</div>
        <div className="text-3xl font-bold text-blue-600">
          ₩{formatNumber(totalExpenses, 0)}
        </div>
      </div>

      {/* 창고료 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                기간
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                시작일
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                종료일
              </th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                금액
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                메모
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{expense.period}</td>
                <td className="px-6 py-4">
                  {new Date(expense.dateFrom).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-6 py-4">
                  {new Date(expense.dateTo).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-6 py-4 text-right font-medium">
                  ₩{formatNumber(expense.amount, 0)}
                </td>
                <td className="px-6 py-4">{expense.memo || '-'}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleEdit(expense)}
                    className="text-blue-600 hover:text-blue-800 mr-4"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  등록된 창고료가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
