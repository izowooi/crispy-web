import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAppCheckToken } from "@/lib/firebase/admin";
import { uploadToR2, generateObjectKey } from "@/lib/cloudflare/r2-client";
import type { GenerateQRResponse, ApiResponse } from "@/types";

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<GenerateQRResponse>>> {
  try {
    // 1. Authorization 헤더에서 JWT 토큰 추출
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." },
        },
        { status: 401 }
      );
    }

    const jwt = authHeader.slice(7);

    // 2. Supabase로 JWT 검증
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(jwt);

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_TOKEN", message: "유효하지 않은 인증 토큰입니다." },
        },
        { status: 401 }
      );
    }

    // 3. App Check 토큰 검증 (선택적)
    const appCheckToken = request.headers.get("X-Firebase-AppCheck");
    if (appCheckToken) {
      const isValidAppCheck = await verifyAppCheckToken(appCheckToken);
      if (!isValidAppCheck) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_APP_CHECK", message: "App Check 토큰이 유효하지 않습니다." },
          },
          { status: 401 }
        );
      }
    }

    // 4. FormData에서 파일과 메타데이터 추출
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const ssid = formData.get("ssid") as string | null;
    const encryptionType = formData.get("encryptionType") as "WPA" | "WPA2" | null;

    if (!file || !ssid || !encryptionType) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "file, ssid, encryptionType은 필수입니다." },
        },
        { status: 400 }
      );
    }

    // 5. R2에 업로드
    const objectKey = generateObjectKey(user.id);
    const arrayBuffer = await file.arrayBuffer();
    const uploadResult = await uploadToR2(arrayBuffer, objectKey);

    if (!uploadResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UPLOAD_FAILED", message: uploadResult.error || "R2 업로드 실패" },
        },
        { status: 500 }
      );
    }

    // 6. Supabase DB에 메타데이터 저장
    const { data: dbRecord, error: dbError } = await supabase
      .from("wifi_qr_codes")
      .insert({
        user_id: user.id,
        ssid,
        encryption_type: encryptionType,
        r2_object_key: uploadResult.objectKey,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB 저장 오류:", dbError);
      return NextResponse.json(
        {
          success: false,
          error: { code: "DB_ERROR", message: "데이터베이스 저장 중 오류가 발생했습니다." },
        },
        { status: 500 }
      );
    }

    // 7. 성공 응답
    return NextResponse.json({
      success: true,
      data: {
        qrId: dbRecord.id,
        qrDataUrl: "", // 클라이언트에서 이미 가지고 있음
        r2Url: uploadResult.objectKey,
        createdAt: dbRecord.created_at,
      },
    });
  } catch (error) {
    console.error("QR 생성 API 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
        },
      },
      { status: 500 }
    );
  }
}
