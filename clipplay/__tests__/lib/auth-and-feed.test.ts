// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import { isAdminEmail, createSessionToken, verifySessionToken } from '@/lib/auth/google';
import { getFeedWindow, preloadFor } from '@/components/clip/feedWindow';
import { getMediaUrl, getThumbnailUrl } from '@/lib/clips/catalog';

afterEach(() => vi.unstubAllEnvs());

describe('admin allowlist', () => {
  it('only matches configured emails, case-insensitively', () => {
    vi.stubEnv('ADMIN_EMAILS', 'izowooi85@gmail.com');
    expect(isAdminEmail('izowooi85@gmail.com')).toBe(true);
    expect(isAdminEmail('IZOWOOI85@gmail.com ')).toBe(true);
    expect(isAdminEmail('ansaemi0@gmail.com')).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it('re-evaluates admin from the allowlist, not the token claim', async () => {
    vi.stubEnv('JWT_SECRET', 'x'.repeat(40));
    vi.stubEnv('ADMIN_EMAILS', 'izowooi85@gmail.com');
    const token = await createSessionToken({ email: 'other@gmail.com', name: 'o', picture: '', isAdmin: true });
    expect((await verifySessionToken(token))?.isAdmin).toBe(false);
  });

  it('refuses to issue sessions without a strong JWT_SECRET', async () => {
    vi.stubEnv('JWT_SECRET', '');
    await expect(createSessionToken({ email: 'a@b.c', name: '', picture: '', isAdmin: false })).rejects.toThrow();
  });
});

describe('feed window', () => {
  it('clamps the mounted range to the list', () => {
    expect(getFeedWindow(0, 280, 2)).toEqual({ start: 0, end: 2 });
    expect(getFeedWindow(150, 280, 2)).toEqual({ start: 148, end: 152 });
    expect(getFeedWindow(279, 280, 2)).toEqual({ start: 277, end: 279 });
    expect(getFeedWindow(0, 0, 2)).toEqual({ start: 0, end: -1 });
  });

  it('buffers only the current clip aggressively', () => {
    expect(preloadFor(0)).toBe('auto');
    expect(preloadFor(1)).toBe('metadata');
    expect(preloadFor(-1)).toBe('none');
    expect(preloadFor(2)).toBe('none');
  });
});

describe('media urls', () => {
  it('builds same-origin urls with thumbnail cache busting', () => {
    expect(getMediaUrl('videos/a.mp4')).toBe('/media/videos/a.mp4');
    expect(getThumbnailUrl({ thumbnailKey: 'thumbnails/a.jpg', updatedAt: '2026-01-01T00:00:00Z' })).toBe(
      '/media/thumbnails/a.jpg?v=2026-01-01T00%3A00%3A00Z'
    );
    expect(getThumbnailUrl({ updatedAt: 'x' })).toBeNull();
  });
});
