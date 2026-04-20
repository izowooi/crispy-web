"use client";

import type { Preset } from "@/lib/types";
import { PRESETS } from "@/lib/presets";

interface PresetGridProps {
  onSelect: (preset: Preset) => void;
  selectedId: string | null;
}

export function PresetGrid({ onSelect, selectedId }: PresetGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => onSelect(preset)}
          className={`relative rounded-xl border-2 p-4 text-left transition-all hover:border-accent hover:bg-card ${
            selectedId === preset.id
              ? "border-accent bg-card shadow-lg shadow-accent/20"
              : "border-border bg-card/50"
          }`}
        >
          <div className="text-4xl mb-3 text-center">{preset.emoji}</div>
          <h3 className="font-bold text-sm mb-1 text-foreground">{preset.title}</h3>
          <p className="text-xs text-foreground/60 line-clamp-2">{preset.description}</p>
          {selectedId === preset.id && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
          )}
        </button>
      ))}
    </div>
  );
}
