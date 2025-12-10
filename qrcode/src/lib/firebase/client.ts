import { initializeApp, getApps } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  getToken,
  AppCheck,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let appCheckInstance: AppCheck | null = null;

export function initializeFirebase() {
  if (typeof window === "undefined") return null;

  // 이미 초기화된 앱이 있으면 사용
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const app = initializeApp(firebaseConfig);
  return app;
}

export function initializeFirebaseAppCheck() {
  if (typeof window === "undefined") return null;
  if (appCheckInstance) return appCheckInstance;

  const app = initializeFirebase();
  if (!app) return null;

  // 개발 환경에서 디버그 토큰 사용
  if (process.env.NODE_ENV === "development") {
    const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN;
    if (debugToken) {
      // @ts-expect-error - Firebase debug token
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    }
  }

  try {
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(
        process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""
      ),
      isTokenAutoRefreshEnabled: true,
    });
    return appCheckInstance;
  } catch (error) {
    console.error("App Check 초기화 실패:", error);
    return null;
  }
}

export async function getAppCheckToken(): Promise<string | null> {
  const appCheck = initializeFirebaseAppCheck();
  if (!appCheck) return null;

  try {
    const tokenResult = await getToken(appCheck, false);
    return tokenResult.token;
  } catch (error) {
    console.error("App Check 토큰 획득 실패:", error);
    return null;
  }
}
