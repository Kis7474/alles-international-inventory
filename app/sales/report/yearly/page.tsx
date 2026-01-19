'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface YearlyReport {
  year: string
  summary: {
    totalSales: number
    totalMargin: number
    totalMarginRate: number
    totalCount: number
  }
  monthlyTrends: Array<{
    month: number
    monthName: string
    totalSales: number
    totalMargin: number
    count: number
  }>
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
    }
    totalSales: number
    totalMargin: number
    count: number
  }>
}

export default function YearlyReportPage() {
  const [report, setReport] = useState<YearlyReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear().toString())

  useEffect(() => {
    fetchReport()
  }, [])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sales/report/yearly?year=${year}`)
      const data = await res.json()
      setReport(data)
    } catch (error) {
      console.error('Error fetching yearly report:', error)
      alert('연도별 리포트 조회 중 오류가 발생했습니다.')
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
      <h1 className="text-3xl font-bold mb-8 text-gray-900">연도별 리포트</h1>

      {/* 연도 선택 */}
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
              <div className="text-gray-600 text-sm mb-2">연간 총 매출</div>
              <div className="text-3xl font-bold text-blue-600">
                ₩{formatNumber(report.summary.totalSales, 0)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-2">연간 총 마진</div>
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
              <div className="text-gray-600 text-sm mb-2">총 거래 건수</div>
              <div className="text-3xl font-bold text-orange-600">
                {report.summary.totalCount}건
              </div>
            </div>
          </div>

          {/* 월별 추이 차트 */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900">월별 매출/마진 추이</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={report.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" label={{ value: '월', position: 'insideBottom', offset: -5 }} />
                <YAxis />
                <Tooltip
                  formatter={(value?: number) => `₩${formatNumber(value ?? 0, 0)}`}
                  labelFormatter={(label) => `${label}월`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalSales"
                  stroke="#3b82f6"
                  name="매출"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="totalMargin"
                  stroke="#10b981"
                  name="마진"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* 담당자별 연간 실적 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4 text-gray-900">담당자별 연간 실적</h2>
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 text-gray-700">담당자</th>
                      <th className="text-right py-2 text-gray-700">매출</th>
                      <th className="text-right py-2 text-gray-700">마진</th>
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
                        <td className="py-2 text-right text-blue-600 font-semibold">
                          {stat.commission > 0 ? `₩${formatNumber(stat.commission, 0)}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 담당자별 매출 바 차트 */}
              {report.salespersonStats.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={report.salespersonStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="salesperson.name" />
                    <YAxis />
                    <Tooltip formatter={(value?: number) => `₩${formatNumber(value ?? 0, 0)}`} />
                    <Legend />
                    <Bar dataKey="totalSales" fill="#3b82f6" name="매출" />
                    <Bar dataKey="totalMargin" fill="#10b981" name="마진" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 카테고리별 연간 실적 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4 text-gray-900">카테고리별 연간 실적</h2>
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 text-gray-700">카테고리</th>
                      <th className="text-right py-2 text-gray-700">매출</th>
                      <th className="text-right py-2 text-gray-700">마진</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.categoryStats
                      .sort((a, b) => b.totalSales - a.totalSales)
                      .slice(0, 10)
                      .map((stat, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 text-gray-900">{stat.category.nameKo}</td>
                          <td className="py-2 text-right text-gray-900">
                            ₩{formatNumber(stat.totalSales, 0)}
                          </td>
                          <td className="py-2 text-right text-gray-900">
                            ₩{formatNumber(stat.totalMargin, 0)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* 카테고리별 매출 바 차트 (상위 10개) */}
              {report.categoryStats.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={report.categoryStats
                      .sort((a, b) => b.totalSales - a.totalSales)
                      .slice(0, 10)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="category.nameKo" type="category" width={100} />
                    <Tooltip formatter={(value?: number) => `₩${formatNumber(value ?? 0, 0)}`} />
                    <Legend />
                    <Bar dataKey="totalSales" fill="#3b82f6" name="매출" />
                  </BarChart>
                </ResponsiveContainer>
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
