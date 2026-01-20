import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 })
  }

  try {
    const response = await fetch(url)

    if (!response.ok) {
      return NextResponse.json(
        { error: '이미지를 가져올 수 없습니다.' },
        { status: response.status }
      )
    }

    const blob = await response.blob()

    return new NextResponse(blob, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/png',
        'Content-Disposition': `attachment; filename="qwen-edit-${Date.now()}.png"`,
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: '다운로드에 실패했습니다.' },
      { status: 500 }
    )
  }
}
