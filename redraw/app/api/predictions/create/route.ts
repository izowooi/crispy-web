import { NextResponse } from 'next/server';
import { replicate } from '@/lib/replicate';
import { getStyleById } from '@/lib/styles';
import type { GenerationRequest } from '@/lib/types';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const body: GenerationRequest = await request.json();
    const { inputImageUrl, mode, selectedStyles, referenceImages } = body;

    if (!inputImageUrl) {
      return NextResponse.json(
        { error: '이미지를 업로드해주세요.' },
        { status: 400 }
      );
    }

    const predictions: Array<{
      styleId?: string;
      styleName?: string;
      predictionId: string;
    }> = [];

    if (mode === 'style' && selectedStyles && selectedStyles.length > 0) {
      // 스타일 모드: 각 스타일마다 예측 생성
      if (selectedStyles.length > 4) {
        return NextResponse.json(
          { error: '최대 4개의 스타일만 선택할 수 있습니다.' },
          { status: 400 }
        );
      }

      // 동시 처리 시도
      try {
        const predictionPromises = selectedStyles.map(async (styleId) => {
          const style = getStyleById(styleId);
          if (!style) {
            throw new Error(`스타일을 찾을 수 없습니다: ${styleId}`);
          }

          const prediction = await replicate.predictions.create({
            model: 'black-forest-labs/flux-kontext-pro',
            input: {
              prompt: style.prompt,
              input_image: inputImageUrl,
              aspect_ratio: 'match_input_image',
              output_format: 'jpg',
              safety_tolerance: 2,
            },
          });

          return {
            styleId: style.id,
            styleName: style.name,
            predictionId: prediction.id,
          };
        });

        const results = await Promise.all(predictionPromises);
        predictions.push(...results);
      } catch (error: any) {
        // Rate Limit 에러 시 순차 처리로 폴백
        if (error?.response?.status === 429) {
          console.log('Rate limit encountered, falling back to sequential processing');

          for (const styleId of selectedStyles) {
            const style = getStyleById(styleId);
            if (!style) continue;

            const prediction = await replicate.predictions.create({
              model: 'black-forest-labs/flux-kontext-pro',
              input: {
                prompt: style.prompt,
                input_image: inputImageUrl,
                aspect_ratio: 'match_input_image',
                output_format: 'jpg',
                safety_tolerance: 2,
              },
            });

            predictions.push({
              styleId: style.id,
              styleName: style.name,
              predictionId: prediction.id,
            });

            // 순차 처리 시 약간의 지연
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          throw error;
        }
      }
    } else if (mode === 'reference' && referenceImages && referenceImages.length > 0) {
      // 참조 이미지 모드
      if (referenceImages.length > 8) {
        return NextResponse.json(
          { error: '최대 8개의 참조 이미지만 업로드할 수 있습니다.' },
          { status: 400 }
        );
      }

      // 참조 이미지 모드는 아직 구현 예정
      // flux-kontext-pro API 문서에서 참조 이미지 파라미터 확인 필요
      return NextResponse.json(
        { error: '참조 이미지 모드는 현재 구현 중입니다.' },
        { status: 501 }
      );
    } else {
      return NextResponse.json(
        { error: '스타일 또는 참조 이미지를 선택해주세요.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ predictions }, { status: 200 });
  } catch (error: any) {
    console.error('Prediction creation error:', error);

    let errorMessage = '이미지 생성 중 오류가 발생했습니다.';

    if (error?.response?.status === 402) {
      errorMessage = '크레딧이 부족합니다. Replicate 계정을 확인해주세요.';
    } else if (error?.response?.status === 429) {
      errorMessage = '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
