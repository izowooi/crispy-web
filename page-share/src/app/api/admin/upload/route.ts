import { isAdminRequest } from "@/lib/admin";
import { uploadToR2, isR2Configured } from "@/lib/r2";
import { createServerClient } from "@/lib/supabase";

export const runtime = "edge";

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return Response.json({ error: "관리자 인증이 필요합니다" }, { status: 403 });
  }

  if (!isR2Configured()) {
    return Response.json({ error: "R2가 설정되지 않았습니다 (서버 환경변수 확인)" }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "multipart/form-data 파싱 실패" }, { status: 400 });
  }

  const file = form.get("file") as File | null;
  if (!file || file.size === 0) {
    return Response.json({ error: "file 필드가 필요합니다" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".html") && !file.type.includes("html")) {
    return Response.json({ error: "HTML 파일만 업로드 가능합니다" }, { status: 400 });
  }

  const title = ((form.get("title") as string | null) ?? "").trim() || file.name.replace(/\.html?$/i, "");
  const originalUrl = ((form.get("original_url") as string | null) ?? "").trim();

  const id = crypto.randomUUID();
  const key = `archive/${id}.html`;
  const buffer = await file.arrayBuffer();

  let storagePath: string;
  try {
    storagePath = await uploadToR2(key, buffer, "text/html; charset=utf-8");
  } catch (err) {
    return Response.json({ error: `R2 업로드 실패: ${(err as Error).message}` }, { status: 500 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ps_archives")
    .insert({
      id,
      title,
      original_url: originalUrl || storagePath,
      storage_path: storagePath,
      file_size: file.size,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:52741";
  return Response.json(
    { archive: data, share_url: `${baseUrl}/archive/${id}` },
    { status: 201 },
  );
}
