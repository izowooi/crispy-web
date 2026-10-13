/**
 * 휴대폰 사진(3000×4000, 4MB+)을 그대로 보내면 업로드가 느리고 AI 이미지 한도에도 걸린다.
 * 작은 글씨를 읽을 수 있는 해상도(긴 변 2400px)로 줄이고 EXIF 회전을 반영한 JPEG로 바꾼다.
 */
export async function resizeForUpload(file: File, maxEdge = 2400, quality = 0.86): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 처리할 수 없어요.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("이미지를 변환하지 못했어요.");
  return blob;
}
