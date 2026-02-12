'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Checkbox } from '@/components/ui/Checkbox';
import { STYLE_PRESETS, CATEGORY_NAMES, getStylesByCategory } from '@/lib/styles';
import type { GenerationResult } from '@/lib/types';

type GenerationStatus = 'idle' | 'uploading' | 'generating' | 'completed' | 'error';

export default function HomePage() {
  // 이미지 업로드 상태
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // 모드 및 선택 상태
  const [mode, setMode] = useState<'style' | 'reference'>('style');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  // 생성 상태
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [error, setError] = useState<string>('');

  // 이미지 업로드 처리
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setError('JPEG, PNG, WebP 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    setError('');
    setUploadedFile(file);

    // 미리보기
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 스타일 선택 토글
  const toggleStyle = (styleId: string) => {
    setSelectedStyles((prev) => {
      if (prev.includes(styleId)) {
        return prev.filter(id => id !== styleId);
      } else {
        if (prev.length >= 4) {
          setError('최대 4개의 스타일만 선택할 수 있습니다.');
          return prev;
        }
        setError('');
        return [...prev, styleId];
      }
    });
  };

  // 생성 시작
  const handleGenerate = async () => {
    if (!uploadedImage) {
      setError('이미지를 업로드해주세요.');
      return;
    }

    if (mode === 'style' && selectedStyles.length === 0) {
      setError('최소 1개의 스타일을 선택해주세요.');
      return;
    }

    setError('');
    setStatus('generating');
    setProgress(0);
    setResults([]);

    try {
      // 1. 예측 생성 요청
      const createResponse = await fetch('/api/predictions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputImageUrl: uploadedImage,
          mode,
          selectedStyles,
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error || '이미지 생성 요청 실패');
      }

      const { predictions } = await createResponse.json();

      // 2. 폴링으로 결과 확인
      const completedResults: GenerationResult[] = [];
      const totalPredictions = predictions.length;

      while (completedResults.length < totalPredictions) {
        for (const pred of predictions) {
          if (completedResults.find(r => r.predictionId === pred.predictionId)) {
            continue;
          }

          const statusResponse = await fetch(`/api/predictions/${pred.predictionId}`);
          const prediction = await statusResponse.json();

          if (prediction.status === 'succeeded') {
            completedResults.push({
              styleId: pred.styleId,
              styleName: pred.styleName,
              predictionId: pred.predictionId,
              imageUrl: prediction.output,
            });
            setProgress((completedResults.length / totalPredictions) * 100);
            setResults([...completedResults]);
          } else if (prediction.status === 'failed') {
            completedResults.push({
              styleId: pred.styleId,
              styleName: pred.styleName,
              predictionId: pred.predictionId,
              error: prediction.error || '생성 실패',
            });
            setProgress((completedResults.length / totalPredictions) * 100);
            setResults([...completedResults]);
          }
        }

        if (completedResults.length < totalPredictions) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2초마다 폴링
        }
      }

      setStatus('completed');
    } catch (err: any) {
      setError(err.message || '이미지 생성 중 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  // ZIP 다운로드
  const handleDownload = async () => {
    if (results.length === 0) return;

    const successResults = results.filter(r => r.imageUrl);

    if (successResults.length === 0) {
      setError('다운로드할 이미지가 없습니다.');
      return;
    }

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls: successResults.map(r => ({
            url: r.imageUrl,
            styleName: r.styleName,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('다운로드 실패');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'redraw-images.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('다운로드 중 오류가 발생했습니다.');
    }
  };

  const stylesByCategory = getStylesByCategory();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Redraw
          </h1>
          <p className="text-gray-600">AI 이미지 스타일 변형</p>
        </div>

        {/* 이미지 업로드 */}
        <Card title="1. 이미지 업로드" className="mb-6">
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition-colors bg-gray-50">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
              {uploadedImage ? (
                <img
                  src={uploadedImage}
                  alt="Uploaded"
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">이미지를 드래그하거나 클릭하여 업로드</p>
                  <p className="text-xs text-gray-500">JPEG, PNG, WebP (최대 10MB)</p>
                </div>
              )}
            </label>
          </div>
        </Card>

        {/* 스타일 선택 */}
        <Card title="2. 스타일 선택 (최대 4개)" className="mb-6">
          <div className="space-y-6">
            {Object.entries(stylesByCategory).map(([category, styles]) => (
              <div key={category}>
                <h3 className="font-semibold text-gray-700 mb-3">
                  {CATEGORY_NAMES[category] || category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {styles.map(style => (
                    <Checkbox
                      key={style.id}
                      label={style.name}
                      description={style.description}
                      checked={selectedStyles.includes(style.id)}
                      onChange={() => toggleStyle(style.id)}
                      disabled={!selectedStyles.includes(style.id) && selectedStyles.length >= 4}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* 생성 버튼 */}
        <div className="mb-6 flex justify-center">
          <Button
            onClick={handleGenerate}
            disabled={status === 'generating' || !uploadedImage || selectedStyles.length === 0}
            size="lg"
            className="px-12"
          >
            {status === 'generating' ? '생성 중...' : '이미지 생성 시작'}
          </Button>
        </div>

        {/* 진행 상태 */}
        {status === 'generating' && (
          <Card title="생성 진행 상태" className="mb-6">
            <Progress
              value={progress}
              max={100}
              label={`${results.length} / ${selectedStyles.length} 완료`}
            />
            <p className="text-sm text-gray-600 mt-3 text-center">
              예상 시간: 약 {Math.max(10, selectedStyles.length * 5)} 초
            </p>
          </Card>
        )}

        {/* 결과 갤러리 */}
        {results.length > 0 && (
          <Card title="생성 결과" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    {result.styleName}
                  </h4>
                  {result.imageUrl ? (
                    <img
                      src={result.imageUrl}
                      alt={result.styleName}
                      className="w-full rounded-lg"
                    />
                  ) : result.error ? (
                    <div className="bg-red-100 text-red-700 p-4 rounded-lg text-sm">
                      생성 실패: {result.error}
                    </div>
                  ) : (
                    <div className="bg-gray-200 h-48 rounded-lg flex items-center justify-center">
                      <span className="text-gray-500">생성 중...</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {status === 'completed' && (
              <div className="flex justify-center">
                <Button onClick={handleDownload} size="lg">
                  ZIP 파일로 다운로드
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
