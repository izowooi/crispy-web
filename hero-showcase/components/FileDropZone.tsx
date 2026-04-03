"use client";

import { useRef, useState } from "react";

interface FileDropZoneProps {
  accept: string;
  label: string;
  description?: string;
  onFile: (file: File) => void;
  selectedFile?: File | null;
}

export function FileDropZone({
  accept,
  label,
  description,
  onFile,
  selectedFile,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed p-6
          flex flex-col items-center justify-center gap-2 transition-colors
          ${isDragging
            ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950"
            : selectedFile
            ? "border-green-400 bg-green-50 dark:bg-green-950"
            : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        {selectedFile ? (
          <>
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              {selectedFile.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {(selectedFile.size / 1024).toFixed(0)} KB · 클릭하여 변경
            </span>
          </>
        ) : (
          <>
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              파일을 드래그하거나 클릭하여 선택
            </span>
            {description && (
              <span className="text-xs text-gray-400 dark:text-gray-500">{description}</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
