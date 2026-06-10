import type { Message, CaptureResult } from "../shared/types";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Resolve relative url() references inside CSS text to absolute, relative to cssBaseUrl
function fixCssUrls(css: string, cssBaseUrl: string): string {
  return css.replace(
    /url\(\s*(['"]?)(?!data:|https?:|\/\/)([^'"\s)]+)\1\s*\)/gi,
    (match, q, relativePath) => {
      try {
        return `url(${q}${new URL(relativePath, cssBaseUrl).href}${q})`;
      } catch {
        return match;
      }
    },
  );
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
  const pageBaseUrl = location.href;
  const links = Array.from(
    root.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'),
  );
  await Promise.allSettled(
    links.map(async (link) => {
      const href = link.getAttribute("href") ?? "";
      if (!href) return;
      // Resolve relative href to absolute before fetching
      const absoluteHref = new URL(href, pageBaseUrl).href;
      try {
        const resp = await fetch(absoluteHref);
        let css = await resp.text();
        // Fix relative url() paths inside fetched CSS
        css = fixCssUrls(css, absoluteHref);
        const style = document.createElement("style");
        style.textContent = css;
        link.replaceWith(style);
      } catch {
        // Update href to absolute so it can still load from the archived page
        link.href = absoluteHref;
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

  // Inject <base href> so relative resources (link, img, etc.) resolve correctly
  const head = clone.querySelector("head");
  if (head && !head.querySelector("base")) {
    const base = document.createElement("base");
    base.href = location.href;
    head.prepend(base);
  }

  removeScripts(clone);
  await inlineCss(clone);
  await inlineImages(clone);

  // Use outerHTML to preserve <html> element attributes (lang, class for dark mode, etc.)
  const html = `<!DOCTYPE html>\n${clone.outerHTML}`;
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
