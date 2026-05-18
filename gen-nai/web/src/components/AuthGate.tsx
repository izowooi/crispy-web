"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  AUTH_STORAGE_KEY,
  AUTH_STORAGE_VALUE,
} from "@/lib/auth";
import { PasswordGate } from "@/components/PasswordGate";

export type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const [authed, setAuthed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(AUTH_STORAGE_KEY) === AUTH_STORAGE_VALUE) {
        setAuthed(true);
      }
    } catch {
      // localStorage가 차단된 브라우저에서는 매 세션 암호를 다시 묻는다.
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

  if (!hydrated) return null;

  if (!authed) {
    return <PasswordGate onSuccess={handleSuccess} />;
  }

  return <>{children}</>;
}
