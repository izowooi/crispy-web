import { describe, it, expect, vi, afterEach } from "vitest";
import type { Message } from "../shared/types";

// The shim reads `typeof browser` at module-load time to pick the reply idiom, so each test sets
// the globals it needs and re-imports the module via vi.resetModules() + dynamic import().

type Listener = (msg: Message, sender: unknown, sendResponse: (r: Message) => void) => unknown;

function installChrome() {
  const listeners: Listener[] = [];
  const chromeMock = {
    runtime: {
      onMessage: { addListener: (fn: Listener) => listeners.push(fn) },
      sendMessage: vi.fn().mockResolvedValue({ type: "UPLOAD_DONE", share_url: "https://x/y.html" }),
    },
    tabs: {
      sendMessage: vi.fn().mockResolvedValue({ type: "CAPTURE_DONE", payload: { title: "t", url: "u", html: "h" } }),
    },
  };
  (globalThis as unknown as { chrome: unknown }).chrome = chromeMock;
  return { chromeMock, listeners };
}

const PING = { type: "CAPTURE_PAGE" } as Message;
const PONG = { type: "CAPTURE_DONE", payload: { title: "t", url: "u", html: "h" } } as Message;

afterEach(() => {
  delete (globalThis as Record<string, unknown>).chrome;
  delete (globalThis as Record<string, unknown>).browser;
  vi.resetModules();
});

describe("messaging shim — Chromium (no `browser` global)", () => {
  it("matching message: returns true and delivers via sendResponse asynchronously", async () => {
    const { listeners } = installChrome();
    const { onRequest } = await import("../shared/messaging");
    onRequest((msg) => (msg.type === "CAPTURE_PAGE" ? Promise.resolve(PONG) : undefined));

    const sendResponse = vi.fn();
    const ret = listeners[0](PING, {}, sendResponse);
    expect(ret).toBe(true); // keeps the channel open
    await Promise.resolve();
    await Promise.resolve();
    expect(sendResponse).toHaveBeenCalledWith(PONG);
  });

  it("non-matching message: returns false and never responds", async () => {
    const { listeners } = installChrome();
    const { onRequest } = await import("../shared/messaging");
    onRequest((msg) => (msg.type === "CAPTURE_PAGE" ? Promise.resolve(PONG) : undefined));

    const sendResponse = vi.fn();
    const ret = listeners[0]({ type: "UPLOAD_DONE", share_url: "z" } as Message, {}, sendResponse);
    expect(ret).toBe(false);
    expect(sendResponse).not.toHaveBeenCalled();
  });
});

describe("messaging shim — Safari/Firefox (`browser` global present)", () => {
  it("matching message: returns the Promise and does NOT rely on sendResponse", async () => {
    const { listeners } = installChrome();
    (globalThis as Record<string, unknown>).browser = { runtime: {} };
    const { onRequest } = await import("../shared/messaging");
    onRequest((msg) => (msg.type === "CAPTURE_PAGE" ? Promise.resolve(PONG) : undefined));

    const sendResponse = vi.fn();
    const ret = listeners[0](PING, {}, sendResponse);
    expect(ret).toBeInstanceOf(Promise);
    await expect(ret as Promise<Message>).resolves.toEqual(PONG);
    expect(sendResponse).not.toHaveBeenCalled();
  });
});

describe("messaging shim — senders", () => {
  it("sendRequest delegates to chrome.runtime.sendMessage and resolves the reply", async () => {
    const { chromeMock } = installChrome();
    const { sendRequest } = await import("../shared/messaging");
    await expect(sendRequest(PONG)).resolves.toEqual({ type: "UPLOAD_DONE", share_url: "https://x/y.html" });
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(PONG);
  });

  it("sendTabRequest delegates to chrome.tabs.sendMessage with the tab id", async () => {
    const { chromeMock } = installChrome();
    const { sendTabRequest } = await import("../shared/messaging");
    await sendTabRequest(7, PING);
    expect(chromeMock.tabs.sendMessage).toHaveBeenCalledWith(7, PING);
  });
});
