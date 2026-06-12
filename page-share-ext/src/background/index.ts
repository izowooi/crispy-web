import { getApiBase, getApiKey, getR2Config } from "../shared/config";
import { uploadHtmlToR2, isR2Configured } from "../lib/r2-upload";
import type { Message, CaptureResult } from "../shared/types";

async function uploadPage(capture: CaptureResult): Promise<string> {
  const apiBase = getApiBase();
  const apiKey = getApiKey();
  const r2Config = getR2Config();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["X-Api-Key"] = apiKey;

  if (isR2Configured(r2Config)) {
    // R2 direct upload: HTML → R2, return public URL directly as share URL.
    // DB registration is best-effort — web server may not be running.
    const r2Result = await uploadHtmlToR2(r2Config, capture.html);

    try {
      await fetch(`${apiBase}/api/archives`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: capture.title,
          original_url: capture.url,
          storage_path: r2Result.publicUrl,
          file_size: r2Result.fileSize,
        }),
      });
    } catch {
      // DB record failed but R2 URL is still accessible
    }

    return r2Result.publicUrl;
  }

  // Fallback: send HTML to web server and use its returned share URL
  const res = await fetch(`${apiBase}/api/archives`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: capture.title,
      original_url: capture.url,
      html: capture.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.share_url as string;
}

chrome.runtime.onMessage.addListener(
  (msg: Message, _sender, sendResponse) => {
    if (msg.type !== "CAPTURE_DONE") return false;

    uploadPage(msg.payload)
      .then((shareUrl) =>
        sendResponse({ type: "UPLOAD_DONE", share_url: shareUrl }),
      )
      .catch((err: Error) =>
        sendResponse({ type: "UPLOAD_ERROR", message: err.message }),
      );

    return true;
  },
);
