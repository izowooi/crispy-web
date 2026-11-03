const table = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
/** PNGs are already compressed: ZIP STORE avoids recompressing them and needs no server upload. */
export function createZip(files: { name: string; bytes: Uint8Array }[]): Blob {
  const chunks: BlobPart[] = [],
    directory: BlobPart[] = [];
  let offset = 0,
    dirSize = 0;
  for (const file of files) {
    const name = new TextEncoder().encode(file.name),
      crc = crc32(file.bytes);
    const local = new Uint8Array(30 + name.length),
      v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x800, true);
    v.setUint16(12, 33, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, file.bytes.length, true);
    v.setUint32(22, file.bytes.length, true);
    v.setUint16(26, name.length, true);
    local.set(name, 30);
    chunks.push(local.buffer, file.bytes.slice().buffer as ArrayBuffer);
    const central = new Uint8Array(46 + name.length),
      c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x800, true);
    c.setUint16(14, 33, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, file.bytes.length, true);
    c.setUint32(24, file.bytes.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.set(name, 46);
    directory.push(central.buffer);
    dirSize += central.length;
    offset += local.length + file.bytes.length;
  }
  const end = new Uint8Array(22),
    v = new DataView(end.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, files.length, true);
  v.setUint16(10, files.length, true);
  v.setUint32(12, dirSize, true);
  v.setUint32(16, offset, true);
  return new Blob([...chunks, ...directory, end.buffer], {
    type: "application/zip",
  });
}
