import { describe, expect, it } from "vitest";
import { parsePngTextChunks } from "@/lib/nai-inspector";

function chunk(type: string, value: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + value.length);
  new DataView(out.buffer).setUint32(0, value.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(value, 8);
  return out;
}

describe("NAI PNG Inspector", () => {
  it("reads tEXt chunks without calling vision models", () => {
    const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const data = new TextEncoder().encode('Comment\0{"prompt":"1girl","uc":"lowres"}');
    const png = new Uint8Array(signature.length + data.length + 12);
    png.set(signature); png.set(chunk("tEXt", data), signature.length);
    expect(parsePngTextChunks(png).Comment).toContain('"prompt":"1girl"');
  });

  it("returns no metadata for non-PNG bytes", () => expect(parsePngTextChunks(new Uint8Array([1, 2, 3]))).toEqual({}));
});
