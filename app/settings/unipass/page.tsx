'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UnipassSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [settings, setSettings] = useState({
    apiKey: '',
    businessNumber: '',
    autoSyncEnabled: false,
    syncInterval: 'daily',
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/settings?key=unipass_settings')
      const data = await res.json()
      
      if (data?.value) {
        setSettings({
          apiKey: data.value.apiKey || '',
          businessNumber: data.value.businessNumber || '',
          autoSyncEnabled: data.value.autoSyncEnabled || false,
          syncInterval: data.value.syncInterval || 'daily',
        })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)
      
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'unipass_settings',
          value: settings,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save settings')
      }

      setMessage({ type: 'success', text: '설정이 저장되었습니다.' })
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage({ type: 'error', text: '설정 저장에 실패했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    if (!settings.apiKey) {
      setMessage({ type: 'error', text: 'API 인증키를 입력해주세요.' })
      return
    }

    try {
      setTesting(true)
      setMessage(null)
      
      const res = await fetch('/api/unipass/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settings.apiKey,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'API 연결이 성공했습니다.' })
      } else {
        setMessage({ type: 'error', text: data.message || 'API 연결에 실패했습니다.' })
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      setMessage({ type: 'error', text: '연결 테스트 중 오류가 발생했습니다.' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">유니패스(UNI-PASS) 설정</h1>
          <p className="text-gray-600 mt-2">
            한국관세청 유니패스 오픈 API를 사용하여 수입통관 정보를 자동으로 조회합니다.
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API 인증키 (crkyCn) *
            </label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="유니패스 API 인증키를 입력하세요"
            />
            <p className="text-sm text-gray-500 mt-1">
              유니패스 오픈API 신청 후 발급받은 인증키를 입력하세요.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사업자등록번호
            </label>
            <input
              type="text"
              value={settings.businessNumber}
              onChange={(e) => setSettings({ ...settings, businessNumber: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="000-00-00000"
            />
            <p className="text-sm text-gray-500 mt-1">
              알레스인터네셔날의 사업자등록번호
            </p>
          </div>

          <div className="border-t pt-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.autoSyncEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, autoSyncEnabled: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                자동 동기화 활성화
              </span>
            </label>
            <p className="text-sm text-gray-500 mt-1 ml-6">
              설정한 주기에 따라 통관 정보를 자동으로 조회합니다.
            </p>
          </div>

          {settings.autoSyncEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                동기화 주기
              </label>
              <select
                value={settings.syncInterval}
                onChange={(e) => setSettings({ ...settings, syncInterval: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="hourly">매시간</option>
                <option value="daily">매일</option>
                <option value="weekly">매주</option>
              </select>
            </div>
          )}

          <div className="border-t pt-6 flex gap-4">
            <button
              onClick={handleTestConnection}
              disabled={testing || !settings.apiKey}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? '테스트 중...' : '연결 테스트'}
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? '저장 중...' : '설정 저장'}
            </button>

            <button
              onClick={() => router.push('/customs')}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              통관 현황 보기
            </button>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">💡 사용 방법</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>유니패스 오픈API 신청 (https://unipass.customs.go.kr/csp/index.do)</li>
            <li>발급받은 API 인증키를 위 입력란에 입력</li>
            <li>"연결 테스트" 버튼으로 API 연결 확인</li>
            <li>"설정 저장" 버튼으로 설정 저장</li>
            <li>"통관 현황 보기"에서 BL번호로 통관 정보 조회</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
