import { NextResponse } from 'next/server';
import { replicate } from '@/lib/replicate';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: '예측 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const prediction = await replicate.predictions.get(id);

    return NextResponse.json(prediction, { status: 200 });
  } catch (error: any) {
    console.error('Prediction fetch error:', error);

    return NextResponse.json(
      { error: '예측 상태를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
