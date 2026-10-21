import { useEffect, useRef, useState } from "react";
import { EMOTES, type EmoteId } from "../../shared/types";
import { IconSmile } from "./Icons";

/** Hearthstone-style quick emotes: six fixed reactions instead of chat. */
export function EmotePicker({ onPick, muted, onToggleMute }: { onPick: (id: EmoteId) => void; muted: boolean; onToggleMute: () => void }) {
  const [open, setOpen] = useState(false);
  const [cooling, setCooling] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  const pick = (id: EmoteId) => {
    onPick(id);
    setOpen(false);
    setCooling(true);
    setTimeout(() => setCooling(false), 2500);
  };

  return (
    <div className="emote-picker" ref={ref}>
      <button className={`icon-btn emote-toggle${open ? " active" : ""}`} disabled={cooling} onClick={() => setOpen((o) => !o)} aria-label="감정 표현">
        <IconSmile />
      </button>
      {open && (
        <div className="emote-menu" role="menu">
          {EMOTES.map((e) => (
            <button key={e.id} role="menuitem" className="emote-option" onClick={() => pick(e.id)}>
              <span className="emote-emoji">{e.emoji}</span>
              <span>{e.text}</span>
            </button>
          ))}
          <button className="emote-mute" onClick={onToggleMute}>
            {muted ? "상대 감정 표현 다시 보기" : "상대 감정 표현 숨기기"}
          </button>
        </div>
      )}
    </div>
  );
}
