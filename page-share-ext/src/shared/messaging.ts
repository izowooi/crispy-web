import type { Message } from "./types";

// Cross-browser request/response messaging, dependency-free.
//
// The onMessage reply path is irreconcilable between engines, so each uses its own native idiom:
//   - Chromium (Chrome/Edge/Opera): a listener must `return true` and call sendResponse() later;
//     a returned Promise is ignored.
//   - Safari/Firefox: a listener should RETURN a Promise. Safari's deferred sendResponse is
//     unreliable and runtime.lastError is not set when no listener exists, so the callback path
//     can hang the popup.
// Selection is by feature detection: Safari and Firefox expose the `browser` global; Chromium does
// not. This is the same signal webextension-polyfill uses — but we only need it for the reply
// branch, so a ~10-line shim beats pulling in the dependency (the polyfill is a no-op passthrough
// on Safari anyway, where the fix actually matters).

declare const browser: typeof chrome | undefined;
const PROMISE_NATIVE =
  typeof browser !== "undefined" && typeof browser.runtime !== "undefined";

type RequestHandler = (msg: Message) => Promise<Message> | undefined;

// Register a request handler. Return a Promise to reply; return undefined to ignore the message.
export function onRequest(handler: RequestHandler): void {
  chrome.runtime.onMessage.addListener(
    (msg: Message, _sender, sendResponse: (res: Message) => void) => {
      const result = handler(msg);
      if (!result) return false; // not handled by this listener
      if (PROMISE_NATIVE) return result; // Safari/Firefox: native promise reply
      result.then(sendResponse); // Chromium: deliver via the callback…
      return true; // …and keep the message channel open
    },
  );
}

// Send a request to the background service worker and await its typed reply.
export function sendRequest(msg: Message): Promise<Message> {
  return chrome.runtime.sendMessage(msg) as Promise<Message>;
}

// Send a request to a tab's content script and await its typed reply.
export function sendTabRequest(tabId: number, msg: Message): Promise<Message> {
  return chrome.tabs.sendMessage(tabId, msg) as Promise<Message>;
}
