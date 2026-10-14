"use client";

import { Download, EllipsisVertical, Share, SquarePlus, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  detectEnvironment,
  dismissInstallGuide,
  hasInstallPrompt,
  isDismissed,
  isInstalled,
  promptInstall,
  subscribe,
} from "@/lib/pwa-client";

export function InstallGuide() {
  const env = useSyncExternalStore(subscribe, detectEnvironment, () => "unknown" as const);
  const canPrompt = useSyncExternalStore(subscribe, hasInstallPrompt, () => false);
  const dismissed = useSyncExternalStore(subscribe, isDismissed, () => true);
  const installed = useSyncExternalStore(subscribe, isInstalled, () => false);

  if (env === "unknown" || env === "standalone" || dismissed || installed) return null;
  if (env === "desktop" && !canPrompt) return null;

  return (
    <section className="mt-8 rounded-3xl border border-line bg-panel p-5" aria-label="앱 설치 안내">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-extrabold">홈 화면에 추가해서 앱처럼 쓰기</h2>
          <p className="mt-1 text-sm text-muted">아이콘 한 번 누르면 바로 오늘 식단이 열려요.</p>
        </div>
        <button
          type="button"
          onClick={dismissInstallGuide}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-panel-muted"
          aria-label="안내 닫기"
        >
          <X size={16} aria-hidden />
        </button>
      </div>

      {canPrompt && (
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-bold text-accent-ink"
        >
          <Download size={16} aria-hidden />앱 설치
        </button>
      )}

      {env === "inapp" && (
        <p className="mt-4 text-sm leading-relaxed">
          지금은 카카오톡 같은 앱 안에서 열려 있어서 설치할 수 없어요. 화면 모서리의 메뉴에서{" "}
          <b>다른 브라우저로 열기</b>(아이폰은 Safari, 안드로이드는 Chrome)를 누른 뒤 다시 와 주세요.
        </p>
      )}

      {env === "ios" && !canPrompt && (
        <ol className="mt-4 space-y-2 text-sm leading-relaxed">
          <li className="flex items-center gap-2">
            <b>1.</b> Safari 아래쪽의 <Share size={16} aria-label="공유" className="inline" /> 공유 버튼을 눌러요.
          </li>
          <li className="flex items-center gap-2">
            <b>2.</b> <SquarePlus size={16} aria-hidden className="inline" /> <b>홈 화면에 추가</b>를 고르고 추가를 눌러요.
          </li>
        </ol>
      )}

      {env === "android" && !canPrompt && (
        <p className="mt-4 flex flex-wrap items-center gap-1 text-sm leading-relaxed">
          Chrome 오른쪽 위 <EllipsisVertical size={16} aria-label="메뉴" className="inline" /> 메뉴에서 <b>앱 설치</b> 또는{" "}
          <b>홈 화면에 추가</b>를 눌러요.
        </p>
      )}
    </section>
  );
}
