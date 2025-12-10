import * as admin from "firebase-admin";

function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin 환경변수가 설정되지 않았습니다.");
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export async function verifyAppCheckToken(token: string): Promise<boolean> {
  try {
    const app = getFirebaseAdmin();
    const appCheck = app.appCheck();
    await appCheck.verifyToken(token);
    return true;
  } catch (error) {
    console.error("App Check 토큰 검증 실패:", error);
    return false;
  }
}
