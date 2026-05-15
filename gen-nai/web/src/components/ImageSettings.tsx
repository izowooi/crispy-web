"use client";

import { RESOLUTIONS, SAMPLERS } from "@/lib/resolutions";
import type { SamplerId } from "@/lib/types";

export type SettingsState = {
  resolutionId: string;
  count: 1 | 2 | 3 | 4;
  steps: number;
  guidance: number;
  seed: number | "";
  sampler: SamplerId;
};

type Props = {
  state: SettingsState;
  onChange: (next: SettingsState) => void;
};

export function ImageSettings({ state, onChange }: Props) {
  const update = <K extends keyof SettingsState>(k: K, v: SettingsState[K]) =>
    onChange({ ...state, [k]: v });

  return (
    <div className="space-y-5 rounded-xl border border-[var(--color-bg-elev-2)] bg-[var(--color-bg-elev)] p-4">
      <div>
        <label htmlFor="res" className="mb-1 block text-sm font-semibold text-[var(--color-fg-dim)]">
          Image Settings
        </label>
        <select
          id="res"
          value={state.resolutionId}
          onChange={(e) => update("resolutionId", e.target.value)}
          className="w-full rounded-lg border border-[var(--color-bg-elev-2)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-none"
        >
          {(["Normal", "Large"] as const).map((g) => (
            <optgroup label={g} key={g}>
              {RESOLUTIONS.filter((r) => r.group === g).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-[var(--color-fg-dim)]">장수</label>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => update("count", n as 1 | 2 | 3 | 4)}
              className={`rounded-lg border px-3 py-2 font-semibold ${
                state.count === n
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
                  : "border-[var(--color-bg-elev-2)] bg-[var(--color-bg)] text-[var(--color-fg)] hover:border-[var(--color-fg-dim)]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="steps" className="mb-1 block text-sm font-semibold text-[var(--color-fg-dim)]">
            Steps: <span className="text-[var(--color-fg)]">{state.steps}</span>
          </label>
          <input
            id="steps"
            type="range"
            min={1}
            max={50}
            value={state.steps}
            onChange={(e) => update("steps", Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>
        <div>
          <label htmlFor="cfg" className="mb-1 block text-sm font-semibold text-[var(--color-fg-dim)]">
            Guidance: <span className="text-[var(--color-fg)]">{state.guidance}</span>
          </label>
          <input
            id="cfg"
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={state.guidance}
            onChange={(e) => update("guidance", Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="seed" className="mb-1 block text-sm font-semibold text-[var(--color-fg-dim)]">
            Seed
          </label>
          <input
            id="seed"
            type="number"
            inputMode="numeric"
            placeholder="비워두면 랜덤"
            value={state.seed}
            onChange={(e) => {
              const v = e.target.value;
              update("seed", v === "" ? "" : Number(v));
            }}
            className="w-full rounded-lg border border-[var(--color-bg-elev-2)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="sampler" className="mb-1 block text-sm font-semibold text-[var(--color-fg-dim)]">
            Sampler
          </label>
          <select
            id="sampler"
            value={state.sampler}
            onChange={(e) => update("sampler", e.target.value as SamplerId)}
            className="w-full rounded-lg border border-[var(--color-bg-elev-2)] bg-[var(--color-bg)] px-3 py-2 text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-none"
          >
            <optgroup label="Recommended">
              {SAMPLERS.filter((s) => s.recommended).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Other">
              {SAMPLERS.filter((s) => !s.recommended).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>
    </div>
  );
}
