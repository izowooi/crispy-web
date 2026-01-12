'use client';

import { useState, useCallback } from 'react';
import { ColorInfo, getContrastTextColor } from '@/lib/colorExtractor';
import { TranslationKey } from '@/lib/i18n';

interface ColorBarProps {
  colors: ColorInfo[];
  showHex: boolean;
  showRgb: boolean;
  t: (key: TranslationKey) => string;
}

export default function ColorBar({ colors, showHex, showRgb, t }: ColorBarProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = useCallback(async (color: ColorInfo, index: number) => {
    const textParts: string[] = [];
    if (showHex) textParts.push(color.hex);
    if (showRgb) textParts.push(`rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`);

    // 둘 다 해제된 경우 HEX 복사
    const textToCopy = textParts.length > 0 ? textParts.join(' ') : color.hex;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [showHex, showRgb]);

  if (colors.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        {t('noColors')}
      </div>
    );
  }

  const maxPercentage = Math.max(...colors.map(c => c.percentage));

  return (
    <div className="space-y-3">
      {colors.map((color, index) => {
        const textColor = getContrastTextColor(color.hex);
        const barWidth = (color.percentage / maxPercentage) * 100;
        const isCopied = copiedIndex === index;

        return (
          <div
            key={`${color.hex}-${index}`}
            className="group relative"
          >
            <button
              onClick={() => handleCopy(color, index)}
              className="w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
              title={t('clickToCopy')}
            >
              <div className="flex items-center gap-3">
                {/* Color bar */}
                <div
                  className="h-10 rounded-lg flex items-center justify-end px-3 transition-all duration-300 group-hover:shadow-md"
                  style={{
                    width: `${Math.max(barWidth, 15)}%`,
                    backgroundColor: color.hex,
                    minWidth: '60px'
                  }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: textColor }}
                  >
                    {color.percentage.toFixed(1)}%
                  </span>
                </div>

                {/* Color info */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {/* Color swatch */}
                  <div
                    className="w-6 h-6 rounded border border-gray-200 flex-shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />

                  {/* Color codes */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-700">
                    {showHex && (
                      <code className="font-mono">{color.hex}</code>
                    )}
                    {showRgb && (
                      <code className="font-mono text-gray-500">
                        rgb({color.rgb.r}, {color.rgb.g}, {color.rgb.b})
                      </code>
                    )}
                  </div>

                  {/* Copy indicator */}
                  <div className={`
                    ml-auto text-xs transition-opacity duration-200
                    ${isCopied ? 'opacity-100 text-green-600' : 'opacity-0 group-hover:opacity-100 text-gray-400'}
                  `}>
                    {isCopied ? t('copied') : t('clickToCopy')}
                  </div>
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
