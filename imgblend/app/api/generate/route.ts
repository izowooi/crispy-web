import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface ImageContent {
  image: string
}

interface TextContent {
  text: string
}

type ContentItem = ImageContent | TextContent

interface Message {
  role: string
  content: ContentItem[]
}

interface DashScopeResponse {
  output?: {
    choices?: Array<{
      message?: {
        content?: Array<{ image?: string; text?: string }>
      }
    }>
  }
  code?: string
  message?: string
}

export async function POST(request: NextRequest) {
  try {
    const { images, prompt, negativePrompt } = await request.json()

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: '최소 1개의 이미지가 필요합니다.' },
        { status: 400 }
      )
    }

    if (!prompt) {
      return NextResponse.json(
        { error: '프롬프트를 입력해주세요.' },
        { status: 400 }
      )
    }

    const apiKey = process.env.DASHSCOPE_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    // 메시지 내용 구성
    const content: ContentItem[] = images.map((img: string) => ({ image: img }))
    content.push({ text: prompt })

    const messages: Message[] = [
      {
        role: 'user',
        content: content,
      },
    ]

    // DashScope API 호출
    const response = await fetch(
      'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-image-edit',
          input: {
            messages: messages,
          },
          parameters: {
            result_format: 'message',
            watermark: false,
            negative_prompt: negativePrompt || '',
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DashScope API error:', errorText)
      return NextResponse.json(
        { error: `API 오류: ${response.status}` },
        { status: response.status }
      )
    }

    const data: DashScopeResponse = await response.json()

    // 응답에서 이미지 URL 추출
    if (data.code) {
      return NextResponse.json(
        { error: `API 오류: ${data.message || data.code}` },
        { status: 400 }
      )
    }

    const choices = data.output?.choices
    if (!choices || choices.length === 0) {
      return NextResponse.json(
        { error: '응답에서 이미지를 찾을 수 없습니다.' },
        { status: 500 }
      )
    }

    const messageContent = choices[0].message?.content
    if (!messageContent) {
      return NextResponse.json(
        { error: '응답에서 이미지를 찾을 수 없습니다.' },
        { status: 500 }
      )
    }

    const imageItem = messageContent.find((item) => item.image)
    if (!imageItem || !imageItem.image) {
      return NextResponse.json(
        { error: '응답에서 이미지를 찾을 수 없습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ imageUrl: imageItem.image })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
