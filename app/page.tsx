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
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm md:text-base text-gray-500">{new Date().toLocaleDateString('ko-KR', { 
          year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' 
        })}</p>
      </div>

      {/* 당월 요약 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white p-4 md:p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-gray-600 text-xs md:text-sm mb-1 md:mb-2">당월 총매출</div>
              <div className="text-2xl md:text-3xl font-bold text-blue-600">
                ₩{formatNumber(data.currentMonth.totalSales, 0)}
              </div>
              <div className={`text-xs md:text-sm mt-1 md:mt-2 ${data.growth.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.growth.salesGrowth >= 0 ? '▲' : '▼'} {Math.abs(data.growth.salesGrowth).toFixed(1)}% (전월 대비)
              </div>
            </div>
            <span className="text-2xl md:text-3xl">💰</span>
          </div>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-gray-600 text-xs md:text-sm mb-1 md:mb-2">당월 총마진</div>
              <div className="text-2xl md:text-3xl font-bold text-green-600">
                ₩{formatNumber(data.currentMonth.totalMargin, 0)}
              </div>
              <div className={`text-xs md:text-sm mt-1 md:mt-2 ${data.growth.marginGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.growth.marginGrowth >= 0 ? '▲' : '▼'} {Math.abs(data.growth.marginGrowth).toFixed(1)}% (전월 대비)
              </div>
            </div>
            <span className="text-2xl md:text-3xl">📈</span>
          </div>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-gray-600 text-xs md:text-sm mb-1 md:mb-2">당월 마진율</div>
              <div className="text-2xl md:text-3xl font-bold text-purple-600">
                {data.currentMonth.totalMarginRate.toFixed(1)}%
              </div>
              <div className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">
                평균 마진율
              </div>
            </div>
            <span className="text-2xl md:text-3xl">📊</span>
          </div>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-gray-600 text-xs md:text-sm mb-1 md:mb-2">당월 거래 건수</div>
              <div className="text-2xl md:text-3xl font-bold text-orange-600">
                {data.currentMonth.count}건
              </div>
              <div className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">
                매입매출 합계
              </div>
            </div>
            <span className="text-2xl md:text-3xl">📦</span>
          </div>
        </div>
      </div>

      {/* 빠른 액세스 */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6 md:mb-8">
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-900">빠른 액세스</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <a 
            href="/sales"
            className="flex flex-col items-center p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group min-h-[88px] justify-center"
          >
            <span className="text-2xl md:text-3xl mb-2 group-hover:scale-110 transition-transform">➕</span>
            <span className="text-xs md:text-sm text-center text-gray-700 group-hover:text-blue-700">매출/매입 등록</span>
          </a>
          <a 
            href="/import-export/new"
            className="flex flex-col items-center p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group min-h-[88px] justify-center"
          >
            <span className="text-2xl md:text-3xl mb-2 group-hover:scale-110 transition-transform">🌍</span>
            <span className="text-xs md:text-sm text-center text-gray-700 group-hover:text-blue-700">수입/수출 등록</span>
          </a>
          <a 
            href="/warehouse/lots"
            className="flex flex-col items-center p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group min-h-[88px] justify-center"
          >
            <span className="text-2xl md:text-3xl mb-2 group-hover:scale-110 transition-transform">📥</span>
            <span className="text-xs md:text-sm text-center text-gray-700 group-hover:text-blue-700">입고 등록</span>
          </a>
          <a 
            href="/warehouse/inventory"
            className="flex flex-col items-center p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors group min-h-[88px] justify-center"
          >
            <span className="text-2xl md:text-3xl mb-2 group-hover:scale-110 transition-transform">📊</span>
            <span className="text-xs md:text-sm text-center text-gray-700 group-hover:text-blue-700">재고 조회</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        {/* 담당자별 실적 */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-900">담당자별 당월 실적</h2>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {data.salespersonStats.map((stat, idx) => {
              const marginRate = stat.totalSales > 0 ? (stat.totalMargin / stat.totalSales) * 100 : 0
              return (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                  <div className="font-bold text-gray-900 mb-2">
                    {stat.salesperson.name}
                    {stat.salesperson.commissionRate > 0 && (
                      <span className="ml-2 text-xs text-blue-600">(커미션 {(stat.salesperson.commissionRate * 100)}%)</span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">매출:</span>
                      <span className="text-gray-900">₩{formatNumber(stat.totalSales, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">마진:</span>
                      <span className="text-gray-900">₩{formatNumber(stat.totalMargin, 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">마진율:</span>
                      <span className="font-bold text-gray-900">{marginRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
            {data.salespersonStats.length === 0 && (
              <div className="py-4 text-center text-gray-500">
                당월 실적이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 카테고리별 실적 */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-900">카테고리별 당월 실적</h2>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {data.categoryStats.slice(0, 10).map((stat, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                <div className="font-bold text-gray-900 mb-2">{stat.category.nameKo}</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">매출:</span>
                    <span className="text-gray-900">₩{formatNumber(stat.totalSales, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">마진:</span>
                    <span className="text-gray-900">₩{formatNumber(stat.totalMargin, 0)}</span>
                  </div>
                </div>
              </div>
            ))}
            {data.categoryStats.length === 0 && (
              <div className="py-4 text-center text-gray-500">
                당월 실적이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 최근 거래 내역 */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow">
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-900">최근 거래 내역</h2>
        
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
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

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {data.recentTransactions.map((tx) => (
            <div key={tx.id} className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  tx.type === 'SALES' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {tx.type === 'SALES' ? '매출' : '매입'}
                </span>
                <span className="text-xs text-gray-600">
                  {new Date(tx.date).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <div className="font-bold text-gray-900 mb-2">{tx.itemName}</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">담당자:</span>
                  <span className="text-gray-900">{tx.salesperson.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">거래처:</span>
                  <span className="text-gray-900">{tx.customer || '-'}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t">
                  <span className="text-gray-600">금액:</span>
                  <span className="font-bold text-gray-900">₩{formatNumber(tx.amount, 0)}</span>
                </div>
                {tx.type === 'SALES' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">마진:</span>
                    <span className="text-gray-900">₩{formatNumber(tx.margin, 0)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {data.recentTransactions.length === 0 && (
            <div className="py-4 text-center text-gray-500">
              거래 내역이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
