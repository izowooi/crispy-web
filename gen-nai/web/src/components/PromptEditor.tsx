"use client";

type Props = {
  prompt: string;
  negativePrompt: string;
  onPromptChange: (s: string) => void;
  onNegativeChange: (s: string) => void;
  onSurprise: () => void;
};

export function PromptEditor({
  prompt,
  negativePrompt,
  onPromptChange,
  onNegativeChange,
  onSurprise,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="prompt" className="text-sm font-semibold text-[var(--color-fg-dim)]">
            Prompt
          </label>
          <button
            type="button"
            onClick={onSurprise}
            className="rounded-md bg-[var(--color-accent)] px-3 py-1 text-xs font-medium text-black hover:opacity-90"
          >
            🎲 Surprise me
          </button>
        </div>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          rows={5}
          placeholder="hu_tao_(genshin_impact), 1girl, masterpiece, ..."
          className="w-full rounded-lg border border-[var(--color-bg-elev-2)] bg-[var(--color-bg-elev)] px-3 py-2 text-[var(--color-fg)] placeholder:text-[var(--color-fg-dim)] focus:border-[var(--color-accent)] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="uc" className="mb-1 block text-sm font-semibold text-[var(--color-fg-dim)]">
          Undesired Content
        </label>
        <textarea
          id="uc"
          value={negativePrompt}
          onChange={(e) => onNegativeChange(e.target.value)}
          rows={3}
          placeholder="lowres, bad anatomy, ..."
          className="w-full rounded-lg border border-[var(--color-bg-elev-2)] bg-[var(--color-bg-elev)] px-3 py-2 text-[var(--color-fg)] placeholder:text-[var(--color-fg-dim)] focus:border-[var(--color-accent)] focus:outline-none"
        />
      </div>
    </div>
  );
}
