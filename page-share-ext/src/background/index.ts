import { getApiBase, getApiKey, getR2Config } from "../shared/config";
import { uploadHtmlToR2, isR2Configured } from "../lib/r2-upload";
import { onRequest } from "../shared/messaging";
import type { Message, CaptureResult } from "../shared/types";

async function uploadPage(capture: CaptureResult, isPrivate: boolean): Promise<string> {
  const apiBase = getApiBase();
  const apiKey = getApiKey();
  const r2Config = getR2Config();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["X-Api-Key"] = apiKey;

  if (isR2Configured(r2Config)) {
    // R2 direct upload: HTML → R2 (object lives at a public, UUID-obscured URL).
    const r2Result = await uploadHtmlToR2(r2Config, capture.html);
    const body = JSON.stringify({
      title: capture.title,
      original_url: capture.url,
      storage_path: r2Result.publicUrl,
      file_size: r2Result.fileSize,
      is_private: isPrivate,
    });

    if (isPrivate) {
      // Private archives are viewed through the access-gated web page, so the DB record
      // IS the gate: registration must succeed and we return /archive/{id}, never the raw
      // (public) R2 URL. (The object itself still lives at a public URL — see docs.)
      const res = await fetch(`${apiBase}/api/archives`, { method: "POST", headers, body });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`비공개 저장 실패 (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      // Build the gated share URL from the user-configured apiBase rather than trusting the
      // server's NEXT_PUBLIC_BASE_URL (which, if unset, would yield a localhost URL).
      const id = data?.archive?.id;
      return id ? `${apiBase.replace(/\/$/, "")}/archive/${id}` : (data.share_url as string);
    }

    // Public: DB registration is best-effort — return the direct R2 URL even if it fails.
    try {
      await fetch(`${apiBase}/api/archives`, { method: "POST", headers, body });
    } catch {
      // DB record failed but the public R2 URL is still accessible
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
      is_private: isPrivate,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.share_url as string;
}

onRequest((msg) => {
  if (msg.type !== "CAPTURE_DONE") return undefined;
  return uploadPage(msg.payload, msg.is_private ?? false)
    .then((shareUrl): Message => ({ type: "UPLOAD_DONE", share_url: shareUrl }))
    .catch((err: Error): Message => ({ type: "UPLOAD_ERROR", message: err.message }));
});
