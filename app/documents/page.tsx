'use client'

import Link from 'next/link'

export default function DocumentsPage() {
  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">문서 관리</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 견적서 카드 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">📝</span>
              견적서
            </h2>
          </div>
          <p className="text-gray-600 mb-6">
            고객에게 제공할 견적서를 작성하고 관리합니다.
          </p>
          <div className="flex gap-3">
            <Link
              href="/documents/quotation/new"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              견적서 작성
            </Link>
            <Link
              href="/documents/quotation"
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-center"
            >
              견적서 목록
            </Link>
          </div>
        </div>

        {/* 거래명세서 카드 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-3xl">📋</span>
              거래명세서
            </h2>
          </div>
          <p className="text-gray-600 mb-6">
            납품명세서(거래명세서)를 작성하고 관리합니다.
          </p>
          <div className="flex gap-3">
            <Link
              href="/documents/transaction-statement/new"
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-center"
            >
              거래명세서 작성
            </Link>
            <Link
              href="/documents/transaction-statement"
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-center"
            >
              거래명세서 목록
            </Link>
          </div>
        </div>
      </div>

      {/* 안내 */}
      <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              문서 다운로드 기능
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>각 문서는 PDF 및 Excel 형식으로 다운로드할 수 있습니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
