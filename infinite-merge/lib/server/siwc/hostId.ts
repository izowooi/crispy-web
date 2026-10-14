import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { dataDir } from "../config";

/** Stable per-installation ext_agent_host_id. Opaque by design: never derived from user data. */
export function getHostId(): string {
  const file = path.join(dataDir(), "host.json");
  try {
    const saved = JSON.parse(fs.readFileSync(file, "utf8")) as { ext_agent_host_id?: string };
    if (saved.ext_agent_host_id) return saved.ext_agent_host_id;
  } catch {
    // first run
  }
  const hostId = `urn:uuid:${randomUUID()}`;
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify({ ext_agent_host_id: hostId }, null, 2), { mode: 0o600 });
  return hostId;
}
