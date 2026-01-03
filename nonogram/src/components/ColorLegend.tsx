'use client';

import { getColorHex, getColorName, getTextColor } from '@/lib/colors';

interface ColorLegendProps {
  colors: number[];
}

export function ColorLegend({ colors }: ColorLegendProps) {
  if (colors.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-4 mt-4">
      <span className="text-sm font-medium text-gray-600">색상:</span>
      {colors.map((color) => (
        <div key={color} className="flex items-center gap-1">
          <div
            className="w-4 h-4 border border-gray-400"
            style={{ backgroundColor: getColorHex(color) }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: getTextColor(color) }}
          >
            {getColorName(color)}
          </span>
        </div>
      ))}
    </div>
  );
}
