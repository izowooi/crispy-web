import type { D1Migration } from "@cloudflare/vitest-plugin";
import type { Env } from "../worker/util";

declare global {
  namespace Cloudflare {
    interface Env extends Env_ {}
  }
}
type Env_ = Env & { TEST_MIGRATIONS: D1Migration[] };
