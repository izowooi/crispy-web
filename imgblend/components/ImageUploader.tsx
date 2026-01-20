'use client'

import { useCallback, useRef } from 'react'

interface ImageSlot {
  id: number
  file: File | null
  preview: string | null
  base64: string | null
}

interface ImageUploaderProps {
  images: ImageSlot[]
  onImagesChange: (images: ImageSlot[]) => void
}

const MAX_SIZE = 1024

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string
    }

    reader.onerror = reject

    img.onload = () => {
      let { width, height } = img

      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = (height / width) * MAX_SIZE
          width = MAX_SIZE
        } else {
          width = (width / height) * MAX_SIZE
          height = MAX_SIZE
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/png')
      resolve(dataUrl)
    }

    img.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function ImageUploader({
  images,
  onImagesChange,
}: ImageUploaderProps) {
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleFileSelect = useCallback(
    async (index: number, file: File | null) => {
      if (!file) return

      try {
        const base64 = await resizeImage(file)
        const newImages = [...images]
        newImages[index] = {
          ...newImages[index],
          file,
          preview: URL.createObjectURL(file),
          base64,
        }
        onImagesChange(newImages)
      } catch (error) {
        console.error('이미지 처리 오류:', error)
        alert('이미지 처리에 실패했습니다.')
      }
    },
    [images, onImagesChange]
  )

  const handleDrop = useCallback(
    (index: number, e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        handleFileSelect(index, file)
      }
    },
    [handleFileSelect]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleRemove = useCallback(
    (index: number) => {
      const newImages = [...images]
      if (newImages[index].preview) {
        URL.revokeObjectURL(newImages[index].preview!)
      }
      newImages[index] = {
        ...newImages[index],
        file: null,
        preview: null,
        base64: null,
      }
      onImagesChange(newImages)
    },
    [images, onImagesChange]
  )

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">
        입력 이미지 (1~3개)
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {images.map((slot, index) => (
          <div
            key={slot.id}
            className="relative"
            onDrop={(e) => handleDrop(index, e)}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={(el) => {
                fileInputRefs.current[index] = el
              }}
              onChange={(e) => handleFileSelect(index, e.target.files?.[0] || null)}
            />
            <div
              onClick={() => fileInputRefs.current[index]?.click()}
              className={`
                aspect-square rounded-lg border-2 border-dashed cursor-pointer
                flex flex-col items-center justify-center
                transition-colors overflow-hidden
                ${
                  slot.preview
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
                }
              `}
            >
              {slot.preview ? (
                <img
                  src={slot.preview}
                  alt={`이미지 ${index + 1}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <>
                  <svg
                    className="w-10 h-10 text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm text-gray-500">
                    이미지 {index + 1}
                    {index === 0 && ' (필수)'}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    클릭 또는 드래그
                  </span>
                </>
              )}
            </div>
            {slot.preview && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove(index)
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <svg
                  className="w-4 h-4"
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
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
