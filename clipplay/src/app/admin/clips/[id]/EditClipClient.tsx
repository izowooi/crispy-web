'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useClips } from '@/hooks/useClips';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { captureVideoFrame, blobToFile, formatTime } from '@/lib/thumbnail/capture';

const EMOJI_OPTIONS = ['🎬', '🎥', '📹', '🎞️', '🌟', '💕', '🎉', '🏠', '✨', '🌈'];

// 단일 이모지 검증 함수
function isValidSingleEmoji(str: string): boolean {
  if (!str) return false;
  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;
  return emojiRegex.test(str);
}

// 문자열에서 첫 번째 이모지만 추출
function extractFirstEmoji(str: string): string | null {
  const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*/u;
  const match = str.match(emojiRegex);
  return match ? match[0] : null;
}

interface EditClipClientProps {
  id: string;
}

export function EditClipClient({ id }: EditClipClientProps) {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuthContext();
  const { getClipById, isLoading: clipsLoading, refetch } = useClips();
  const router = useRouter();

  const clip = getClipById(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    emoji: '🎬',
    duration: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showCustomEmoji, setShowCustomEmoji] = useState(false);
  const [customEmojiInput, setCustomEmojiInput] = useState('');

  // 썸네일 수정 관련 상태
  const [showThumbnailEdit, setShowThumbnailEdit] = useState(false);
  const [thumbnailMode, setThumbnailMode] = useState<'upload' | 'capture'>('upload');
  const [newThumbnailFile, setNewThumbnailFile] = useState<File | null>(null);
  const [newThumbnailPreview, setNewThumbnailPreview] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // 동영상 캡처 모드용 상태
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [thumbnailTime, setThumbnailTime] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);

  // Load clip data into form
  useEffect(() => {
    if (clip) {
      setFormData({
        title: clip.title,
        description: clip.description || '',
        emoji: clip.emoji,
        duration: clip.duration,
      });
    }
  }, [clip]);

  // Auth check
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      router.push('/admin/login');
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  if (authLoading || clipsLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!clip) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">클립을 찾을 수 없습니다</h1>
        <Link
          href="/admin/clips"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    try {
      setSaving(true);

      const metadata = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        emoji: formData.emoji,
        duration: formData.duration,
        updatedAt: new Date().toISOString(),
      };

      let response: Response;

      // 썸네일이 변경된 경우 FormData로 전송
      if (newThumbnailFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('thumbnail', newThumbnailFile);
        uploadFormData.append('metadata', JSON.stringify(metadata));
        if (thumbnailTime > 0) {
          uploadFormData.append('thumbnailTimestamp', thumbnailTime.toString());
        }

        response = await fetch(`/api/admin/clips/${id}`, {
          method: 'PATCH',
          body: uploadFormData,
        });
      } else {
        // 썸네일 변경 없이 메타데이터만 전송
        response = await fetch(`/api/admin/clips/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metadata),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '저장에 실패했습니다.');
      }

      setSuccess(true);
      await refetch();

      // 상태 초기화
      setShowThumbnailEdit(false);
      setNewThumbnailFile(null);
      if (newThumbnailPreview) {
        URL.revokeObjectURL(newThumbnailPreview);
        setNewThumbnailPreview(null);
      }

      setTimeout(() => {
        setSuccess(false);
        router.push('/admin/clips');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const formatDurationInput = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseDurationInput = (value: string) => {
    const parts = value.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10) || 0;
      const secs = parseInt(parts[1], 10) || 0;
      return mins * 60 + secs;
    }
    return parseInt(value, 10) || 0;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card-bg border-b border-card-border">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/admin/clips"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            ← 뒤로
          </Link>
          <h1 className="text-xl font-bold text-foreground">클립 수정</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400">
            저장되었습니다!
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              제목 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              placeholder="클립 제목을 입력하세요"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="클립에 대한 설명을 입력하세요"
            />
          </div>

          {/* Emoji */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              이모지
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, emoji });
                    setShowCustomEmoji(false);
                    setCustomEmojiInput('');
                  }}
                  className={`w-12 h-12 text-2xl rounded-lg border transition-colors ${
                    formData.emoji === emoji && !showCustomEmoji
                      ? 'border-primary bg-primary/10'
                      : 'border-card-border bg-card-bg hover:border-primary/50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
              {/* Custom emoji button */}
              <button
                type="button"
                onClick={() => setShowCustomEmoji(!showCustomEmoji)}
                className={`w-12 h-12 text-lg rounded-lg border transition-colors ${
                  showCustomEmoji
                    ? 'border-primary bg-primary/10'
                    : 'border-card-border bg-card-bg hover:border-primary/50'
                }`}
                title="직접 입력"
              >
                ✏️
              </button>
            </div>
            {/* Custom emoji input */}
            {showCustomEmoji && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customEmojiInput}
                  onChange={(e) => {
                    const input = e.target.value;
                    const emoji = extractFirstEmoji(input);
                    if (emoji) {
                      setCustomEmojiInput(emoji);
                      setFormData({ ...formData, emoji });
                    } else if (input === '') {
                      setCustomEmojiInput('');
                    }
                  }}
                  className="w-20 h-12 text-2xl text-center bg-card-bg border border-card-border rounded-lg focus:outline-none focus:border-primary"
                  placeholder="🎉"
                  maxLength={4}
                />
                {customEmojiInput && isValidSingleEmoji(customEmojiInput) && (
                  <span className="text-green-500 text-sm">✓ 유효한 이모지</span>
                )}
                <span className="text-xs text-foreground/50">이모지 1개만 입력</span>
              </div>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              재생시간 (분:초)
            </label>
            <input
              type="text"
              value={formatDurationInput(formData.duration)}
              onChange={(e) => setFormData({ ...formData, duration: parseDurationInput(e.target.value) })}
              className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              placeholder="예: 1:30"
            />
            <p className="mt-1 text-xs text-foreground/50">
              총 {formData.duration}초
            </p>
          </div>

          {/* Thumbnail */}
          <div className="bg-card-bg border border-card-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">썸네일</h3>
              <button
                type="button"
                onClick={() => {
                  setShowThumbnailEdit(!showThumbnailEdit);
                  if (!showThumbnailEdit) {
                    // 초기화
                    setNewThumbnailFile(null);
                    setNewThumbnailPreview(null);
                    setVideoLoaded(false);
                    setVideoLoading(false);
                  }
                }}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  showThumbnailEdit
                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                {showThumbnailEdit ? '취소' : '썸네일 변경'}
              </button>
            </div>

            {/* 현재 썸네일 미리보기 */}
            <div className="flex gap-4">
              <div className="w-24 h-32 bg-card-border rounded-lg overflow-hidden flex items-center justify-center">
                {newThumbnailPreview ? (
                  <img
                    src={newThumbnailPreview}
                    alt="새 썸네일"
                    className="w-full h-full object-cover"
                  />
                ) : clip.thumbnailKey ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${clip.thumbnailKey}`}
                    alt="현재 썸네일"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-foreground/40 text-xs p-2">
                    썸네일 없음
                  </div>
                )}
              </div>
              <div className="flex-1 text-sm text-foreground/60">
                {newThumbnailPreview ? (
                  <p className="text-green-500">새 썸네일이 선택되었습니다</p>
                ) : clip.thumbnailKey ? (
                  <p>현재 썸네일: {clip.thumbnailKey}</p>
                ) : (
                  <p>썸네일이 설정되지 않았습니다</p>
                )}
              </div>
            </div>

            {/* 썸네일 변경 UI */}
            {showThumbnailEdit && (
              <div className="mt-4 pt-4 border-t border-card-border">
                {/* 모드 선택 */}
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="thumbnailMode"
                      checked={thumbnailMode === 'upload'}
                      onChange={() => setThumbnailMode('upload')}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm text-foreground">이미지 업로드</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="thumbnailMode"
                      checked={thumbnailMode === 'capture'}
                      onChange={() => setThumbnailMode('capture')}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm text-foreground">동영상에서 캡처</span>
                  </label>
                </div>

                {/* 이미지 업로드 모드 */}
                {thumbnailMode === 'upload' && (
                  <div>
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setNewThumbnailFile(file);
                          // 미리보기 생성
                          if (newThumbnailPreview) {
                            URL.revokeObjectURL(newThumbnailPreview);
                          }
                          setNewThumbnailPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="w-full text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:cursor-pointer hover:file:bg-primary/90"
                    />
                    <p className="mt-2 text-xs text-foreground/40">
                      JPG, PNG 형식 권장
                    </p>
                  </div>
                )}

                {/* 동영상 캡처 모드 */}
                {thumbnailMode === 'capture' && (
                  <div>
                    {!videoLoaded && !videoLoading && (
                      <button
                        type="button"
                        onClick={() => {
                          setVideoLoading(true);
                          // 비디오 로드는 video 요소의 onLoadedMetadata에서 처리
                        }}
                        className="w-full py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                      >
                        동영상 로드
                      </button>
                    )}

                    {(videoLoading || videoLoaded) && (
                      <div className="space-y-4">
                        <div className="aspect-[9/16] max-h-[300px] bg-black rounded-lg overflow-hidden">
                          <video
                            ref={videoRef}
                            src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${clip.fileKey}`}
                            className="w-full h-full object-contain"
                            onLoadedMetadata={() => {
                              setVideoLoading(false);
                              setVideoLoaded(true);
                              if (videoRef.current) {
                                setThumbnailTime(Math.min(1, videoRef.current.duration / 2));
                              }
                            }}
                            onError={() => {
                              setVideoLoading(false);
                              setError('동영상을 로드할 수 없습니다.');
                            }}
                            muted
                            playsInline
                            crossOrigin="anonymous"
                          />
                        </div>

                        {videoLoading && (
                          <div className="flex items-center justify-center gap-2 text-foreground/60">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">동영상 로딩 중...</span>
                          </div>
                        )}

                        {videoLoaded && videoRef.current && (
                          <>
                            {/* 타임라인 슬라이더 */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm text-foreground/60">
                                <span>0:00</span>
                                <span className="font-medium text-foreground">{formatTime(thumbnailTime)}</span>
                                <span>{formatTime(videoRef.current.duration)}</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={videoRef.current.duration}
                                step={0.1}
                                value={thumbnailTime}
                                onChange={(e) => {
                                  const time = parseFloat(e.target.value);
                                  setThumbnailTime(time);
                                  if (videoRef.current) {
                                    videoRef.current.currentTime = time;
                                  }
                                }}
                                className="w-full h-2 bg-card-border rounded-lg appearance-none cursor-pointer accent-primary"
                              />
                            </div>

                            {/* 캡처 버튼 */}
                            <button
                              type="button"
                              onClick={async () => {
                                if (!videoRef.current) return;
                                setIsCapturing(true);
                                try {
                                  const blob = await captureVideoFrame(videoRef.current, thumbnailTime);
                                  const file = blobToFile(blob, 'thumbnail.jpg');
                                  setNewThumbnailFile(file);
                                  if (newThumbnailPreview) {
                                    URL.revokeObjectURL(newThumbnailPreview);
                                  }
                                  setNewThumbnailPreview(URL.createObjectURL(blob));
                                } catch (err) {
                                  setError('썸네일 캡처에 실패했습니다.');
                                  console.error('Capture error:', err);
                                } finally {
                                  setIsCapturing(false);
                                }
                              }}
                              disabled={isCapturing}
                              className="w-full py-2 bg-card-border text-foreground rounded-lg font-medium hover:bg-card-border/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {isCapturing ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                                  캡처 중...
                                </>
                              ) : (
                                <>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  현재 프레임 캡처
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    <p className="mt-2 text-xs text-foreground/40">
                      동영상을 로드한 후 원하는 장면에서 캡처하세요
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* File info (read-only) */}
          <div className="bg-card-bg border border-card-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-foreground mb-2">파일 정보 (수정 불가)</h3>
            <div className="text-sm text-foreground/60 space-y-1">
              <p>파일 키: {clip.fileKey}</p>
              <p>파일 크기: {(clip.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
              <p>생성일: {new Date(clip.createdAt).toLocaleString('ko-KR')}</p>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  저장 중...
                </span>
              ) : (
                '저장'
              )}
            </button>
            <Link
              href="/admin/clips"
              className="px-6 py-3 bg-card-bg border border-card-border text-foreground rounded-lg font-medium hover:bg-card-border transition-colors text-center"
            >
              취소
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
