import { AwsClient } from "aws4fetch";

export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ENDPOINT &&
    process.env.R2_BUCKET &&
    process.env.R2_KEY_ID &&
    process.env.R2_SECRET &&
    process.env.R2_PUBLIC_URL
  );
}

export async function uploadToR2(
  key: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const endpoint = process.env.R2_ENDPOINT!;
  const bucket = process.env.R2_BUCKET!;
  const publicUrl = process.env.R2_PUBLIC_URL!;

  const aws = new AwsClient({
    accessKeyId: process.env.R2_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET!,
  });

  const res = await aws.fetch(`${endpoint}/${bucket}/${key}`, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 PUT failed (${res.status}): ${text}`);
  }

  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}
