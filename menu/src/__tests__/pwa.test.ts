import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { appleWebApp, buildManifest, SPLASH_SCREENS, splashFile } from "@/lib/pwa";

const publicDir = path.join(process.cwd(), "public");

describe("manifest", () => {
  it("기본 manifest는 홈에서 시작한다", () => {
    const m = buildManifest();
    expect(m).toMatchObject({ id: "/", start_url: "/", scope: "/", display: "standalone" });
  });

  it("어린이집 manifest는 그 어린이집 화면에서 시작한다", () => {
    const m = buildManifest({ id: "2q6vjpeh", name: "꿈땅" });
    expect(m).toMatchObject({ id: "/c/2q6vjpeh", start_url: "/c/2q6vjpeh", scope: "/", name: "꿈땅 식단", short_name: "꿈땅" });
  });

  it("긴 어린이집 이름도 짧은 이름은 12자로 자른다", () => {
    expect(buildManifest({ id: "abcd2345", name: "해님달님별님사랑어린이집" }).short_name).toHaveLength(12);
  });

  it("manifest가 가리키는 아이콘 파일이 실제로 있다", () => {
    for (const icon of buildManifest().icons) {
      expect(existsSync(path.join(publicDir, icon.src)), icon.src).toBe(true);
    }
  });

  it("maskable 아이콘이 따로 있다", () => {
    expect(buildManifest().icons.some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("iOS 시작 화면 이미지가 목록마다 실제 크기로 있다", () => {
    for (const screen of SPLASH_SCREENS) {
      const file = path.join(publicDir, splashFile(screen));
      expect(existsSync(file), file).toBe(true);
      const png = readFileSync(file);
      expect(png.readUInt32BE(16), file).toBe(screen[0] * screen[2]);
      expect(png.readUInt32BE(20), file).toBe(screen[1] * screen[2]);
    }
    expect(appleWebApp("t").startupImage).toHaveLength(SPLASH_SCREENS.length);
  });

  it("아이콘 PNG 크기가 manifest에 적은 값과 같다", () => {
    for (const icon of buildManifest().icons) {
      const png = readFileSync(path.join(publicDir, icon.src));
      const [w, h] = icon.sizes.split("x").map(Number);
      expect([png.readUInt32BE(16), png.readUInt32BE(20)], icon.src).toEqual([w, h]);
    }
  });

  it("오프라인 페이지와 홈 화면용 아이콘 파일이 있다", () => {
    expect(existsSync(path.join(publicDir, "offline.html"))).toBe(true);
    expect(existsSync(path.join(process.cwd(), "src/app/apple-icon.png"))).toBe(true);
  });
});

describe("service worker", () => {
  type Handler = (event: unknown) => void;

  function loadWorker() {
    const handlers: Record<string, Handler> = {};
    const self = {
      location: { origin: "https://bm.zowoo.uk" },
      addEventListener: (type: string, handler: Handler) => {
        handlers[type] = handler;
      },
      skipWaiting: vi.fn(),
      clients: { claim: vi.fn() },
    };
    vm.runInNewContext(readFileSync(path.join(publicDir, "sw.js"), "utf8"), {
      self,
      URL,
      caches: {
        open: vi.fn(() => Promise.resolve({ put: vi.fn(), addAll: vi.fn() })),
        match: vi.fn(() => Promise.resolve(undefined)),
        keys: vi.fn(() => Promise.resolve([])),
        delete: vi.fn(),
      },
      fetch: vi.fn(() => Promise.reject(new Error("offline"))),
    });
    return handlers;
  }

  function fetchEvent(url: string, init: { method?: string; mode?: string; headers?: Record<string, string> } = {}) {
    const headers = init.headers ?? {};
    const respondWith = vi.fn();
    return {
      respondWith,
      request: {
        url,
        method: init.method ?? "GET",
        mode: init.mode ?? "no-cors",
        headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
      },
    };
  }

  it("서버 액션(POST)은 건드리지 않는다", () => {
    const event = fetchEvent("https://bm.zowoo.uk/c/2q6vjpeh/manage", { method: "POST", mode: "navigate" });
    loadWorker().fetch(event);
    expect(event.respondWith).not.toHaveBeenCalled();
  });

  it("분석 API와 사진, RSC 요청은 건드리지 않는다", () => {
    const { fetch } = loadWorker();
    for (const [url, headers] of [
      ["https://bm.zowoo.uk/api/daycares/x/analyze", {}],
      ["https://bm.zowoo.uk/api/images/daycares/x/a.jpg", {}],
      ["https://bm.zowoo.uk/c/x?_rsc=abc", {}],
      ["https://bm.zowoo.uk/c/x", { rsc: "1" }],
      ["https://example.com/_next/static/a.js", {}],
    ] as const) {
      const event = fetchEvent(url, { headers });
      fetch(event);
      expect(event.respondWith, url).not.toHaveBeenCalled();
    }
  });

  it("페이지 이동과 정적 파일만 처리한다", () => {
    const { fetch } = loadWorker();
    const page = fetchEvent("https://bm.zowoo.uk/c/2q6vjpeh", { mode: "navigate" });
    const asset = fetchEvent("https://bm.zowoo.uk/_next/static/chunks/a.js");
    const other = fetchEvent("https://bm.zowoo.uk/some-other.json");
    fetch(page);
    fetch(asset);
    fetch(other);
    expect(page.respondWith).toHaveBeenCalledOnce();
    expect(asset.respondWith).toHaveBeenCalledOnce();
    expect(other.respondWith).not.toHaveBeenCalled();
  });
});
