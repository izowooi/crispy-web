"use client";

import { useState, useEffect } from "react";
import type { GuidedPromptState, VideoSettings } from "@/lib/types";

const CAMERA_SHOTS = [
  { value: "", label: "선택 안함" },
  { value: "wide shot", label: "Wide shot (넓은 샷)" },
  { value: "medium shot", label: "Medium shot (미디엄 샷)" },
  { value: "close-up", label: "Close-up (클로즈업)" },
  { value: "aerial bird's eye shot", label: "Aerial/Bird's eye (항공 샷)" },
  { value: "low angle shot", label: "Low angle (로우 앵글)" },
  { value: "tracking shot", label: "Tracking shot (트래킹)" },
  { value: "dolly zoom", label: "Dolly zoom (돌리 줌)" },
  { value: "over-the-shoulder shot", label: "Over-the-shoulder" },
];

const LIGHTING_OPTIONS = [
  { value: "", label: "선택 안함" },
  { value: "golden hour", label: "Golden hour (황금빛 노을)" },
  { value: "dramatic shadows", label: "Dramatic shadows (극적인 그림자)" },
  { value: "soft diffused", label: "Soft diffused (부드러운 확산광)" },
  { value: "neon cyberpunk", label: "Neon/Cyberpunk (네온)" },
  { value: "moonlight", label: "Moonlight (달빛)" },
  { value: "studio lighting", label: "Studio lighting (스튜디오)" },
  { value: "cinematic", label: "Cinematic (시네마틱)" },
];

const MOOD_OPTIONS = [
  { value: "", label: "선택 안함" },
  { value: "epic action-packed", label: "Epic/Action-packed (서사적/액션)" },
  { value: "mysterious", label: "Mysterious (신비로운)" },
  { value: "cozy warm", label: "Cozy/Warm (아늑한)" },
  { value: "playful whimsical", label: "Playful/Whimsical (장난스러운)" },
  { value: "romantic", label: "Romantic (로맨틱)" },
  { value: "tense dramatic", label: "Tense/Dramatic (긴장감)" },
  { value: "peaceful serene", label: "Peaceful/Serene (평화로운)" },
];

const STYLE_OPTIONS = [
  { value: "", label: "선택 안함" },
  { value: "cinematic realism", label: "Cinematic realism (시네마틱 리얼리즘)" },
  { value: "anime style", label: "Anime (애니메이션)" },
  { value: "soft bokeh", label: "Soft bokeh (아웃포커싱)" },
  { value: "painterly artistic", label: "Painterly/Artistic (회화적)" },
  { value: "documentary", label: "Documentary (다큐멘터리)" },
  { value: "fantasy magical", label: "Fantasy/Magical (판타지)" },
];

const DURATION_OPTIONS = [
  { value: 5, label: "5초" },
  { value: 7, label: "7초" },
  { value: 8, label: "8초" },
  { value: 10, label: "10초" },
  { value: -1, label: "자동 (모델이 선택)" },
];

const RESOLUTION_OPTIONS = [
  { value: "720p", label: "720p (고화질)" },
  { value: "480p", label: "480p (표준)" },
];

const ASPECT_RATIO_OPTIONS = [
  { value: "16:9", label: "16:9 (와이드스크린)" },
  { value: "9:16", label: "9:16 (세로형/모바일)" },
  { value: "1:1", label: "1:1 (정사각형)" },
  { value: "4:3", label: "4:3 (클래식)" },
  { value: "3:4", label: "3:4 (세로 클래식)" },
  { value: "21:9", label: "21:9 (시네마스코프)" },
  { value: "adaptive", label: "Adaptive (자동 선택)" },
];

interface GuidedPromptBuilderProps {
  guided: GuidedPromptState;
  settings: VideoSettings;
  onGuidedChange: (updates: Partial<GuidedPromptState>) => void;
  onSettingsChange: (updates: Partial<VideoSettings>) => void;
}

