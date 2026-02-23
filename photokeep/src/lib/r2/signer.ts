const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const BUCKET = process.env.R2_BUCKET_NAME!;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID!;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const REGION = 'auto';
const SERVICE = 's3';

async function hmac(key: BufferSource, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function sha256(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getPresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn = 600
): Promise<string> {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dateOnly = dateStamp.slice(0, 8);
  const credential = `${ACCESS_KEY}/${dateOnly}/${REGION}/${SERVICE}/aws4_request`;

  const url = new URL(`${R2_ENDPOINT}/${BUCKET}/${key}`);
  const params = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': dateStamp,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'content-type;host',
  });

  // Sort params
  const sortedParams = new URLSearchParams([...params.entries()].sort());
  const canonicalQueryString = sortedParams.toString();

  const canonicalHeaders = `content-type:${contentType}\nhost:${url.host}\n`;
  const signedHeaders = 'content-type;host';

  const canonicalRequest = [
    'PUT',
    `/${BUCKET}/${key}`,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const scope = `${dateOnly}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateStamp,
    scope,
    await sha256(canonicalRequest),
  ].join('\n');

  // Derive signing key
  let signingKey = await hmac(
    new TextEncoder().encode('AWS4' + SECRET_KEY),
    dateOnly
  );
  signingKey = await hmac(signingKey, REGION);
  signingKey = await hmac(signingKey, SERVICE);
  signingKey = await hmac(signingKey, 'aws4_request');

  const signature = toHex(await hmac(signingKey, stringToSign));

  return `${url.origin}${url.pathname}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}
