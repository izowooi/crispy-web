import { AwsClient } from "aws4fetch";

export interface R2Config {
  endpoint: string;      // https://ACCOUNT.r2.cloudflarestorage.com
  bucket: string;        // bucket name, e.g. page-share
  keyId: string;         // R2 access key id
  secret: string;        // R2 secret access key
  publicUrlBase: string; // https://pub-xxx.r2.dev
}

export interface R2UploadResult {
  publicUrl: string;
  fileSize: number;
  fileKey: string;
}

export function isR2Configured(config: Partial<R2Config>): config is R2Config {
  return Boolean(
    config.endpoint &&
      config.bucket &&
      config.keyId &&
      config.secret &&
      config.publicUrlBase,
  );
}

export async function uploadHtmlToR2(
  config: R2Config,
  html: string,
  customFetch?: typeof globalThis.fetch,
): Promise<R2UploadResult> {
  const aws = new AwsClient({
    accessKeyId: config.keyId,
    secretAccessKey: config.secret,
    service: "s3",
    region: "auto",
    ...(customFetch && { fetch: customFetch }),
  });

  const fileKey = `${crypto.randomUUID()}.html`;
  const putUrl = `${config.endpoint.replace(/\/$/, "")}/${config.bucket}/${fileKey}`;

  // Use sign() so tests can inject a custom fetch without hitting the network.
  const signedReq = await aws.sign(putUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: html,
  });
  const doFetch = customFetch ?? globalThis.fetch;
  const res = await doFetch(signedReq as Request);

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`R2 upload failed (${res.status}): ${errBody.slice(0, 300)}`);
  }

  const fileSize = new TextEncoder().encode(html).byteLength;
  const publicUrl = `${config.publicUrlBase.replace(/\/$/, "")}/${fileKey}`;

  return { publicUrl, fileSize, fileKey };
}
