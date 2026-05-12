"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PasswordGate } from "@/components/PasswordGate";

export const AUTH_STORAGE_KEY = "snapmany-auth";
const AUTH_STORAGE_VALUE = "1";

export type AuthGateProps = {
  children: ReactNode;
};

/**
 * 첫 진입 시 암호를 묻고, 성공한 사용자만 children을 렌더한다.
 *
 * 결정사항:
 * - localStorage 사용 (브라우저를 닫아도 인증 유지) — ductcanvas 일관성.
 * - SSR/edge 환경에서는 `typeof window === "undefined"`이므로 hydration 전까지 children 미렌더.
 * - 인증은 클라이언트 게이트일 뿐 — API 보안은 별도 (`/api/generate` 등은 자체 인증 필요).
 *   본 게이트의 목적은 "아무나 못 들어오게" 수준의 가벼운 차단.
 */
export function AuthGate({ children }: AuthGateProps) {
  const [authed, setAuthed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(AUTH_STORAGE_KEY) === AUTH_STORAGE_VALUE) {
        setAuthed(true);
      }
    } catch {
      // localStorage 차단(Safari private 등) — 그 경우 매 세션마다 암호 입력.
    }
    setHydrated(true);
  }, []);

  function handleSuccess() {
    setAuthed(true);
    try {
      window.localStorage.setItem(AUTH_STORAGE_KEY, AUTH_STORAGE_VALUE);
    } catch {
      // ignore
    }
  }

  if (!hydrated) {
    return null;
  }

  if (!authed) {
    return <PasswordGate onSuccess={handleSuccess} />;
  }

  return <>{children}</>;
}