// 드롭박스 선택 또는 직접 입력을 모두 지원하는 콤보 컴포넌트
function ComboSelect({
  value,
  options,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  placeholder?: string;
  className: string;
}) {
  const inList = options.some((o) => o.value === value);
  const [customMode, setCustomMode] = useState(!inList && value !== "");

  // 외부(프리셋 로드)에서 목록에 있는 값으로 바뀌면 드롭박스 모드로 복귀
  useEffect(() => {
    if (options.some((o) => o.value === value) || value === "") {
      setCustomMode(false);
    }
  }, [value, options]);

  if (customMode) {
    return (
      <div className="flex gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          placeholder={placeholder ?? "직접 입력..."}
          className={`${className} flex-1 min-w-0`}
        />
        <button
          type="button"
          onClick={() => {
            setCustomMode(false);
            onChange("");
          }}
          className="shrink-0 rounded-lg border border-border px-2 text-xs text-muted hover:text-foreground transition-colors"
          title="목록으로 돌아가기"
        >
          ↩
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === "__custom__") {
          setCustomMode(true);
          onChange("");
        } else {
          onChange(e.target.value);
        }
      }}
      className={className}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
      <option value="__custom__">✏️ 직접 입력...</option>
    </select>
  );
}

export function GuidedPromptBuilder({
  guided,
  settings,
  onGuidedChange,
  onSettingsChange,
}: GuidedPromptBuilderProps) {
  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted focus:border-accent focus:outline-none transition-colors";
  const selectClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none transition-colors";

  return (
    <div className="space-y-5">
      {/* 텍스트 입력 3개 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            주제/캐릭터 <span className="text-muted text-xs">(Subject)</span>
          </label>
          <input
            type="text"
            value={guided.subject}
            onChange={(e) => onGuidedChange({ subject: e.target.value })}
            placeholder="예: 아이언맨, 귀여운 햄스터"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            행동/스토리 <span className="text-muted text-xs">(Action)</span>
          </label>
          <input
            type="text"
            value={guided.action}
            onChange={(e) => onGuidedChange({ action: e.target.value })}
            placeholder="예: 도시 위를 날아다니는"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            배경/환경 <span className="text-muted text-xs">(Setting)</span>
          </label>
          <input
            type="text"
            value={guided.setting}
            onChange={(e) => onGuidedChange({ setting: e.target.value })}
            placeholder="예: 도쿄 네온 거리, 우주"
            className={inputClass}
          />
        </div>
      </div>

      {/* 드롭박스 + 직접 입력 4개 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">카메라 샷</label>
          <ComboSelect
            value={guided.cameraShot}
            options={CAMERA_SHOTS}
            onChange={(v) => onGuidedChange({ cameraShot: v })}
            placeholder="예: drone shot..."
            className={selectClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">조명</label>
          <ComboSelect
            value={guided.lighting}
            options={LIGHTING_OPTIONS}
            onChange={(v) => onGuidedChange({ lighting: v })}
            placeholder="예: blue hour..."
            className={selectClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">분위기</label>
          <ComboSelect
            value={guided.mood}
            options={MOOD_OPTIONS}
            onChange={(v) => onGuidedChange({ mood: v })}
            placeholder="예: melancholic..."
            className={selectClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">비주얼 스타일</label>
          <ComboSelect
            value={guided.visualStyle}
            options={STYLE_OPTIONS}
            onChange={(v) => onGuidedChange({ visualStyle: v })}
            placeholder="예: oil painting..."
            className={selectClass}
          />
        </div>
      </div>

      {/* 비디오 설정 */}
      <div className="border-t border-border pt-4">
        <h3 className="text-xs font-semibold text-muted mb-3 uppercase tracking-wider">
          비디오 설정
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Duration</label>
            <select
              value={settings.duration}
              onChange={(e) =>
                onSettingsChange({ duration: Number(e.target.value) as VideoSettings["duration"] })
              }
              className={selectClass}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Resolution</label>
            <select
              value={settings.resolution}
              onChange={(e) =>
                onSettingsChange({ resolution: e.target.value as VideoSettings["resolution"] })
              }
              className={selectClass}
            >
              {RESOLUTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Aspect Ratio</label>
            <select
              value={settings.aspectRatio}
              onChange={(e) =>
                onSettingsChange({ aspectRatio: e.target.value as VideoSettings["aspectRatio"] })
              }
              className={selectClass}
            >
              {ASPECT_RATIO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Audio</label>
            <button
              onClick={() => onSettingsChange({ generateAudio: !settings.generateAudio })}
              className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                settings.generateAudio
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-background text-muted"
              }`}
            >
              {settings.generateAudio ? "🔊 오디오 켜짐" : "🔇 오디오 꺼짐"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
