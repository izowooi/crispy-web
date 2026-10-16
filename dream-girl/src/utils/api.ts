import type { Character, WorldTheme } from '../data/characters';

export interface CharacterWinRecord {
  wins: number;
  matches: number;
  championships: number;
}

export interface RecentChampionItem {
  id: number;
  winnerId: string;
  runnerUpId: string;
  theme: WorldTheme;
  roundSize: number;
  createdAt: string;
}

export interface GlobalStatsResponse {
  ok: boolean;
  source: 'd1' | 'fallback';
  totalTournaments: number;
  totalMatches: number;
  stats: Record<string, CharacterWinRecord>;
  recentChampions: RecentChampionItem[];
}

export interface SharedTournamentPayload {
  id?: string;
  winnerId: string;
  runnerUpId?: string;
  semifinalistIds: string[];
  theme: WorldTheme;
  roundSize: number;
  history: {
    roundSize: number;
    matchNumber: number;
    leftId: string;
    rightId: string;
    winnerId: string;
  }[];
  nickname?: string;
  createdAt?: string;
}

export async function fetchGlobalStats(): Promise<GlobalStatsResponse | null> {
  try {
    const res = await fetch('/api/stats', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as GlobalStatsResponse;
  } catch {
    return null;
  }
}

export async function recordGlobalVote(payload: {
  winnerId: string;
  loserId: string;
  theme: WorldTheme;
  roundSize: number;
}): Promise<void> {
  try {
    await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking fallback for offline/local
  }
}

export async function recordGlobalTournamentComplete(payload: {
  winnerId: string;
  runnerUpId?: string;
  semifinalistIds: string[];
  theme: WorldTheme;
  roundSize: number;
}): Promise<void> {
  try {
    await fetch('/api/tournament/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking fallback
  }
}

export async function createSharedResult(
  payload: SharedTournamentPayload
): Promise<{ ok: boolean; id?: string; url?: string }> {
  try {
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { ok: boolean; id?: string };
    if (data.ok && data.id) {
      const url = `${window.location.origin}/?share=${encodeURIComponent(data.id)}`;
      return { ok: true, id: data.id, url };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function fetchSharedResult(
  shareId: string
): Promise<SharedTournamentPayload | null> {
  try {
    const res = await fetch(`/api/share/${encodeURIComponent(shareId)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok: boolean; share?: SharedTournamentPayload };
    return data.ok && data.share ? data.share : null;
  } catch {
    return null;
  }
}

// High-resolution Tarot / Magazine Winner Card PNG exporter using HTML5 Canvas 2D
export async function exportWinnerPhotoCard(
  winner: Character,
  themeName: string,
  roundSize: number
): Promise<boolean> {
  try {
    const width = 1080;
    const height = 1520;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    // 1. Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#07070d');
    bgGrad.addColorStop(0.55, '#0e0e18');
    bgGrad.addColorStop(1, '#050509');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Load character portrait
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = winner.image;
    });

    // Draw portrait inside upper frame (x: 64, y: 120, w: 952, h: 1020)
    const frameX = 64;
    const frameY = 120;
    const frameW = width - 128;
    const frameH = 1020;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameW, frameH, 32);
    ctx.clip();

    // Aspect-fill portrait
    const scale = Math.max(frameW / img.width, frameH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = frameX + (frameW - drawW) / 2;
    const drawY = frameY + (frameH - drawH) * 0.25;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Bottom vignette inside portrait frame
    const vig = ctx.createLinearGradient(0, frameY + frameH * 0.45, 0, frameY + frameH);
    vig.addColorStop(0, 'rgba(7,7,13,0)');
    vig.addColorStop(0.75, 'rgba(7,7,13,0.78)');
    vig.addColorStop(1, 'rgba(7,7,13,0.97)');
    ctx.fillStyle = vig;
    ctx.fillRect(frameX, frameY, frameW, frameH);
    ctx.restore();

    // 3. Outer Tarot / Magazine Border
    ctx.strokeStyle = winner.accentColor || '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(frameX, frameY, frameW, frameH, 32);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(32, 32, width - 64, height - 64, 42);
    ctx.stroke();

    // 4. Top Header Bar
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 22px "Cinzel", "Space Grotesk", serif';
    ctx.fillText('MUSE CUP : GRAND CHAMPION TAROT EDITION', 68, 82);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '600 20px "Space Grotesk", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${roundSize}강 토너먼트 우승 · ${new Date().toLocaleDateString('ko-KR')}`, width - 68, 82);
    ctx.textAlign = 'left';

    // 5. Character Title & Name over lower portrait
    ctx.fillStyle = winner.accentColor || '#fbbf24';
    ctx.font = '700 24px "Pretendard", sans-serif';
    ctx.fillText(`${winner.badgeText}  ·  ${winner.title}`, 104, 945);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px "Noto Serif KR", "Pretendard", serif';
    ctx.fillText(winner.name, 104, 1025);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '600 24px "Cinzel", sans-serif';
    ctx.fillText(`${winner.englishName.toUpperCase()}  |  ${winner.faction} · ${winner.role} · ${winner.mbti}`, 104, 1072);

    // 6. Quote Box below frame
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.roundRect(64, 1170, width - 128, 130, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'italic 600 25px "Noto Serif KR", "Pretendard", serif';
    const quoteText = winner.quote.length > 74 ? winner.quote.slice(0, 74) + '…”' : winner.quote;
    ctx.fillText(quoteText, 96, 1245, width - 192);

    // 7. 5-Stat Badges
    const statItems = [
      { label: 'CHARM 매력', val: winner.stats.charm },
      { label: 'AFFECTION 애정', val: winner.stats.affection },
      { label: 'INTELLECT 지성', val: winner.stats.intellect },
      { label: 'AURA 기품', val: winner.stats.aura },
      { label: 'MYSTERY 신비', val: winner.stats.mystery },
    ];
    const statW = (width - 128 - 48) / 5;
    statItems.forEach((st, idx) => {
      const sx = 64 + idx * (statW + 12);
      const sy = 1326;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.roundRect(sx, sy, statW, 92, 16);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '600 16px "Space Grotesk", "Pretendard", sans-serif';
      ctx.fillText(st.label, sx + 18, sy + 34);

      ctx.fillStyle = winner.accentColor || '#fbbf24';
      ctx.font = '800 32px "Space Grotesk", sans-serif';
      ctx.fillText(String(st.val), sx + 18, sy + 74);
    });

    // 8. Footer Branding
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '600 19px "Space Grotesk", "Pretendard", sans-serif';
    ctx.fillText(`WORLDVIEW : ${themeName}`, 68, 1464);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('https://dg.zowoo.uk', width - 68, 1464);
    ctx.textAlign = 'left';

    // Trigger download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `muse-cup-winner-${winner.id}-${winner.englishName.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('Failed to export photo card:', err);
    return false;
  }
}
