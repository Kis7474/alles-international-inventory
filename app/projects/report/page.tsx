'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface ProjectSummary {
  status: string
  count: number
  totalCost: number
  totalSalesPrice: number
  totalMargin: number
  avgMarginRate: number
}

interface ProjectReport {
  summary: {
    totalProjects: number
    totalCost: number
    totalSalesPrice: number
    totalMargin: number
    avgMarginRate: number
  }
  byStatus: ProjectSummary[]
}

export default function ProjectReportPage() {
  const [report, setReport] = useState<ProjectReport | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchReport()
  }, [])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects/report')
      const data = await res.json()
      setReport(data)
    } catch (error) {
      console.error('Error fetching project report:', error)
      alert('프로젝트 리포트 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      PLANNING: '기획',
      IN_PROGRESS: '진행중',
      ON_HOLD: '보류',
      COMPLETED: '완료',
      CANCELLED: '취소',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      PLANNING: 'bg-gray-100 text-gray-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      ON_HOLD: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
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
      <h1 className="text-3xl font-bold mb-8 text-gray-900">프로젝트 리포트</h1>

      {report && (
        <>
          {/* 전체 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-2">총 프로젝트</div>
              <div className="text-3xl font-bold text-blue-600">
                {report.summary.totalProjects}개
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-2">총 원가</div>
              <div className="text-2xl font-bold text-orange-600">
                ₩{formatNumber(report.summary.totalCost, 0)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-2">총 매출</div>
              <div className="text-2xl font-bold text-green-600">
                ₩{formatNumber(report.summary.totalSalesPrice, 0)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-2">총 마진</div>
              <div className={`text-2xl font-bold ${report.summary.totalMargin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                ₩{formatNumber(report.summary.totalMargin, 0)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-600 text-sm mb-2">평균 마진율</div>
              <div className={`text-2xl font-bold ${report.summary.avgMarginRate >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                {report.summary.avgMarginRate.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* 상태별 통계 */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900">상태별 통계</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-700">상태</th>
                    <th className="text-right py-3 px-4 text-gray-700">프로젝트 수</th>
                    <th className="text-right py-3 px-4 text-gray-700">총 원가</th>
                    <th className="text-right py-3 px-4 text-gray-700">총 매출</th>
                    <th className="text-right py-3 px-4 text-gray-700">총 마진</th>
                    <th className="text-right py-3 px-4 text-gray-700">평균 마진율</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byStatus.map((stat) => (
                    <tr key={stat.status} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded text-sm ${getStatusColor(stat.status)}`}>
                          {getStatusLabel(stat.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {stat.count}개
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {formatCurrency(stat.totalCost)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-900">
                        {formatCurrency(stat.totalSalesPrice)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={stat.totalMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(stat.totalMargin)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={stat.avgMarginRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {stat.avgMarginRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td className="py-3 px-4 text-gray-900">합계</td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {report.summary.totalProjects}개
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {formatCurrency(report.summary.totalCost)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      {formatCurrency(report.summary.totalSalesPrice)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={report.summary.totalMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(report.summary.totalMargin)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={report.summary.avgMarginRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {report.summary.avgMarginRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 프로젝트 분포 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 상태별 프로젝트 수 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4 text-gray-900">상태별 프로젝트 수</h2>
              <div className="space-y-3">
                {report.byStatus.map((stat) => {
                  const percentage = report.summary.totalProjects > 0 
                    ? (stat.count / report.summary.totalProjects) * 100 
                    : 0
                  return (
                    <div key={stat.status}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-700">{getStatusLabel(stat.status)}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {stat.count}개 ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 상태별 매출 분포 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4 text-gray-900">상태별 매출 분포</h2>
              <div className="space-y-3">
                {report.byStatus.map((stat) => {
                  const percentage = report.summary.totalSalesPrice > 0 
                    ? (stat.totalSalesPrice / report.summary.totalSalesPrice) * 100 
                    : 0
                  return (
                    <div key={stat.status}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-700">{getStatusLabel(stat.status)}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(stat.totalSalesPrice)} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-green-600 h-2.5 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {!report && !loading && (
        <div className="bg-white p-12 rounded-lg shadow text-center text-gray-500">
          리포트 데이터를 불러오는 중입니다.
        </div>
      )}
    </div>
  )
}
