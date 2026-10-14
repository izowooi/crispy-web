type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallEnvironment = "unknown" | "standalone" | "inapp" | "ios" | "android" | "desktop";

const DISMISS_KEY = "bm:install-dismissed";

let promptEvent: InstallPromptEvent | null = null;
let installed = false;
let started = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 서비스 워커를 등록하고 Chrome의 설치 이벤트를 잡아 둔다. 레이아웃에서 한 번만 호출한다. */
export function startPwaClient(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    promptEvent = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    promptEvent = null;
    installed = true;
    emit();
  });

  // 개발 서버에서는 HMR과 충돌하므로 운영 빌드에서만 등록한다.
  if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }
}

export function detectEnvironment(): InstallEnvironment {
  if (typeof window === "undefined") return "unknown";
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "standalone";

  const ua = navigator.userAgent;
  // 카카오톡·네이버·인스타그램 등 앱 안 브라우저, Android WebView에서는 설치할 수 없다.
  if (/KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|; wv\)/i.test(ua)) return "inapp";
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export const hasInstallPrompt = () => promptEvent !== null;
export const isInstalled = () => installed;

export async function promptInstall(): Promise<void> {
  const event = promptEvent;
  if (!event) return;
  await event.prompt();
  await event.userChoice;
  // 한 번 쓴 이벤트는 다시 쓸 수 없다.
  promptEvent = null;
  emit();
}

export function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstallGuide(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // 저장소를 못 쓰면 이번 방문에서만 숨긴다.
  }
  emit();
}
