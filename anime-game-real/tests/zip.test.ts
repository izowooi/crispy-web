import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createZip } from "../src/lib/zip.ts";
test("ZIP opens with a standard reader and preserves Unicode names, bytes and CRC", async () => {
  const zip = createZip([
    { name: "01-Flare-1x1.png", bytes: Uint8Array.of(0, 1, 255, 128) },
    { name: "02-결과.png", bytes: Uint8Array.of(42) },
    { name: "empty.png", bytes: new Uint8Array() },
  ]);
  const result = spawnSync(
    "python3",
    [
      "-c",
      `import zipfile,io,sys
z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))
assert z.testzip() is None
assert z.namelist()==['01-Flare-1x1.png','02-결과.png','empty.png']
assert z.read(z.namelist()[0])==bytes([0,1,255,128])
assert z.read(z.namelist()[1])==bytes([42])
assert z.read('empty.png')==b''
`,
    ],
    { input: Buffer.from(await zip.arrayBuffer()) },
  );
  assert.equal(result.status, 0, result.stderr.toString());
  assert.equal(zip.type, "application/zip");
});
