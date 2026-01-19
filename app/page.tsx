'use client'

import { useEffect, useState } from 'react'
import { formatNumber } from '@/lib/utils'

interface OverviewData {
  currentMonth: {
    totalSales: number
    totalMargin: number
    totalMarginRate: number
    count: number
  }
  lastMonth: {
    totalSales: number
    totalMargin: number
  }
  growth: {
    salesGrowth: number
    marginGrowth: number
  }
  salespersonStats: Array<{
    salesperson: {
      code: string
      name: string
      commissionRate: number
    }
    totalSales: number
    totalMargin: number
  }>
  categoryStats: Array<{
    category: {
      nameKo: string
    }
    totalSales: number
    totalMargin: number
  }>
  recentTransactions: Array<{
    id: number
    date: string
    type: string
    itemName: string
    customer: string | null
    amount: number
    margin: number
    salesperson: {
      name: string
    }
    category: {
      nameKo: string
    }
  }>
}

export default function Home() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOverview()
  }, [])

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/sales/report/overview')
      const overview = await res.json()
      setData(overview)
    } catch (error) {
      console.error('Error fetching overview:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-700">로딩 중...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-700">데이터를 불러올 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-gray-900">매입매출장부 대시보드</h1>

      {/* 당월 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm mb-2">당월 총매출</div>
          <div className="text-3xl font-bold text-blue-600">
            ₩{formatNumber(data.currentMonth.totalSales, 0)}
          </div>
          <div className={`text-sm mt-2 ${data.growth.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.growth.salesGrowth >= 0 ? '▲' : '▼'} {Math.abs(data.growth.salesGrowth).toFixed(1)}% (전월 대비)
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm mb-2">당월 총마진</div>
          <div className="text-3xl font-bold text-green-600">
            ₩{formatNumber(data.currentMonth.totalMargin, 0)}
          </div>
          <div className={`text-sm mt-2 ${data.growth.marginGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.growth.marginGrowth >= 0 ? '▲' : '▼'} {Math.abs(data.growth.marginGrowth).toFixed(1)}% (전월 대비)
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm mb-2">당월 마진율</div>
          <div className="text-3xl font-bold text-purple-600">
            {data.currentMonth.totalMarginRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 mt-2">
            평균 마진율
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-gray-600 text-sm mb-2">당월 거래 건수</div>
          <div className="text-3xl font-bold text-orange-600">
            {data.currentMonth.count}건
          </div>
          <div className="text-sm text-gray-500 mt-2">
            매입매출 합계
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* 담당자별 실적 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4 text-gray-900">담당자별 당월 실적</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 text-gray-700">담당자</th>
                  <th className="text-right py-2 text-gray-700">매출</th>
                  <th className="text-right py-2 text-gray-700">마진</th>
                  <th className="text-right py-2 text-gray-700">마진율</th>
                </tr>
              </thead>
              <tbody>
                {data.salespersonStats.map((stat, idx) => {
                  const marginRate = stat.totalSales > 0 ? (stat.totalMargin / stat.totalSales) * 100 : 0
                  return (
                    <tr key={idx} className="border-b">
                      <td className="py-2 text-gray-900">
                        {stat.salesperson.name}
                        {stat.salesperson.commissionRate > 0 && (
                          <span className="ml-2 text-xs text-blue-600">(커미션 {(stat.salesperson.commissionRate * 100)}%)</span>
                        )}
                      </td>
                      <td className="py-2 text-right text-gray-900">
                        ₩{formatNumber(stat.totalSales, 0)}
                      </td>
                      <td className="py-2 text-right text-gray-900">
                        ₩{formatNumber(stat.totalMargin, 0)}
                      </td>
                      <td className="py-2 text-right text-gray-900">
                        {marginRate.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
                {data.salespersonStats.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">
                      당월 실적이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 카테고리별 실적 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4 text-gray-900">카테고리별 당월 실적</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2 text-gray-700">카테고리</th>
                  <th className="text-right py-2 text-gray-700">매출</th>
                  <th className="text-right py-2 text-gray-700">마진</th>
                </tr>
              </thead>
              <tbody>
                {data.categoryStats.slice(0, 10).map((stat, idx) => (
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
                {data.categoryStats.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-500">
                      당월 실적이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 최근 거래 내역 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 text-gray-900">최근 거래 내역</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b">
              <tr>
                <th className="text-left py-2 text-gray-700">날짜</th>
                <th className="text-left py-2 text-gray-700">구분</th>
                <th className="text-left py-2 text-gray-700">담당자</th>
                <th className="text-left py-2 text-gray-700">품목</th>
                <th className="text-left py-2 text-gray-700">거래처</th>
                <th className="text-right py-2 text-gray-700">금액</th>
                <th className="text-right py-2 text-gray-700">마진</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTransactions.map((tx) => (
                <tr key={tx.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 text-gray-900">
                    {new Date(tx.date).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      tx.type === 'SALES' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {tx.type === 'SALES' ? '매출' : '매입'}
                    </span>
                  </td>
                  <td className="py-2 text-gray-900">{tx.salesperson.name}</td>
                  <td className="py-2 text-gray-900">{tx.itemName}</td>
                  <td className="py-2 text-gray-900">{tx.customer || '-'}</td>
                  <td className="py-2 text-right text-gray-900">
                    ₩{formatNumber(tx.amount, 0)}
                  </td>
                  <td className="py-2 text-right text-gray-900">
                    {tx.type === 'SALES' ? `₩${formatNumber(tx.margin, 0)}` : '-'}
                  </td>
                </tr>
              ))}
              {data.recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-gray-500">
                    거래 내역이 없습니다.
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
