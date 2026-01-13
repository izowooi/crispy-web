'use client';

import { useState, useCallback, useEffect } from 'react';
import ImageUploader from '@/components/ImageUploader';
import ColorBar from '@/components/ColorBar';
import LanguageToggle from '@/components/LanguageToggle';
import { extractColors, ColorInfo } from '@/lib/colorExtractor';
import { Language, useTranslation } from '@/lib/i18n';

export default function Home() {
  const [language, setLanguage] = useState<Language>('ko');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [colors, setColors] = useState<ColorInfo[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHex, setShowHex] = useState(true);
  const [showRgb, setShowRgb] = useState(false);

  const { t } = useTranslation(language);

  // Cleanup image URL on unmount or when image changes
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  const handleImageSelect = useCallback(async (file: File) => {
    // Cleanup previous image URL
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setIsAnalyzing(true);

    try {
      const extractedColors = await extractColors(file);
      setColors(extractedColors);
    } catch (error) {
      console.error('Failed to extract colors:', error);
      setColors([]);
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageUrl]);

  const handleReset = useCallback(() => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageFile(null);
    setImageUrl(null);
    setColors([]);
  }, [imageUrl]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('appTitle')}</h1>
            <p className="text-sm text-gray-500">{t('appDescription')}</p>
          </div>
          <LanguageToggle
            currentLanguage={language}
            onLanguageChange={setLanguage}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Upload section */}
        {!imageUrl ? (
          <div className="max-w-xl mx-auto">
            <ImageUploader
              onImageSelect={handleImageSelect}
              t={t}
              disabled={isAnalyzing}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Controls */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-wrap items-center gap-6">
                {/* Format toggles */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    {t('displayFormat')}:
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHex}
                      onChange={(e) => setShowHex(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">HEX</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showRgb}
                      onChange={(e) => setShowRgb(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">RGB</span>
                  </label>
                </div>

                {/* Change image button */}
                <button
                  onClick={handleReset}
                  className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {t('changeImage')}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original image */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-sm font-medium text-gray-700 mb-3">
                  {t('originalImage')}
                </h2>
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Uploaded image"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>

              {/* Color analysis */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-sm font-medium text-gray-700 mb-3">
                  {t('colorAnalysis')}
                </h2>
                {isAnalyzing ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3 text-gray-500">
                      <svg
                        className="animate-spin h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>{t('analyzing')}</span>
                    </div>
                  </div>
                ) : (
                  <ColorBar
                    colors={colors}
                    showHex={showHex}
                    showRgb={showRgb}
                    t={t}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
