'use client'

import { useState } from 'react'
import ImageUploader from '@/components/ImageUploader'
import PromptInput from '@/components/PromptInput'
import ResultDisplay from '@/components/ResultDisplay'

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
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
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
          Powered by Alibaba Qwen Image Edit
        </footer>
      </div>
    </main>
  )
}
