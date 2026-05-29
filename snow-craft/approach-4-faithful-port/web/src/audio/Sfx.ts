// Sfx — faithful audio playback for the Snowcraft port.
//
// Loads MP3/OGG cues from `/assets/sounds/` defined by `/assets/manifest.json`
// and plays them on demand via `gotoAndPlay(label)` — the same call the AS
// gameplay code makes against `_root.sounds` (`spec/player.md §7.4`,
// `spec/main.md §3`).
//
// Faithful-port discipline: NO oscillator synthesis, NO procedural tones —
// every cue comes from the FFDec-extracted MP3 stream re-encoded by ffmpeg
// (see PROGRESS.md "Phase 4 — asset pipeline").
//
// Two playback paths are supported, picked at construction time:
//   1) Web Audio (`AudioContext.decodeAudioData`) — preferred. Lower latency,
//      handles overlapping voices cleanly (the `kids1/2/3` knockout cue can
//      play multiple times in quick succession).
//   2) HTMLAudioElement fallback — used when AudioContext is unavailable
//      (e.g. SSR / restricted iframes). Each `gotoAndPlay` rewinds + plays
//      the buffered <audio>.

export interface ManifestSoundEntry {
  mp3: string;
  ogg: string;
  swfCid: number;
  frameLabel: string;
  source: string;
  trigger: string;
  use: string;
}

export interface AssetManifest {
  description?: string;
  images: Record<string, unknown>;
  sounds: Record<string, ManifestSoundEntry>;
}

export type SfxLabel =
  | "step"
  | "goodbadugly"
  | "throw"
  | "longthrow"
  | "hit1"
  | "kids1"
  | "kids2"
  | "kids3"
  | "laugh"
  | "splat"
  | "birds"
  | "halaluja"
  | "laugh2";

/** SoundsLike adapter — plug-in compatible with `Snowball.SoundsLike`. */
export interface SoundsLike {
  /** Mirrors `_root.sounds.gotoAndPlay(label)` from the AS gameplay code. */
  gotoAndPlay(label: string): void;
  /** AS reads `_root.sounds._currentframe` to gate the step cue. We map the
   *  "currently-playing" notion onto frame 1 (idle) vs frame 2 (active) so
   *  callers (e.g. AI tickGreen) can replicate the AS:110 gating without
   *  knowing the underlying engine. */
  readonly _currentframe: number;
}

/**
 * Pick the codec to load. Browsers all support MP3; OGG is the
 * documented backup. We default to MP3 for fidelity (the source SWF
 * embedded MP3 streams).
 */
function pickCodec(entry: ManifestSoundEntry): { url: string; mime: string } {
  // Browsers reliably decode MP3 — keep it as the primary choice.
  return { url: entry.mp3, mime: "audio/mpeg" };
}

/**
 * AudioContext-backed Sfx engine. Decodes every cue once at startup, then
 * plays via short-lived `AudioBufferSourceNode`s so multiple voices can
 * overlap (matches AS where `gotoAndPlay` interrupts/restarts a single
 * `_root.sounds` clip — overlap differs from the SWF, but is the closest
 * faithful behaviour without modelling the timeline).
 */
class WebAudioSfx implements SoundsLike {
  private ac: AudioContext;
  private buffers: Map<string, AudioBuffer> = new Map();
  private playingUntil = 0;

  constructor(ac: AudioContext) {
    this.ac = ac;
  }

