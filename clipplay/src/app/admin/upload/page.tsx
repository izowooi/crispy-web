'use client';

import { useState, useRef, useCallback } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { captureVideoFrame, blobToFile, formatTime } from '@/lib/thumbnail/capture';
import {
  isCompressionSupported,
  compressVideo,
  estimateCompressedSize,
  formatBytes,
  type CompressionResult,
} from '@/lib/video/compress';

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

export default function AdminUploadPage() {
  const { isAuthenticated, isAdmin, isLoading } = useAuthContext();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    emoji: '🎬',
  });
  const [file, setFile] = useState<File | null>(null);
  const [filmingDate, setFilmingDate] = useState<string>('');
  const [isFilmingDateAutoDetected, setIsFilmingDateAutoDetected] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCustomEmoji, setShowCustomEmoji] = useState(false);
  const [customEmojiInput, setCustomEmojiInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Thumbnail states
  const [thumbnailMode, setThumbnailMode] = useState<'capture' | 'upload'>('capture');
  const [thumbnailTime, setThumbnailTime] = useState(1);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const thumbnailFileInputRef = useRef<HTMLInputElement>(null);

  // Compression states
  const [compressionEnabled, setCompressionEnabled] = useState(true);
  const [compressionSupport, setCompressionSupport] = useState<{
    supported: boolean;
    hevc: boolean;
    h264: boolean;
  } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressedFile, setCompressedFile] = useState<Blob | null>(null);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      router.push('/admin/login');
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  // Check compression support on mount
  useEffect(() => {
    isCompressionSupported().then(setCompressionSupport);
  }, []);

  // Cleanup video URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [videoUrl, thumbnailPreview]);

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 200 * 1024 * 1024) {
        setError('파일 크기는 200MB를 초과할 수 없습니다.');
        return;
      }
      if (!selectedFile.type.startsWith('video/')) {
        setError('동영상 파일만 업로드할 수 있습니다.');
        return;
      }

      // Cleanup previous URL
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }

      setFile(selectedFile);
      setError(null);
      setThumbnailBlob(null);
      setThumbnailPreview(null);
      setThumbnailTime(1);
      setCompressedFile(null);
      setCompressionResult(null);
      setCompressionProgress(0);

      // Auto-extract filming date from file's lastModified
      const lastModifiedDate = new Date(selectedFile.lastModified);
      const dateStr = lastModifiedDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
      setFilmingDate(dateStr);
      setIsFilmingDateAutoDetected(true);

      // Create video URL for preview
      const url = URL.createObjectURL(selectedFile);
      setVideoUrl(url);
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const videoDuration = Math.round(videoRef.current.duration);
      setDuration(videoDuration);
      // Set default thumbnail time to 1 second or middle if video is shorter
      setThumbnailTime(Math.min(1, videoDuration / 2));
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setThumbnailTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleCaptureThumbnail = async () => {
    if (!videoRef.current) return;

    setIsCapturing(true);
    try {
      const blob = await captureVideoFrame(videoRef.current, thumbnailTime);
      setThumbnailBlob(blob);

      // Create preview URL
      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
      const previewUrl = URL.createObjectURL(blob);
      setThumbnailPreview(previewUrl);
    } catch (err) {
      setError('썸네일 캡처에 실패했습니다.');
      console.error('Thumbnail capture error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Upload file using XMLHttpRequest with progress tracking
  const uploadWithProgress = (
    url: string,
    file: File | Blob,
    contentType: string,
    onProgress: (percent: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error'));
      xhr.ontimeout = () => reject(new Error('Upload timeout'));

      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.send(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('동영상 파일을 선택해주세요.');
      return;
    }

    if (!formData.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Determine which file to upload (compressed or original)
      let fileToUpload: File | Blob = file;
      let finalFileSize = file.size;

      // Step 0: Compress video if enabled and supported
      if (compressionEnabled && compressionSupport?.supported) {
        setIsCompressing(true);
        setCompressionProgress(0);

        try {
          const result = await compressVideo(
            file,
            {
              codec: compressionSupport.hevc ? 'hevc' : 'avc',
              maxWidth: 720,
              maxHeight: 1280,
              bitrate: 2_000_000,
            },
            (progress) => setCompressionProgress(Math.round(progress * 100))
          );

          setCompressedFile(result.blob);
          setCompressionResult(result);
          fileToUpload = result.blob;
          finalFileSize = result.compressedSize;
        } catch (compressErr) {
          console.error('Compression failed:', compressErr);
          // Continue with original file if compression fails
          setError('압축 실패, 원본 파일로 업로드합니다.');
        } finally {
          setIsCompressing(false);
        }
      }

      // Step 1: Get presigned URLs
      const presignResponse = await fetch('/api/admin/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: fileToUpload instanceof File ? fileToUpload.type : 'video/mp4',
          fileSize: finalFileSize,
          thumbnailContentType: thumbnailBlob ? 'image/jpeg' : undefined,
        }),
      });

      if (!presignResponse.ok) {
        const data = await presignResponse.json();
        throw new Error(data.error || 'Presigned URL 발급 실패');
      }

      const presignData = await presignResponse.json();
      const { clipId, videoKey, videoUploadUrl, thumbnailKey, thumbnailUploadUrl } = presignData;

      // Step 2: Upload video directly to R2 with progress
      await uploadWithProgress(
        videoUploadUrl,
        fileToUpload,
        fileToUpload instanceof File ? fileToUpload.type : 'video/mp4',
        (percent) => {
          // If we have thumbnail, video is 90% of total progress
          const adjustedPercent = thumbnailBlob ? Math.round(percent * 0.9) : percent;
          setUploadProgress(adjustedPercent);
        }
      );

      // Step 3: Upload thumbnail if exists
      if (thumbnailBlob && thumbnailUploadUrl) {
        await uploadWithProgress(
          thumbnailUploadUrl,
          thumbnailBlob,
          'image/jpeg',
          (percent) => {
            // Thumbnail is last 10% of progress
            setUploadProgress(90 + Math.round(percent * 0.1));
          }
        );
      }

      // Step 4: Save metadata
      const metadataResponse = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipId,
          videoKey,
          title: formData.title,
          description: formData.description,
          emoji: formData.emoji,
          duration: duration || 60,
          fileSize: finalFileSize,
          filmingDate: filmingDate || undefined,
          thumbnailKey: thumbnailBlob ? thumbnailKey : undefined,
          thumbnailTimestamp: thumbnailBlob ? thumbnailTime : undefined,
        }),
      });

      if (!metadataResponse.ok) {
        const data = await metadataResponse.json();
        throw new Error(data.error || '메타데이터 저장 실패');
      }

      setUploadProgress(100);
      setSuccess(true);
      setFormData({
        title: '',
        description: '',
        emoji: '🎬',
      });
      setFile(null);
      setDuration(null);
      setFilmingDate('');
      setIsFilmingDateAutoDetected(false);
      setThumbnailBlob(null);
      setThumbnailPreview(null);
      setThumbnailTime(1);
      setCompressedFile(null);
      setCompressionResult(null);
      setCompressionProgress(0);
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card-bg border-b border-card-border">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/admin"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            ← 뒤로
          </Link>
          <h1 className="text-xl font-bold text-foreground">새 클립 업로드</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400">
            클립이 성공적으로 업로드되었습니다!
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File upload */}
          <div className="bg-card-bg border border-card-border rounded-2xl p-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              동영상 파일 *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/*"
              onChange={handleFileChange}
              className="w-full text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:cursor-pointer hover:file:bg-primary/90"
            />
            {file && (
              <p className="mt-2 text-sm text-foreground/60">
                선택됨: {file.name} ({formatBytes(file.size)})
                {duration && ` • ${Math.floor(duration / 60)}분 ${duration % 60}초`}
              </p>
            )}
            <p className="mt-2 text-xs text-foreground/40">
              최대 200MB, MP4 권장 (세로 동영상)
            </p>
          </div>

          {/* Compression Toggle */}
          {file && (
            <div className="bg-card-bg border border-card-border rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🗜️</span>
                    <label className="text-sm font-medium text-foreground">
                      압축 후 업로드
                    </label>
                    {compressionSupport?.hevc && (
                      <span className="text-xs bg-green-500/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded">
                        H.265
                      </span>
                    )}
                    {compressionSupport?.h264 && !compressionSupport?.hevc && (
                      <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                        H.264
                      </span>
                    )}
                  </div>
                  {compressionSupport?.supported ? (
                    <p className="mt-1 text-xs text-foreground/50">
                      예상 크기: ~{formatBytes(estimateCompressedSize(duration || 60))}
                      <span className="ml-2 text-foreground/40">
                        (원본의 약 1/{Math.ceil(file.size / estimateCompressedSize(duration || 60))})
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-orange-500">
                      이 브라우저에서는 압축이 지원되지 않습니다
                    </p>
                  )}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compressionEnabled && (compressionSupport?.supported ?? false)}
                    onChange={(e) => setCompressionEnabled(e.target.checked)}
                    disabled={!compressionSupport?.supported}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-card-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
                </label>
              </div>

              {/* Compression Result */}
              {compressionResult && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600 dark:text-green-400">압축 완료!</span>
                    <span className="text-foreground/70">
                      {formatBytes(compressionResult.originalSize)} → {formatBytes(compressionResult.compressedSize)}
                      <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                        ({compressionResult.compressionRatio.toFixed(1)}x 압축)
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Video Preview & Thumbnail Capture */}
          {videoUrl && (
            <div className="bg-card-bg border border-card-border rounded-2xl p-6">
              <label className="block text-sm font-medium text-foreground mb-4">
                썸네일 선택
              </label>

              {/* Mode Selection */}
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="thumbnailMode"
                    checked={thumbnailMode === 'capture'}
                    onChange={() => {
                      setThumbnailMode('capture');
                      // 모드 변경 시 썸네일 초기화
                      if (thumbnailPreview) {
                        URL.revokeObjectURL(thumbnailPreview);
                      }
                      setThumbnailBlob(null);
                      setThumbnailPreview(null);
                    }}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm text-foreground">동영상에서 캡처</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="thumbnailMode"
                    checked={thumbnailMode === 'upload'}
                    onChange={() => {
                      setThumbnailMode('upload');
                      // 모드 변경 시 썸네일 초기화
                      if (thumbnailPreview) {
                        URL.revokeObjectURL(thumbnailPreview);
                      }
                      setThumbnailBlob(null);
                      setThumbnailPreview(null);
                    }}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm text-foreground">이미지 업로드</span>
                </label>
              </div>

              {/* Capture Mode */}
              {thumbnailMode === 'capture' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Video Preview */}
                    <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        className="w-full h-full object-contain"
                        onLoadedMetadata={handleVideoLoaded}
                        muted
                        playsInline
                      />
                    </div>

                    {/* Thumbnail Preview */}
                    <div className="space-y-4">
                      <div className="aspect-[9/16] bg-card-border rounded-lg overflow-hidden flex items-center justify-center">
                        {thumbnailPreview ? (
                          <img
                            src={thumbnailPreview}
                            alt="Thumbnail preview"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center text-foreground/40">
                            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm">썸네일 미리보기</p>
                          </div>
                        )}
                      </div>

                      {thumbnailPreview && (
                        <p className="text-xs text-green-500 text-center">
                          ✓ 썸네일이 캡처되었습니다
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Time Slider */}
                  {duration && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm text-foreground/60">
                        <span>0:00</span>
                        <span className="font-medium text-foreground">{formatTime(thumbnailTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={duration}
                        step={0.1}
                        value={thumbnailTime}
                        onChange={handleSliderChange}
                        className="w-full h-2 bg-card-border rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  )}

                  {/* Capture Button */}
                  <button
                    type="button"
                    onClick={handleCaptureThumbnail}
                    disabled={isCapturing || !duration}
                    className="mt-4 w-full py-2 bg-card-border text-foreground rounded-lg font-medium hover:bg-card-border/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

                  <p className="mt-2 text-xs text-foreground/40 text-center">
                    슬라이더를 움직여 원하는 장면을 선택한 후 캡처하세요
                  </p>
                </>
              )}

              {/* Upload Mode */}
              {thumbnailMode === 'upload' && (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    {/* Thumbnail Preview */}
                    <div className="w-32 h-44 bg-card-border rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                      {thumbnailPreview ? (
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center text-foreground/40 p-2">
                          <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-xs">미리보기</p>
                        </div>
                      )}
                    </div>

                    {/* File Input */}
                    <div className="flex-1">
                      <input
                        ref={thumbnailFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // 이전 미리보기 URL 정리
                            if (thumbnailPreview) {
                              URL.revokeObjectURL(thumbnailPreview);
                            }
                            setThumbnailBlob(file);
                            setThumbnailPreview(URL.createObjectURL(file));
                          }
                        }}
                        className="w-full text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:cursor-pointer hover:file:bg-primary/90"
                      />
                      <p className="mt-2 text-xs text-foreground/40">
                        JPG, PNG 형식 권장
                      </p>
                      {thumbnailPreview && (
                        <p className="mt-2 text-xs text-green-500">
                          ✓ 썸네일 이미지가 선택되었습니다
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
              rows={3}
              className="w-full px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary resize-none"
              placeholder="클립에 대한 설명을 입력하세요"
            />
          </div>

          {/* Filming Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              촬영일
            </label>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={filmingDate}
                onChange={(e) => {
                  setFilmingDate(e.target.value);
                  setIsFilmingDateAutoDetected(false);
                }}
                className="px-4 py-3 bg-card-bg border border-card-border rounded-lg text-foreground focus:outline-none focus:border-primary"
              />
              {isFilmingDateAutoDetected && filmingDate && (
                <span className="text-xs text-foreground/50 bg-card-border px-2 py-1 rounded">
                  파일 수정일 기준
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-foreground/40">
              동영상을 촬영한 날짜입니다. 추억 모음 기능에서 사용됩니다.
            </p>
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

          {/* Submit */}
          {/* Compression Progress */}
          {isCompressing && (
            <div className="bg-card-bg border border-card-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  🗜️ 압축 중...
                </span>
                <span className="text-sm font-bold text-primary">
                  {compressionProgress}%
                </span>
              </div>
              <div className="w-full h-3 bg-card-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${compressionProgress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-foreground/50 text-center">
                {compressionSupport?.hevc ? 'H.265 (HEVC)' : 'H.264'} 인코딩 중...
              </p>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && !isCompressing && (
            <div className="bg-card-bg border border-card-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  📤 업로드 중...
                </span>
                <span className="text-sm font-bold text-primary">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full h-3 bg-card-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-foreground/50 text-center">
                {compressedFile ? (
                  <>
                    {formatBytes(Math.round(compressedFile.size * uploadProgress / 100))} / {formatBytes(compressedFile.size)}
                  </>
                ) : file ? (
                  <>
                    {formatBytes(Math.round(file.size * uploadProgress / 100))} / {formatBytes(file.size)}
                  </>
                ) : null}
              </p>
            </div>
          )}
          <button
            type="submit"
            disabled={uploading || isCompressing}
            className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCompressing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                압축 중...
              </span>
            ) : uploading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                업로드 중...
              </span>
            ) : (
              '업로드'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
