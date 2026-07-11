/** Remove obsolete static Pages assemblies before every Workers build. */
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const legacyPagesOutput = join(process.cwd(), ".pages-out");
if (existsSync(legacyPagesOutput)) {
  rmSync(legacyPagesOutput, { recursive: true, force: true });
  console.log("Removed obsolete .pages-out artifact.");
}
