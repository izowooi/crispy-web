// Procedural Web Audio API Sound & Music Engine inspired by prompt-motion.com
// Zero external audio asset dependencies; 100% synthesized in real time.

import type { Character, WorldTheme } from '../data/characters';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmPlaying: boolean = false;
  private bgmInterval: number | null = null;
  private currentTheme: WorldTheme = 'fantasy';
  private speakingCharId: string | null = null;

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopBgm();
      this.stopSpeech();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setTheme(theme: WorldTheme) {
    this.currentTheme = theme;
  }

  private isFantasyTheme(): boolean {
    return this.currentTheme === 'fantasy' || this.currentTheme === 'male_fantasy';
  }

  // Subtle mechanical-crystalline tick on card hover
  public playHoverTick(pitchOffset = 0) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const baseFreq = this.isFantasyTheme() ? 880 : 1046.5;
    osc.frequency.setValueAtTime(baseFreq + pitchOffset, now);
    osc.frequency.exponentialRampToValueAtTime((baseFreq + pitchOffset) * 1.4, now + 0.045);

    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Crisp UI click sound
  public playClick() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.065);
  }

  // Dramatic impact + harmonic shimmer when selecting a character in VS mode
  public playCardSelect() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Sub-bass kinetic impact
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, now);
    subOsc.frequency.exponentialRampToValueAtTime(36, now + 0.38);

    subGain.gain.setValueAtTime(0.22, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.42);

    // 2. Crystalline chord arpeggio
    const freqs =
      this.isFantasyTheme()
        ? [523.25, 659.25, 783.99, 1046.5, 1318.5] // C5 major pentatonic / fantasy harp shimmer
        : [587.33, 739.99, 880.0, 1108.73, 1479.98]; // Dmaj9 modern synth shimmer

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';

      const start = now + idx * 0.045;
      osc.frequency.setValueAtTime(f, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.055 / (1 + idx * 0.2), start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.58);
    });
  }

  // Kinetic round transition sound (Round of 64 -> 32 -> 16 -> 8 -> 4 -> Final)
  public playRoundTransition() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Rising whoosh + chord hit
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.35);
      filter.frequency.exponentialRampToValueAtTime(600, now + 1.1);

      osc.frequency.setValueAtTime(freq * 0.5, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.18);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.15 + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.2);
    });
  }

  // Grand Finale Winner Fanfare
  public playChampionFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const sequence = [
      { freq: 523.25, time: 0.0, dur: 0.25 },
      { freq: 659.25, time: 0.14, dur: 0.25 },
      { freq: 783.99, time: 0.28, dur: 0.25 },
      { freq: 1046.5, time: 0.42, dur: 0.9 },
      { freq: 1318.51, time: 0.56, dur: 1.2 },
      { freq: 1567.98, time: 0.7, dur: 1.5 },
    ];

    sequence.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';

      const start = now + time;
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.08, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + dur + 0.05);
    });
  }

  // Character Signature Quote TTS (Web Speech API + harmonic chime)
  public speakQuote(character: Character, onEnd?: () => void): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.playClick();
      onEnd?.();
      return false;
    }

    if (this.speakingCharId === character.id && window.speechSynthesis.speaking) {
      this.stopSpeech();
      onEnd?.();
      return false;
    }

    this.stopSpeech();
    this.playHoverTick(120);

    const cleanQuote = character.quote.replace(/[“”"]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanQuote);
    utterance.lang = 'ko-KR';

    const isMale =
      character.gender === 'male' ||
      character.theme === 'male_fantasy' ||
      character.theme === 'male_modern';

    // Tune pitch and rate by character gender & worldview
    if (isMale) {
      utterance.pitch = character.theme === 'male_fantasy' ? 0.82 : 0.88;
      utterance.rate = character.theme === 'male_fantasy' ? 0.94 : 0.98;
    } else {
      utterance.pitch = character.theme === 'fantasy' ? 1.14 : 1.18;
      utterance.rate = character.theme === 'fantasy' ? 0.96 : 1.02;
    }

    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('ko'));
    if (voices.length > 0) {
      utterance.voice = voices[0];
    }

    this.speakingCharId = character.id;
    utterance.onend = () => {
      this.speakingCharId = null;
      onEnd?.();
    };
    utterance.onerror = () => {
      this.speakingCharId = null;
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
    return true;
  }

  public stopSpeech() {
    this.speakingCharId = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public getSpeakingCharId(): string | null {
    return this.speakingCharId;
  }

  public toggleBgm(): boolean {
    if (this.bgmPlaying) {
      this.stopBgm();
      return false;
    } else {
      this.startBgm();
      return true;
    }
  }

  public isBgmPlaying(): boolean {
    return this.bgmPlaying;
  }

  public startBgm() {
    if (this.isMuted || this.bgmPlaying) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.bgmPlaying = true;
    let step = 0;

    const playAmbientNote = () => {
      if (!this.bgmPlaying || this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;

      const fantasyScale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 659.25];
      const modernScale = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 739.99];
      const scale =
        this.currentTheme === 'modern' || this.currentTheme === 'male_modern'
          ? modernScale
          : fantasyScale;

      const freq = scale[step % scale.length];
      step = (step + 2) % scale.length;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.018, now + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 3.3);
    };

    playAmbientNote();
    this.bgmInterval = window.setInterval(playAmbientNote, 2200);
  }

  public stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const soundEngine = new SoundEngine();

