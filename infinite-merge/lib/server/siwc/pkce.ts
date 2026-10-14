import { createHash, randomBytes } from "node:crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** RFC 7636 S256: base64url(SHA-256(verifier)) without padding. */
export function codeChallengeS256(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function createPkce() {
  const verifier = randomToken(32);
  return { verifier, challenge: codeChallengeS256(verifier) };
}
