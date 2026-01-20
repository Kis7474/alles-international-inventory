'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface UploadSummary {
  vendorsCreated: number
  vendorsUpdated: number
  productsCreated: number
  productsUpdated: number
  pricesCreated: number
  pricesUpdated: number
  // For transaction upload
  totalRows?: number
  successRows?: number
  failedRows?: number
  salespersonsCreated?: number
  categoriesCreated?: number
  transactionsCreated?: number
}

interface UploadError {
  row: number
  column?: string
  message: string
}

export default function ExcelUploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [summary, setSummary] = useState<UploadSummary | null>(null)
  const [errors, setErrors] = useState<UploadError[]>([])
  const [uploadMode, setUploadMode] = useState<'price_matrix' | 'transactions'>('transactions')
  const [options, setOptions] = useState({
    duplicateHandling: 'skip' as 'overwrite' | 'skip' | 'merge',
    createVendors: true,
    createProducts: true,
    createSalespersons: true,
    createCategories: true,
    transactionType: 'SALES' as 'SALES' | 'PURCHASE',
  })
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      alert('파일을 선택해주세요.')
      return
    }

    setUploading(true)
    setUploadComplete(false)
    setSummary(null)
    setErrors([])

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('options', JSON.stringify({
        ...options,
        uploadMode,
      }))

      const res = await fetch('/api/upload/excel', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.success) {
        setSummary(data.summary)
        setErrors(data.errors || [])
        setUploadComplete(true)
        alert('업로드가 완료되었습니다.')
      } else {
        alert(data.error || '업로드 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = () => {
    // Create a simple CSV template with new format
    const headers = ['날짜', '구분', '판매처', '품목명', '수량', '단가', '금액(부가세포함)', '금액', '담당자', '카테고리', '마진', '마진율', '매입처']
    const exampleRow = ['2024-01-15', '매출', 'ABC상사', '품목A', '10', '1000', '11000', '10000', '홍길동', '전자제품', '2000', '20%', 'XYZ공급']
    
    const csvContent = [
      headers.join(','),
      exampleRow.join(','),
    ].join('\n')
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'transaction_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleReset = () => {
    setFile(null)
    setUploadComplete(false)
    setSummary(null)
    setErrors([])
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">엑셀 업로드</h1>
        <button
          onClick={() => router.push('/master/products')}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          품목 관리로
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* Upload Mode Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">업로드 형식 선택</h2>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="uploadMode"
                value="transactions"
                checked={uploadMode === 'transactions'}
                onChange={() => setUploadMode('transactions')}
                className="mr-2"
              />
              <span className="text-gray-700">거래 내역 업로드 (새 형식)</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="uploadMode"
                value="price_matrix"
                checked={uploadMode === 'price_matrix'}
                onChange={() => setUploadMode('price_matrix')}
                className="mr-2"
              />
              <span className="text-gray-700">가격 매트릭스 업로드 (기존 형식)</span>
            </label>
          </div>
        </div>

        {/* 파일 선택 영역 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">1. 파일 선택</h2>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="space-y-4">
                <div className="text-green-600 text-lg font-medium">
                  ✓ {file.name}
                </div>
                <div className="text-sm text-gray-600">
                  크기: {(file.size / 1024).toFixed(2)} KB
                </div>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  다른 파일 선택
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-4xl">📁</div>
                <div className="text-gray-700">
                  파일을 드래그 앤 드롭하거나 아래 버튼을 클릭하세요
                </div>
                <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                  파일 선택
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <div className="text-sm text-gray-500">
                  지원 형식: .xlsx, .xls, .csv
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 파일 형식 안내 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">파일 형식</h2>
            {uploadMode === 'transactions' && (
              <button
                onClick={downloadTemplate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                📥 템플릿 다운로드
              </button>
            )}
          </div>
          <div className="bg-gray-50 p-4 rounded-md">
            {uploadMode === 'transactions' ? (
              <div className="text-sm text-gray-700 space-y-2">
                <div className="font-medium">거래 내역 엑셀 파일 구조:</div>
                <pre className="bg-white p-3 rounded border border-gray-200 overflow-x-auto text-xs">
{`날짜         | 구분  | 판매처  | 품목명 | 수량 | 단가 | 금액(부가세포함) | 금액  | 담당자 | 카테고리 | 마진 | 마진율 | 매입처
2024-01-15  | 매출  | ABC상사 | 품목A  | 10   | 1000 | 11000           | 10000 | 홍길동 | 전자제품 | 2000 | 20%   | XYZ공급`}
                </pre>
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-yellow-800 text-xs font-medium mb-2">
                    💡 <strong>중요 변경사항:</strong>
                  </p>
                  <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                    <li><strong>매입처</strong> 열은 필수입니다. 품목 생성 시 매입처가 연결됩니다.</li>
                    <li><strong>판매처</strong>는 매출 거래처로, <strong>매입처</strong>는 매입 거래처로 자동 등록됩니다.</li>
                    <li>마진율은 백분율(20%) 또는 소수(0.2) 형식 모두 지원합니다.</li>
                  </ul>
                </div>
                <div className="text-xs text-gray-600 mt-3">
                  * 날짜 형식: 2024-01-15, 2024.01.15, 2024/01/15 모두 지원<br />
                  * 구분: 매출 또는 매입<br />
                  * 템플릿 다운로드 버튼을 클릭하여 예제 파일을 받을 수 있습니다
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-700 space-y-2">
                <div className="font-medium">가격 매트릭스 엑셀 파일 구조:</div>
                <pre className="bg-white p-3 rounded border border-gray-200 overflow-x-auto">
{`첫 번째 행: Customer | 품목1 | 품목1 | 품목2 | 품목2 | ...
두 번째 행:          | 매출  | 매입  | 매출  | 매입  | ...
세 번째 행~: 거래처1  | 1000  | 800   | 2000  | 1500  | ...`}
                </pre>
                <div className="text-xs text-gray-600">
                  * 첫 번째 열은 거래처명<br />
                  * 이후 열은 품목별 매출가/매입가 쌍으로 구성
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 업로드 옵션 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. 업로드 옵션</h2>
          
          <div className="space-y-4">
            {uploadMode === 'price_matrix' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    중복 처리 방식
                  </label>
                  <select
                    value={options.duplicateHandling}
                    onChange={(e) => setOptions({ ...options, duplicateHandling: e.target.value as 'overwrite' | 'skip' | 'merge' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    <option value="skip">중복 시 건너뛰기</option>
                    <option value="overwrite">기존 데이터 덮어쓰기</option>
                    <option value="merge">기존 데이터와 병합</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={options.createVendors}
                      onChange={(e) => setOptions({ ...options, createVendors: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-gray-700">없는 거래처 자동 생성</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={options.createProducts}
                      onChange={(e) => setOptions({ ...options, createProducts: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-gray-700">없는 품목 자동 생성</span>
                  </label>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    거래 유형
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="transactionType"
                        value="SALES"
                        checked={options.transactionType === 'SALES'}
                        onChange={() => setOptions({ ...options, transactionType: 'SALES' })}
                        className="mr-2"
                      />
                      <span className="text-gray-700">매출</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="transactionType"
                        value="PURCHASE"
                        checked={options.transactionType === 'PURCHASE'}
                        onChange={() => setOptions({ ...options, transactionType: 'PURCHASE' })}
                        className="mr-2"
                      />
                      <span className="text-gray-700">매입</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={options.createVendors}
                      onChange={(e) => setOptions({ ...options, createVendors: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-gray-700">없는 거래처 자동 생성</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={options.createProducts}
                      onChange={(e) => setOptions({ ...options, createProducts: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-gray-700">없는 품목 자동 생성</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={options.createSalespersons}
                      onChange={(e) => setOptions({ ...options, createSalespersons: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-gray-700">없는 담당자 자동 생성</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={options.createCategories}
                      onChange={(e) => setOptions({ ...options, createCategories: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-gray-700">없는 카테고리 자동 생성</span>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 업로드 실행 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. 업로드 실행</h2>
          
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? '업로드 중...' : '업로드 시작'}
          </button>
        </div>

        {/* 결과 표시 */}
        {uploadComplete && summary && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">업로드 결과</h2>
            
            {uploadMode === 'transactions' ? (
              <>
                {/* Transaction upload results */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 p-4 rounded-md">
                    <div className="text-sm text-gray-700 mb-1">총 행 수</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {summary.totalRows || 0}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-md">
                    <div className="text-sm text-gray-700 mb-1">성공</div>
                    <div className="text-2xl font-bold text-green-600">
                      {summary.successRows || 0}
                    </div>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-md">
                    <div className="text-sm text-gray-700 mb-1">실패</div>
                    <div className="text-2xl font-bold text-red-600">
                      {summary.failedRows || 0}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-md">
                    <div className="text-sm text-gray-700 mb-1">거래 생성</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {summary.transactionsCreated || 0}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-xs text-gray-700">거래처 생성</div>
                    <div className="text-lg font-semibold text-gray-800">
                      {summary.vendorsCreated || 0}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-xs text-gray-700">품목 생성</div>
                    <div className="text-lg font-semibold text-gray-800">
                      {summary.productsCreated || 0}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-xs text-gray-700">담당자 생성</div>
                    <div className="text-lg font-semibold text-gray-800">
                      {summary.salespersonsCreated || 0}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="text-xs text-gray-700">카테고리 생성</div>
                    <div className="text-lg font-semibold text-gray-800">
                      {summary.categoriesCreated || 0}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Price matrix upload results */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-green-50 p-4 rounded-md">
                    <div className="text-sm text-gray-700 mb-1">거래처</div>
                    <div className="text-2xl font-bold text-green-600">
                      {summary.vendorsCreated + summary.vendorsUpdated}
                    </div>
                    <div className="text-xs text-gray-600">
                      생성: {summary.vendorsCreated} / 갱신: {summary.vendorsUpdated}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-md">
                    <div className="text-sm text-gray-700 mb-1">품목</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {summary.productsCreated + summary.productsUpdated}
                    </div>
                    <div className="text-xs text-gray-600">
                      생성: {summary.productsCreated} / 갱신: {summary.productsUpdated}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-md">
                    <div className="text-sm text-gray-700 mb-1">가격 정보</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {summary.pricesCreated + summary.pricesUpdated}
                    </div>
                    <div className="text-xs text-gray-600">
                      생성: {summary.pricesCreated} / 갱신: {summary.pricesUpdated}
                    </div>
                  </div>
                </div>
              </>
            )}

            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm font-medium text-red-800 mb-2">
                  오류 발생 ({errors.length}건)
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-700">
                      행 {error.row}: {error.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
