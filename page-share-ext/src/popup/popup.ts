import { sendRequest, sendTabRequest } from "../shared/messaging";

const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const statusText = document.getElementById("status-text") as HTMLParagraphElement;
const resultEl = document.getElementById("result") as HTMLDivElement;
const shareUrlInput = document.getElementById("share-url") as HTMLInputElement;
const copyBtn = document.getElementById("copy-btn") as HTMLButtonElement;
const privateToggle = document.getElementById("private-toggle") as HTMLInputElement;

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

  const isPrivate = privateToggle.checked;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      setStatus("탭을 찾을 수 없습니다", "error");
      return;
    }

    // Step 1: ensure content script is running (handles tabs open before extension load)
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/index.js"],
      });
    } catch {
      // Tab may not support scripting (chrome://, PDF, etc.) — sendTabRequest surfaces the real error
    }

    // Step 2: capture via content script (promise-form messaging — Safari/Firefox safe)
    const captureMsg = await sendTabRequest(tab.id, { type: "CAPTURE_PAGE" });
    if (captureMsg.type === "CAPTURE_ERROR") throw new Error(captureMsg.message);
    if (captureMsg.type !== "CAPTURE_DONE") throw new Error("예상치 못한 캡처 응답");

    setStatus(isPrivate ? "비공개 저장 중..." : "R2 업로드 중...", "saving");

    // Step 3: upload via background service worker (carry the privacy choice)
    const uploadMsg = await sendRequest({ ...captureMsg, is_private: isPrivate });
    if (uploadMsg.type === "UPLOAD_ERROR") throw new Error(uploadMsg.message);
    if (uploadMsg.type !== "UPLOAD_DONE") throw new Error("예상치 못한 업로드 응답");

    setStatus(isPrivate ? "🔒 비공개로 저장 완료!" : "저장 완료! 🎉", "success");
    shareUrlInput.value = uploadMsg.share_url;
    resultEl.classList.remove("hidden");
  } catch (err) {
    setStatus(`실패: ${(err as Error).message}`, "error");
  } finally {
    setLoading(false);
  }
});
