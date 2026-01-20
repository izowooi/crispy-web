'use client'

import { useState, useEffect } from 'react'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  apiKey: string
  onApiKeyChange: (key: string) => void
}

const STORAGE_KEY = 'imgblend_custom_api_key'

export default function SettingsPanel({
  isOpen,
  onClose,
  apiKey,
  onApiKeyChange,
}: SettingsPanelProps) {
  const [inputValue, setInputValue] = useState(apiKey)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    setInputValue(apiKey)
  }, [apiKey])

  useEffect(() => {
    // localStorage에서 저장된 키 불러오기
    const savedKey = localStorage.getItem(STORAGE_KEY)
    if (savedKey) {
      onApiKeyChange(savedKey)
    }
  }, [onApiKeyChange])

  const handleSave = () => {
    onApiKeyChange(inputValue)
    if (inputValue) {
      localStorage.setItem(STORAGE_KEY, inputValue)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    onClose()
  }

  const handleClear = () => {
    setInputValue('')
    onApiKeyChange('')
    localStorage.removeItem(STORAGE_KEY)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">설정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="apiKey"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              DashScope API 키 (선택사항)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              자신의 API 키를 입력하면 서버 키 대신 사용됩니다.
              키는 브라우저에 안전하게 저장됩니다.
            </p>
            <div className="relative">
              <input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxx"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {inputValue && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              사용자 API 키가 설정됨
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleClear}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              초기화
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
