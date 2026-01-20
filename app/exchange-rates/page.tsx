'use client'

import { useEffect, useState } from 'react'

interface ExchangeRate {
  id: number
  date: string
  currency: string
  rate: number
  source: string | null
}

export default function ExchangeRatesPage() {
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null)
  const [updating, setUpdating] = useState(false)
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    currency: 'USD',
    rate: '',
    source: '하나은행',
  })

  const [settings, setSettings] = useState({
    source: 'manual', // manual, koreaexim, openexchange, smbs
    koreaexim_api_key: '',
    openexchange_api_key: '',
    smbs_api_key: '',
    auto_update_time: '09:00',
    target_currencies: ['USD', 'EUR', 'JPY', 'CNY', 'GBP'],
  })

  useEffect(() => {
    fetchRates()
    fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchRates = async () => {
    try {
      const res = await fetch('/api/exchange-rates')
      const data = await res.json()
      setRates(data)
    } catch (error) {
      console.error('Error fetching rates:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings?key=exchange_rate_settings')
      const data = await res.json()
      if (data && data.value) {
        setSettings({ ...settings, ...data.value })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const saveSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'exchange_rate_settings',
          value: settings,
        }),
      })

      if (res.ok) {
        alert('설정이 저장되었습니다.')
        setShowSettingsModal(false)
      } else {
        alert('설정 저장에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('설정 저장 중 오류가 발생했습니다.')
    }
  }

  const handleAutoUpdate = async () => {
    setUpdating(true)
    try {
      const res = await fetch('/api/exchange-rates/auto-update', { method: 'POST' })
      const data = await res.json()
      
      if (data.success) {
        alert(data.message)
        await fetchRates()
      } else {
        alert(data.error || '환율 업데이트에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error auto-updating rates:', error)
      alert('환율 업데이트 중 오류가 발생했습니다.')
    } finally {
      setUpdating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = '/api/exchange-rates'
      const method = editingRate ? 'PUT' : 'POST'
      const body = editingRate
        ? { ...formData, id: editingRate.id }
        : formData

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        await fetchRates()
        handleCloseModal()
      } else {
        const error = await res.json()
        alert(error.error || '오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error saving rate:', error)
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/exchange-rates?id=${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await fetchRates()
      } else {
        const error = await res.json()
        alert(error.error || '삭제 중 오류가 발생했습니다.')
      }
    } catch (error) {
      console.error('Error deleting rate:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  const handleEdit = (rate: ExchangeRate) => {
    setEditingRate(rate)
    setFormData({
      date: new Date(rate.date).toISOString().split('T')[0],
      currency: rate.currency,
      rate: rate.rate.toString(),
      source: rate.source || '',
    })
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingRate(null)
    setFormData({
      date: new Date().toISOString().split('T')[0],
      currency: 'USD',
      rate: '',
      source: '하나은행',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-700">로딩 중...</div>
      </div>
    )
  }

  // 통화별로 그룹화
  const ratesByCurrency = rates.reduce((acc, rate) => {
    if (!acc[rate.currency]) {
      acc[rate.currency] = []
    }
    acc[rate.currency].push(rate)
    return acc
  }, {} as Record<string, ExchangeRate[]>)

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">환율 관리</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            ⚙️ 설정
          </button>
          <button
            onClick={handleAutoUpdate}
            disabled={updating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {updating ? '업데이트 중...' : '🔄 환율 자동 업데이트'}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 수동 등록
          </button>
        </div>
      </div>

      {/* 마지막 업데이트 정보 */}
      {rates.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-blue-800">
            💡 마지막 업데이트: {new Date(rates[0].date).toLocaleString('ko-KR')}
            {rates[0].source && ` • 출처: ${rates[0].source}`}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(ratesByCurrency).map(([currency, currencyRates]) => {
          const latest = currencyRates[0]
          return (
            <div key={currency} className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{currency}</h2>
              <div className="mb-4">
                <div className="text-sm text-gray-600">최근 환율</div>
                <div className="text-3xl font-bold text-blue-600">
                  ₩{latest.rate.toLocaleString('ko-KR')}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {new Date(latest.date).toLocaleDateString('ko-KR')}
                  {latest.source && ` • ${latest.source}`}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="text-sm font-medium text-gray-700 mb-2">이력</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {currencyRates.slice(0, 5).map((rate) => (
                    <div key={rate.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        {new Date(rate.date).toLocaleDateString('ko-KR')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          ₩{rate.rate.toLocaleString('ko-KR')}
                        </span>
                        <button
                          onClick={() => handleEdit(rate)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(rate.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {editingRate ? '환율 수정' : '환율 등록'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  날짜 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={!!editingRate}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  통화 *
                </label>
                <select
                  required
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={!!editingRate}
                >
                  <option value="USD">USD (미국 달러)</option>
                  <option value="EUR">EUR (유로)</option>
                  <option value="JPY">JPY (일본 엔)</option>
                  <option value="CNY">CNY (중국 위안)</option>
                  <option value="GBP">GBP (영국 파운드)</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  환율 (원화 기준) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="1300.50"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  출처
                </label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="하나은행, 직접입력 등"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingRate ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 설정 모달 */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">환율 자동 업데이트 설정</h2>
            
            <div className="space-y-6">
              {/* 환율 소스 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  환율 소스
                </label>
                <select
                  value={settings.source}
                  onChange={(e) => setSettings({ ...settings, source: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="manual">수동</option>
                  <option value="koreaexim">한국수출입은행 API</option>
                  <option value="openexchange">Open Exchange Rates</option>
                  <option value="smbs">SMBS</option>
                </select>
              </div>

              {/* API 키 입력 */}
              {settings.source === 'koreaexim' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    한국수출입은행 API 키
                  </label>
                  <input
                    type="text"
                    value={settings.koreaexim_api_key}
                    onChange={(e) => setSettings({ ...settings, koreaexim_api_key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="API 키를 입력하세요"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    발급: https://www.koreaexim.go.kr/ir/HPHKIR020M01
                  </p>
                </div>
              )}

              {settings.source === 'openexchange' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Open Exchange Rates API 키
                  </label>
                  <input
                    type="text"
                    value={settings.openexchange_api_key}
                    onChange={(e) => setSettings({ ...settings, openexchange_api_key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="API 키를 입력하세요"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    발급: https://openexchangerates.org/
                  </p>
                </div>
              )}

              {settings.source === 'smbs' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMBS API 키
                  </label>
                  <input
                    type="text"
                    value={settings.smbs_api_key}
                    onChange={(e) => setSettings({ ...settings, smbs_api_key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="API 키를 입력하세요"
                  />
                </div>
              )}

              {/* 자동 업데이트 시간 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  자동 업데이트 시간
                </label>
                <input
                  type="time"
                  value={settings.auto_update_time}
                  onChange={(e) => setSettings({ ...settings, auto_update_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  매일 이 시간에 자동으로 환율을 업데이트합니다.
                </p>
              </div>

              {/* 대상 통화 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  대상 통화 선택
                </label>
                <div className="space-y-2">
                  {['USD', 'EUR', 'JPY', 'CNY', 'GBP'].map((currency) => (
                    <label key={currency} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.target_currencies.includes(currency)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSettings({
                              ...settings,
                              target_currencies: [...settings.target_currencies, currency]
                            })
                          } else {
                            setSettings({
                              ...settings,
                              target_currencies: settings.target_currencies.filter(c => c !== currency)
                            })
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-gray-700">{currency}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={saveSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
