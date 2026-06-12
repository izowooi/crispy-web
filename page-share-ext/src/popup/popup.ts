import type { Message } from "../shared/types";

const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const statusText = document.getElementById("status-text") as HTMLParagraphElement;
const resultEl = document.getElementById("result") as HTMLDivElement;
const shareUrlInput = document.getElementById("share-url") as HTMLInputElement;
const copyBtn = document.getElementById("copy-btn") as HTMLButtonElement;

function setStatus(msg: string, state: "idle" | "saving" | "success" | "error") {
  statusText.textContent = msg;
  statusEl.className = `status ${state}`;
}

function setLoading(loading: boolean) {
  saveBtn.disabled = loading;
  saveBtn.textContent = loading ? "⏳ 저장 중..." : "💾 Save Page";
}

copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(shareUrlInput.value);
  copyBtn.textContent = "✓ 복사됨";
  setTimeout(() => (copyBtn.textContent = "복사"), 2000);
});

saveBtn.addEventListener("click", async () => {
  setLoading(true);
  setStatus("페이지 캡처 중...", "saving");
  resultEl.classList.add("hidden");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) {
    setStatus("탭을 찾을 수 없습니다", "error");
    setLoading(false);
    return;
  }

  // Step 1: ensure content script is running (handles tabs open before extension load)
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/index.js"],
    });
  } catch {
    // Tab may not support scripting (chrome://, PDF, etc.) — let sendMessage surface the real error
  }

  // Step 2: capture via content script
  chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_PAGE" } satisfies Message, (captureMsg: Message) => {
    if (chrome.runtime.lastError || captureMsg.type === "CAPTURE_ERROR") {
      const msg = chrome.runtime.lastError?.message ?? (captureMsg as { type: "CAPTURE_ERROR"; message: string }).message;
      setStatus(`캡처 실패: ${msg}`, "error");
      setLoading(false);
      return;
    }

    if (captureMsg.type !== "CAPTURE_DONE") return;

    setStatus("R2 업로드 중...", "saving");

    // Step 3: upload via background service worker
    chrome.runtime.sendMessage(captureMsg, (uploadMsg: Message) => {
      setLoading(false);
      if (chrome.runtime.lastError || uploadMsg.type === "UPLOAD_ERROR") {
        const msg = chrome.runtime.lastError?.message ?? (uploadMsg as { type: "UPLOAD_ERROR"; message: string }).message;
        setStatus(`업로드 실패: ${msg}`, "error");
        return;
      }

      if (uploadMsg.type !== "UPLOAD_DONE") return;

      setStatus("저장 완료! 🎉", "success");
      shareUrlInput.value = uploadMsg.share_url;
      resultEl.classList.remove("hidden");
    });
  });
});
