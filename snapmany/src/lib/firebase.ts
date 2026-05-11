// Firebase 클라이언트 SDK 초기화 격리 모듈.
// 모듈 로드 시 어떤 부수효과도 일으키지 않는다 (edge SSR 번들 안전).
// 호출부가 명시적으로 `getClientApp()`을 부를 때만 initializeApp이 실행된다.

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

export type FirebaseClientConfig = {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
};

export function readClientConfigFromEnv(): FirebaseClientConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };
}

export function getClientApp(): FirebaseApp {
  const existing = getApps();
  if (existing.length > 0) return existing[0];
  return initializeApp(readClientConfigFromEnv());
}
