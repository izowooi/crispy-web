import { getApiBase } from "../shared/config";
import type { Message, CaptureResult, UploadResponse } from "../shared/types";

async function uploadPage(
  capture: CaptureResult,
): Promise<UploadResponse> {
  const apiBase = await getApiBase();
  const res = await fetch(`${apiBase}/api/archives`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
