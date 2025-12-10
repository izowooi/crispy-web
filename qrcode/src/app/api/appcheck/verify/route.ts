import { NextRequest, NextResponse } from "next/server";
import { verifyAppCheckToken } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const appCheckToken = request.headers.get("X-Firebase-AppCheck");

    if (!appCheckToken) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_TOKEN", message: "App Check 토큰이 없습니다." },
        },
        { status: 401 }
      );
    }

    const isValid = await verifyAppCheckToken(appCheckToken);

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_TOKEN", message: "App Check 토큰이 유효하지 않습니다." },
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "App Check 토큰이 유효합니다.",
    });
  } catch (error) {
    console.error("App Check 검증 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VERIFICATION_ERROR",
          message: error instanceof Error ? error.message : "검증 중 오류가 발생했습니다.",
        },
      },
      { status: 500 }
    );
  }
}
