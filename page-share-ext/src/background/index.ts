import { getApiBase, getApiKey, getR2Config } from "../shared/config";
import { uploadHtmlToR2, isR2Configured } from "../lib/r2-upload";
import type { Message, CaptureResult, UploadResponse } from "../shared/types";

async function uploadPage(capture: CaptureResult): Promise<UploadResponse> {
  const apiBase = getApiBase();
  const apiKey = getApiKey();
  const r2Config = getR2Config();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["X-Api-Key"] = apiKey;

  if (isR2Configured(r2Config)) {
    // R2 direct upload: HTML → R2, then record the public URL in the web app DB
    const r2Result = await uploadHtmlToR2(r2Config, capture.html);

    const res = await fetch(`${apiBase}/api/archives`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: capture.title,
        original_url: capture.url,
        storage_path: r2Result.publicUrl,
        file_size: r2Result.fileSize,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DB record failed (${res.status}): ${text}`);
    }

    return res.json();
  }

  // Fallback: send HTML to web server (legacy mode)
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

  return res.json();
}

chrome.runtime.onMessage.addListener(
  (msg: Message, _sender, sendResponse) => {
    if (msg.type !== "CAPTURE_DONE") return false;

    uploadPage(msg.payload)
      .then((data) =>
        sendResponse({ type: "UPLOAD_DONE", share_url: data.share_url }),
      )
      .catch((err: Error) =>
        sendResponse({ type: "UPLOAD_ERROR", message: err.message }),
      );

    return true;
  },
);
