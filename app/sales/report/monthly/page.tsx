'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface MonthlyReport {
  period: { year: string; month: string }
  summary: {
    totalSales: number
    totalMargin: number
    totalMarginRate: number
    totalCount: number
  }
  salespersonStats: Array<{
    salesperson: {
      code: string
      name: string
      commissionRate: number
    }
    totalSales: number
    totalMargin: number
    avgMarginRate: number
    commission: number
    count: number
  }>
  categoryStats: Array<{
    category: {
      nameKo: string
    } | null
    totalSales: number
    totalMargin: number
    count: number
  }>
}

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

export default function MonthlyReportPage() {
  const [report, setReport] = useState<MonthlyReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString())

  useEffect(() => {
    fetchReport()
  }, [])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sales/report/monthly?year=${year}&month=${month}`)
      const data = await res.json()
      setReport(data)
    } catch (error) {
      console.error('Error fetching monthly report:', error)
      alert('월별 리포트 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchReport()
  }

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-700">로딩 중...</div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-gray-900">월별 리포트</h1>

      {/* 기간 선택 */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">연도</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-32 px-3 py-2 border rounded-lg text-gray-900"
              placeholder="2024"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">월</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-32 px-3 py-2 border rounded-lg text-gray-900"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            조회
          </button>
        </div>
      </div>

      {report && (
        <>
          {/* 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-2">총 매출</div>
              <div className="text-3xl font-bold text-blue-600">
                ₩{formatNumber(report.summary.totalSales, 0)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-2">총 마진</div>
              <div className="text-3xl font-bold text-green-600">
                ₩{formatNumber(report.summary.totalMargin, 0)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-2">평균 마진율</div>
              <div className="text-3xl font-bold text-purple-600">
                {report.summary.totalMarginRate.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-2">거래 건수</div>
              <div className="text-3xl font-bold text-orange-600">
                {report.summary.totalCount}건
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* 담당자별 실적 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4 text-gray-900">담당자별 실적</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 text-gray-700">담당자</th>
                      <th className="text-right py-2 text-gray-700">매출</th>
                      <th className="text-right py-2 text-gray-700">마진</th>
                      <th className="text-right py-2 text-gray-700">마진율</th>
                      <th className="text-right py-2 text-gray-700">커미션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.salespersonStats.map((stat, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2 text-gray-900">{stat.salesperson.name}</td>
                        <td className="py-2 text-right text-gray-900">
                          ₩{formatNumber(stat.totalSales, 0)}
                        </td>
                        <td className="py-2 text-right text-gray-900">
                          ₩{formatNumber(stat.totalMargin, 0)}
                        </td>
                        <td className="py-2 text-right text-gray-900">
                          {stat.avgMarginRate.toFixed(1)}%
                        </td>
                        <td className="py-2 text-right text-blue-600 font-semibold">
                          {stat.commission > 0 ? `₩${formatNumber(stat.commission, 0)}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 담당자별 매출 파이 차트 */}
              {report.salespersonStats.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">담당자별 매출 분포</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={report.salespersonStats.map((stat) => ({
                          name: stat.salesperson.name,
                          value: stat.totalSales,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {report.salespersonStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value?: number) => `₩${formatNumber(value || 0, 0)}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 카테고리별 실적 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4 text-gray-900">카테고리별 실적</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 text-gray-700">카테고리</th>
                      <th className="text-right py-2 text-gray-700">매출</th>
                      <th className="text-right py-2 text-gray-700">마진</th>
                      <th className="text-right py-2 text-gray-700">건수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.categoryStats
                      .sort((a, b) => b.totalSales - a.totalSales)
                      .map((stat, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 text-gray-900">{stat.category?.nameKo || '미분류'}</td>
                          <td className="py-2 text-right text-gray-900">
                            ₩{formatNumber(stat.totalSales, 0)}
                          </td>
                          <td className="py-2 text-right text-gray-900">
                            ₩{formatNumber(stat.totalMargin, 0)}
                          </td>
                          <td className="py-2 text-right text-gray-900">{stat.count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* 카테고리별 매출 파이 차트 */}
              {report.categoryStats.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">카테고리별 매출 분포</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={report.categoryStats
                          .sort((a, b) => b.totalSales - a.totalSales)
                          .slice(0, 6)
                          .map((stat) => ({
                            name: stat.category?.nameKo || '미분류',
                            value: stat.totalSales,
                          }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {report.categoryStats.slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value?: number) => `₩${formatNumber(value || 0, 0)}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!report && !loading && (
        <div className="bg-white p-12 rounded-lg shadow text-center text-gray-500">
          조회 버튼을 클릭하여 리포트를 확인하세요.
        </div>
      )}
    </div>
  )
}
