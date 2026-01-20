'use client'

interface ResultDisplayProps {
  imageUrl: string | null
  isLoading: boolean
  error: string | null
}

export default function ResultDisplay({
  imageUrl,
  isLoading,
  error,
}: ResultDisplayProps) {
  const handleDownload = async () => {
    if (!imageUrl) return

    try {
      // 서버 프록시를 통해 다운로드 (CORS 우회)
      const proxyUrl = `/api/download?url=${encodeURIComponent(imageUrl)}`
      const a = document.createElement('a')
      a.href = proxyUrl
      a.download = `qwen-edit-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error('다운로드 오류:', err)
      alert('이미지 다운로드에 실패했습니다.')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">결과 이미지</h2>
      <div className="aspect-square rounded-lg border-2 border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <span className="text-gray-500">이미지 생성 중...</span>
          </div>
        ) : error ? (
          <div className="text-center p-4">
            <svg
              className="w-12 h-12 text-red-400 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-red-500">{error}</p>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="생성된 이미지"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-center text-gray-400">
            <svg
              className="w-16 h-16 mx-auto mb-2"
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
            <p>결과 이미지가 여기에 표시됩니다</p>
          </div>
        )}
      </div>
      {imageUrl && !isLoading && (
        <button
          onClick={handleDownload}
          className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          PNG로 다운로드
        </button>
      )}
    </div>
  )
}
