import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { dataDir } from "../config";

export type CredentialRecord = {
  email: string | null;
  issuer: string;
  subject: string;
  client_id: string;
  ext_agent_host_id: string;
  id_token: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_type: string;
  expires_in: number;
  scopes: string[];
  saved_at: string;
  /** Unix ms; derived from saved_at + expires_in so refresh timing survives restarts. */
  expires_at: number;
};

function credentialsDir(): string {
  return path.join(dataDir(), "credentials");
}

function fileFor(clientId: string): string {
  if (!/^[A-Za-z0-9_.-]+$/.test(clientId)) throw new Error("invalid client_id");
  return path.join(credentialsDir(), `${clientId}.json`);
}

export function readCredentials(clientId: string): CredentialRecord | null {
  try {
    return JSON.parse(fs.readFileSync(fileFor(clientId), "utf8")) as CredentialRecord;
  } catch {
    return null;
  }
}

export function writeCredentials(record: CredentialRecord): void {
  const dir = credentialsDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const target = fileFor(record.client_id);
  const tmp = `${target}.${randomBytes(6).toString("hex")}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(record, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, target);
}

/** Sign-out / dead session: drop tokens but keep the client_id ↔ identity mapping for re-auth. */
export function clearTokens(clientId: string, keepIdToken = false): void {
  const record = readCredentials(clientId);
  if (!record) return;
  writeCredentials({
    ...record,
    access_token: null,
    refresh_token: null,
    id_token: keepIdToken ? record.id_token : null,
    expires_at: 0,
    saved_at: new Date().toISOString(),
  });
}
