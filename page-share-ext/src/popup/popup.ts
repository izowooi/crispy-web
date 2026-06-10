import { DEFAULT_API_BASE } from "../shared/config";
import type { Message } from "../shared/types";

const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const statusText = document.getElementById("status-text") as HTMLParagraphElement;
const resultEl = document.getElementById("result") as HTMLDivElement;
const shareUrlInput = document.getElementById("share-url") as HTMLInputElement;
const copyBtn = document.getElementById("copy-btn") as HTMLButtonElement;
const apiBaseInput = document.getElementById("api-base") as HTMLInputElement;
const apiKeyInput = document.getElementById("api-key") as HTMLInputElement;
const saveSettingsBtn = document.getElementById("save-settings-btn") as HTMLButtonElement;

// Load saved settings
chrome.storage.sync.get({ apiBase: DEFAULT_API_BASE, apiKey: "" }, (items) => {
  apiBaseInput.value = items.apiBase as string;
  apiKeyInput.value = items.apiKey as string;
});

saveSettingsBtn.addEventListener("click", () => {
  chrome.storage.sync.set({ apiBase: apiBaseInput.value, apiKey: apiKeyInput.value });
  setStatus("설정 저장됨", "success");
  setTimeout(() => setStatus("현재 페이지를 저장합니다", "idle"), 1500);
});

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

  // Step 1: capture via content script
  chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_PAGE" } satisfies Message, (captureMsg: Message) => {
    if (chrome.runtime.lastError || captureMsg.type === "CAPTURE_ERROR") {
      const msg = chrome.runtime.lastError?.message ?? (captureMsg as { type: "CAPTURE_ERROR"; message: string }).message;
      setStatus(`캡처 실패: ${msg}`, "error");
      setLoading(false);
      return;
    }

    if (captureMsg.type !== "CAPTURE_DONE") return;

    setStatus("업로드 중...", "saving");

    // Step 2: upload via background service worker
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
