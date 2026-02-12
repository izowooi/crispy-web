import JSZip from 'jszip';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrls } = body;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: '다운로드할 이미지가 없습니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 각 URL에서 이미지 다운로드
    const imageBuffers = await Promise.all(
      imageUrls.map(async (item: any, index: number) => {
        const url = typeof item === 'string' ? item : item.url;
        const styleName = item.styleName || `image-${index + 1}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`이미지 다운로드 실패: ${url}`);
        }

        const buffer = await response.arrayBuffer();
        return {
          filename: `${styleName}.jpg`,
          buffer: Buffer.from(buffer),
        };
      })
    );

    // ZIP 파일 생성
    const zip = new JSZip();
    imageBuffers.forEach(({ filename, buffer }) => {
      zip.file(filename, buffer);
    });

    // Cloudflare Workers와 호환되는 Uint8Array 사용
    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

    // ZIP 파일 응답
    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="redraw-images.zip"',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return new Response(
      JSON.stringify({ error: 'ZIP 파일 생성 중 오류가 발생했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
