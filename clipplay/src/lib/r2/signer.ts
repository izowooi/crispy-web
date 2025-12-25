/**
 * Lightweight R2 Signer - AWS Signature V4 Implementation
 * Replaces @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner
 * Bundle size: ~3KB vs ~500KB
 */

// R2 configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';

const REGION = 'auto';
const SERVICE = 's3';

/**
 * Convert ArrayBuffer to hex string
 */
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SHA-256 hash
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return toHex(hashBuffer);
}

/**
 * HMAC-SHA256
 */
async function hmacSha256(key: BufferSource, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

/**
 * Get AWS Signature V4 signing key
 */
async function getSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode('AWS4' + secretKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return await hmacSha256(kService, 'aws4_request');
}

/**
 * Format date for AWS signature
 */
function getAmzDate(): { amzDate: string; dateStamp: string } {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  return { amzDate, dateStamp };
}

/**
 * Get R2 endpoint URL
 */
function getEndpoint(): string {
  return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

/**
 * Get bucket host
 */
function getHost(): string {
  return `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

/**
 * Encode URI component but preserve slashes
 */
function encodeKey(key: string): string {
  return encodeURIComponent(key).replace(/%2F/g, '/');
}

/**
 * Generate presigned URL for PUT operation (upload)
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const { amzDate, dateStamp } = getAmzDate();
  const host = getHost();
  const credential = `${R2_ACCESS_KEY_ID}/${dateStamp}/${REGION}/${SERVICE}/aws4_request`;

  // Canonical request components
  const method = 'PUT';
  const canonicalUri = `/${R2_BUCKET_NAME}/${encodeKey(key)}`;

  // Query parameters for presigned URL
  const queryParams: [string, string][] = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', expiresIn.toString()],
    ['X-Amz-SignedHeaders', 'content-type;host'],
  ];

  // Sort query parameters
  queryParams.sort((a, b) => a[0].localeCompare(b[0]));
  const canonicalQueryString = queryParams
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  // Canonical headers (must include content-type for PUT)
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const signedHeaders = 'content-type;host';

  // For presigned URLs, payload is UNSIGNED-PAYLOAD
  const payloadHash = 'UNSIGNED-PAYLOAD';

  // Create canonical request
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // Create string to sign
  const canonicalRequestHash = await sha256(canonicalRequest);
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    `${dateStamp}/${REGION}/${SERVICE}/aws4_request`,
    canonicalRequestHash,
  ].join('\n');

  // Calculate signature
  const signingKey = await getSigningKey(R2_SECRET_ACCESS_KEY, dateStamp, REGION, SERVICE);
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = toHex(signatureBuffer);

  // Build presigned URL
  const presignedUrl = `${getEndpoint()}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

  return presignedUrl;
}

/**
 * Sign a request for direct API call
 */
async function signRequest(
  method: string,
  key: string,
  contentType?: string
): Promise<{ url: string; headers: Record<string, string> }> {
  const { amzDate, dateStamp } = getAmzDate();
  const host = getHost();
  const credential = `${R2_ACCESS_KEY_ID}/${dateStamp}/${REGION}/${SERVICE}/aws4_request`;

  const canonicalUri = `/${R2_BUCKET_NAME}/${encodeKey(key)}`;
  const canonicalQueryString = '';

  // Build headers
  const headers: Record<string, string> = {
    host: host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
  };

  if (contentType) {
    headers['content-type'] = contentType;
  }

  // Sort and format canonical headers
  const sortedHeaderKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaderKeys.map((k) => `${k}:${headers[k]}`).join('\n') + '\n';
  const signedHeaders = sortedHeaderKeys.join(';');

  // Create canonical request
  const payloadHash = 'UNSIGNED-PAYLOAD';
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  // Create string to sign
  const canonicalRequestHash = await sha256(canonicalRequest);
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    `${dateStamp}/${REGION}/${SERVICE}/aws4_request`,
    canonicalRequestHash,
  ].join('\n');

  // Calculate signature
  const signingKey = await getSigningKey(R2_SECRET_ACCESS_KEY, dateStamp, REGION, SERVICE);
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = toHex(signatureBuffer);

  // Add authorization header
  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url: `${getEndpoint()}${canonicalUri}`,
    headers: {
      ...headers,
      authorization: authorizationHeader,
    },
  };
}

/**
 * Upload file to R2
 */
export async function uploadToR2(
  key: string,
  body: Uint8Array | string,
  contentType: string
): Promise<void> {
  const { url, headers } = await signRequest('PUT', key, contentType);

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: body as BodyInit,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`R2 upload failed: ${response.status} - ${errorText}`);
  }
}

/**
 * Get object from R2
 */
export async function getFromR2(key: string): Promise<string | null> {
  const { url, headers } = await signRequest('GET', key);

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`R2 get failed: ${response.status} - ${errorText}`);
  }

  return await response.text();
}

/**
 * Delete object from R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  const { url, headers } = await signRequest('DELETE', key);

  const response = await fetch(url, {
    method: 'DELETE',
    headers,
  });

  // 204 No Content or 404 Not Found are both acceptable for delete
  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`R2 delete failed: ${response.status} - ${errorText}`);
  }
}
