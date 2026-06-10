import type { Message, CaptureResult } from "../shared/types";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function inlineImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img[src]"));
  await Promise.allSettled(
    images.map(async (img) => {
      const src = img.getAttribute("src") ?? "";
      if (!src || src.startsWith("data:")) return;
      try {
        const resp = await fetch(src);
        const blob = await resp.blob();
        img.src = await blobToDataUrl(blob);
      } catch {
        // Keep original src on fetch failure
      }
    }),
  );
}

async function inlineCss(root: HTMLElement): Promise<void> {
  const links = Array.from(
    root.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'),
  );
  await Promise.allSettled(
    links.map(async (link) => {
      const href = link.getAttribute("href") ?? "";
      if (!href) return;
      try {
        const resp = await fetch(href);
        const css = await resp.text();
        const style = document.createElement("style");
        style.textContent = css;
        link.replaceWith(style);
      } catch {
        // Leave link tag intact on fetch failure
      }
    }),
  );
}

function removeScripts(root: HTMLElement): void {
  root.querySelectorAll("script").forEach((s) => s.remove());
  root.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes)
      .filter((attr) => attr.name.startsWith("on"))
      .forEach((attr) => el.removeAttribute(attr.name));
  });
}

async function capturePage(): Promise<CaptureResult> {
  const clone = document.documentElement.cloneNode(true) as HTMLElement;
  removeScripts(clone);
  await inlineCss(clone);
  await inlineImages(clone);
  const html = `<!DOCTYPE html>\n<html>${clone.innerHTML}</html>`;
  return {
    title: document.title,
    url: location.href,
    html,
  };
}

chrome.runtime.onMessage.addListener(
  (msg: Message, _sender, sendResponse) => {
    if (msg.type !== "CAPTURE_PAGE") return false;

    capturePage()
      .then((payload) => sendResponse({ type: "CAPTURE_DONE", payload }))
      .catch((err: Error) =>
        sendResponse({ type: "CAPTURE_ERROR", message: err.message }),
      );

    return true; // keep message channel open for async response
  },
);
