'use client'

import { useState, useCallback } from 'react'
import ImageUploader from '@/components/ImageUploader'
import PromptInput from '@/components/PromptInput'
import ResultDisplay from '@/components/ResultDisplay'
import SettingsPanel from '@/components/SettingsPanel'

interface ImageSlot {
  id: number
  file: File | null
  preview: string | null
  base64: string | null
}

const initialImages: ImageSlot[] = [
  { id: 1, file: null, preview: null, base64: null },
  { id: 2, file: null, preview: null, base64: null },
  { id: 3, file: null, preview: null, base64: null },
]

export default function Home() {
  const [images, setImages] = useState<ImageSlot[]>(initialImages)
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [customApiKey, setCustomApiKey] = useState('')

  const handleApiKeyChange = useCallback((key: string) => {
    setCustomApiKey(key)
  }, [])

  const handleGenerate = async () => {
    // 유효한 이미지 필터링
    const validImages = images.filter((img) => img.base64)

    if (validImages.length === 0) {
      setError('최소 1개의 이미지를 업로드해주세요.')
      return
    }

    if (!prompt.trim()) {
      setError('프롬프트를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError(null)
    setResultUrl(null)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: validImages.map((img) => img.base64),
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim(),
          customApiKey: customApiKey || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '이미지 생성에 실패했습니다.')
      }

      setResultUrl(data.imageUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const hasValidImage = images.some((img) => img.base64)
  const canGenerate = hasValidImage && prompt.trim() && !isLoading

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={customApiKey}
        onApiKeyChange={handleApiKeyChange}
      />
      <div className="max-w-6xl mx-auto">
        <header className="relative text-center mb-8">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="absolute right-0 top-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="설정"
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Qwen Image Edit
          </h1>
          <p className="text-gray-600">
            이미지를 업로드하고 프롬프트를 입력하여 AI 이미지 편집을 시작하세요
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 왼쪽: 입력 영역 */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <ImageUploader images={images} onImagesChange={setImages} />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <PromptInput
                prompt={prompt}
                negativePrompt={negativePrompt}
                onPromptChange={setPrompt}
                onNegativePromptChange={setNegativePrompt}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`
                w-full py-4 rounded-xl font-semibold text-lg transition-all
                ${
                  canGenerate
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isLoading ? '생성 중...' : '이미지 생성'}
            </button>
          </div>

          {/* 오른쪽: 결과 영역 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <ResultDisplay
              imageUrl={resultUrl}
              isLoading={isLoading}
              error={error}
            />
          </div>
        </div>

        <footer className="text-center mt-8 text-sm text-gray-500">
          <p>Copyright (C) 2026 izowooi</p>
          <a
            href="https://github.com/izowooi/crispy-web/tree/main/imgblend"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 hover:underline"
          >
            소스 코드 보기
          </a>
        </footer>
      </div>
    </main>
  )
}
