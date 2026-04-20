"use client";

import { useMemo } from "react";
import type { GuidedPromptState, VideoSettings } from "@/lib/types";
import { buildPrompt } from "@/lib/prompt";

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

export function GuidedPromptBuilder({
  guided,
  settings,
  onGuidedChange,
  onSettingsChange,
}: GuidedPromptBuilderProps) {
  const builtPrompt = useMemo(() => buildPrompt(guided), [guided]);

  const inputClass =
    "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder-foreground/30 focus:border-accent focus:outline-none";
  const selectClass =
    "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none";

  return (
    <div className="space-y-6">
      {/* 텍스트 입력 3개 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            주제/캐릭터 <span className="text-foreground/40 text-xs">(Subject)</span>
          </label>
          <input
            type="text"
            value={guided.subject}
            onChange={(e) => onGuidedChange({ subject: e.target.value })}
            placeholder="예: Iron Man, 귀여운 햄스터"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            행동/움직임 <span className="text-foreground/40 text-xs">(Action)</span>
          </label>
          <input
            type="text"
            value={guided.action}
            onChange={(e) => onGuidedChange({ action: e.target.value })}
            placeholder="예: flying through the city"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">
            배경/환경 <span className="text-foreground/40 text-xs">(Setting)</span>
          </label>
          <input
            type="text"
            value={guided.setting}
            onChange={(e) => onGuidedChange({ setting: e.target.value })}
            placeholder="예: Tokyo neon streets at night"
            className={inputClass}
          />
        </div>
      </div>

      {/* 셀렉트 4개 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">카메라 샷</label>
          <select
            value={guided.cameraShot}
            onChange={(e) => onGuidedChange({ cameraShot: e.target.value })}
            className={selectClass}
          >
            {CAMERA_SHOTS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">조명</label>
          <select
            value={guided.lighting}
            onChange={(e) => onGuidedChange({ lighting: e.target.value })}
            className={selectClass}
          >
            {LIGHTING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">분위기</label>
          <select
            value={guided.mood}
            onChange={(e) => onGuidedChange({ mood: e.target.value })}
            className={selectClass}
          >
            {MOOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1">비주얼 스타일</label>
          <select
            value={guided.visualStyle}
            onChange={(e) => onGuidedChange({ visualStyle: e.target.value })}
            className={selectClass}
          >
            {STYLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 프롬프트 미리보기 */}
      {builtPrompt && (
        <div className="rounded-lg border border-border bg-card/30 p-3">
          <p className="text-xs text-foreground/50 mb-1">생성될 프롬프트 미리보기</p>
          <p className="text-sm text-foreground/80 italic">&quot;{builtPrompt}&quot;</p>
        </div>
      )}

      {/* 비디오 설정 */}
      <div className="border-t border-border pt-4">
        <h3 className="text-xs font-semibold text-foreground/50 mb-3 uppercase tracking-wider">
          비디오 설정
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground/60 mb-1">Duration</label>
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
            <label className="block text-xs font-medium text-foreground/60 mb-1">Resolution</label>
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
            <label className="block text-xs font-medium text-foreground/60 mb-1">
              Aspect Ratio
            </label>
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
            <label className="block text-xs font-medium text-foreground/60 mb-1">Audio</label>
            <button
              onClick={() => onSettingsChange({ generateAudio: !settings.generateAudio })}
              className={`w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                settings.generateAudio
                  ? "border-accent bg-accent/20 text-accent"
                  : "border-border bg-card text-foreground/60"
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
