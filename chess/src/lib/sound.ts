// Synthesized so the app ships without audio assets.
let ctx: AudioContext | null = null;
let muted = localStorageGet("chess.muted") === "1";

function localStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function isMuted() {
  return muted;
}

export function setMuted(v: boolean) {
  muted = v;
  try {
    localStorage.setItem("chess.muted", v ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0) {
  if (muted) return;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sounds = {
  move: () => tone(420, 0.08, "triangle", 0.35),
  capture: () => {
    tone(300, 0.1, "square", 0.12);
    tone(180, 0.12, "triangle", 0.3, 0.02);
  },
  check: () => {
    tone(880, 0.09, "sine", 0.2);
    tone(660, 0.12, "sine", 0.18, 0.08);
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, "sine", 0.22, i * 0.11)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.26, "sine", 0.2, i * 0.14)),
  emote: () => [700, 940].forEach((f, i) => tone(f, 0.07, "sine", 0.16, i * 0.06)),
  notify: () => [660, 880].forEach((f, i) => tone(f, 0.12, "sine", 0.2, i * 0.1)),
  draw: () => [440, 440].forEach((f, i) => tone(f, 0.18, "sine", 0.18, i * 0.16)),
};
