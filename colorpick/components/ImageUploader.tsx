'use client';

import { useCallback, useRef, useState } from 'react';
import { TranslationKey } from '@/lib/i18n';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  t: (key: TranslationKey) => string;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

export default function ImageUploader({ onImageSelect, t, disabled }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(t('invalidFile'));
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(t('fileTooLarge'));
      return false;
    }

    return true;
  }, [t]);

  const handleFile = useCallback((file: File) => {
    if (validateFile(file)) {
      onImageSelect(file);
    }
  }, [onImageSelect, validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [disabled, handleFile]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input to allow selecting the same file again
    e.target.value = '';
  }, [handleFile]);

  return (
    <div className="w-full">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center
          w-full h-48 border-2 border-dashed rounded-xl
          transition-all cursor-pointer
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        <svg
          className={`w-12 h-12 mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>

        <p className={`text-base font-medium ${isDragging ? 'text-blue-600' : 'text-gray-600'}`}>
          {t('uploadTitle')}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {t('uploadHint')}
        </p>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