  static async create(
    manifest: AssetManifest,
    baseUrl: string,
    fetchImpl: typeof fetch
  ): Promise<WebAudioSfx> {
    const Ctor: typeof AudioContext | undefined =
      typeof AudioContext !== "undefined"
        ? AudioContext
        : (globalThis as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
    if (!Ctor) {
      throw new Error("Sfx: AudioContext unavailable");
    }
    const ac = new Ctor();
    const sfx = new WebAudioSfx(ac);
    const entries = Object.entries(manifest.sounds);
    await Promise.all(
      entries.map(async ([label, entry]) => {
        const { url } = pickCodec(entry);
        const res = await fetchImpl(baseUrl + url);
        if (!res.ok) {
          throw new Error(
            `Sfx: failed to fetch ${label}: ${res.status} ${res.statusText}`
          );
        }
        const arr = await res.arrayBuffer();
        const buf = await ac.decodeAudioData(arr.slice(0));
        sfx.buffers.set(label, buf);
      })
    );
    return sfx;
  }

  get _currentframe(): number {
    // 1 = idle (matches AS:110 "step" gate), 2 = a cue is currently playing.
    return performance.now() < this.playingUntil ? 2 : 1;
  }

  gotoAndPlay(label: string): void {
    const buf = this.buffers.get(label);
    if (!buf) return;
    // Resume context on first use — autoplay policies require a gesture.
    if (this.ac.state === "suspended") {
      void this.ac.resume();
    }
    const src = this.ac.createBufferSource();
    src.buffer = buf;
    src.connect(this.ac.destination);
    src.start(0);
    this.playingUntil = performance.now() + buf.duration * 1000;
  }
}

/**
 * HTMLAudioElement fallback. Each label owns one preloaded <audio>; replay is
 * `currentTime = 0; play()`. Fewer overlapping voices than Web Audio, but
 * works in any browser without user-gesture decoding.
 */
class HtmlAudioSfx implements SoundsLike {
  private audios: Map<string, HTMLAudioElement> = new Map();
  private playingUntil = 0;

  static async create(
    manifest: AssetManifest,
    baseUrl: string
  ): Promise<HtmlAudioSfx> {
    const sfx = new HtmlAudioSfx();
    const entries = Object.entries(manifest.sounds);
    await Promise.all(
      entries.map(([label, entry]) => {
        return new Promise<void>((resolve) => {
          const a = new Audio(baseUrl + pickCodec(entry).url);
          a.preload = "auto";
          const done = () => {
            sfx.audios.set(label, a);
            resolve();
          };
          a.addEventListener("canplaythrough", done, { once: true });
          a.addEventListener("error", done, { once: true });
          // Some browsers won't fire canplaythrough until played — give it a
          // best-effort load and resolve anyway after a short timeout so the
          // boot doesn't hang on a transient codec hiccup.
          setTimeout(done, 1500);
        });
      })
    );
    return sfx;
  }

  get _currentframe(): number {
    return performance.now() < this.playingUntil ? 2 : 1;
  }

  gotoAndPlay(label: string): void {
    const a = this.audios.get(label);
    if (!a) return;
    try {
      a.currentTime = 0;
    } catch {
      // currentTime can throw if metadata isn't ready — ignore.
    }
    void a.play().catch(() => {
      // Autoplay rejection is expected before user gesture.
    });
    const dur = isFinite(a.duration) ? a.duration * 1000 : 250;
    this.playingUntil = performance.now() + dur;
  }
}

/**
 * Public Sfx façade. Use `Sfx.create()` to build either the WebAudio or
 * HTMLAudio path depending on the runtime.
 */
export class Sfx implements SoundsLike {
  private inner: SoundsLike;

  constructor(inner: SoundsLike) {
    this.inner = inner;
  }

  get _currentframe(): number {
    return this.inner._currentframe;
  }

  gotoAndPlay(label: string): void {
    this.inner.gotoAndPlay(label);
  }

  static async create(
    baseUrl = "/assets/",
    fetchImpl: typeof fetch = fetch
  ): Promise<Sfx> {
    const res = await fetchImpl(baseUrl + "manifest.json");
    if (!res.ok) {
      throw new Error(
        `Sfx: failed to load manifest (${res.status} ${res.statusText})`
      );
    }
    const manifest = (await res.json()) as AssetManifest;
    const baseSounds = baseUrl;
    const hasAudioContext =
      typeof AudioContext !== "undefined" ||
      typeof (globalThis as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext !== "undefined";
    if (hasAudioContext) {
      try {
        const inner = await WebAudioSfx.create(manifest, baseSounds, fetchImpl);
        return new Sfx(inner);
      } catch {
        // Fall through to HTMLAudio path on any decode/setup failure.
      }
    }
    const inner = await HtmlAudioSfx.create(manifest, baseSounds);
    return new Sfx(inner);
  }
}
