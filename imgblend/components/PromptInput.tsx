'use client'

interface PromptInputProps {
  prompt: string
  negativePrompt: string
  onPromptChange: (value: string) => void
  onNegativePromptChange: (value: string) => void
}

export default function PromptInput({
  prompt,
  negativePrompt,
  onPromptChange,
  onNegativePromptChange,
}: PromptInputProps) {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="prompt"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          긍정 프롬프트 (원하는 변경 사항)
        </label>
        <textarea
          id="prompt"
          rows={4}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="예: 배경을 눈 덮인 산으로 바꿔주세요"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 placeholder-gray-400"
        />
      </div>
      <div>
        <label
          htmlFor="negativePrompt"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          부정 프롬프트 (피하고 싶은 요소)
        </label>
        <textarea
          id="negativePrompt"
          rows={3}
          value={negativePrompt}
          onChange={(e) => onNegativePromptChange(e.target.value)}
          placeholder="예: 흐린 이미지, 저품질, 워터마크"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 placeholder-gray-400"
        />
      </div>
    </div>
  )
}
