import zlib from 'node:zlib';

// Minimal read-only ZIP reader. Node ships no zip support and the format's
// central directory is stable and simple, so this avoids a dependency for
// what amounts to "find the PDF inside the product zip".

const EOCD_SIG = 0x06054b50;
const CDH_SIG = 0x02014b50;
const LFH_SIG = 0x04034b50;

function findEndOfCentralDirectory(buf) {
  // The EOCD is at the end, but a trailing comment can push it back up to
  // 64 KB. Scan backwards for the signature.
  const min = Math.max(0, buf.length - 0x10000 - 22);
  for (let i = buf.length - 22; i >= min; i -= 1) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  throw new Error('Not a zip file (no end-of-central-directory record)');
}

/** Lists entries without inflating them: [{ name, offset, method, size }]. */
export function listZipEntries(buf) {
  const eocd = findEndOfCentralDirectory(buf);
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  const entries = [];
  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(p) !== CDH_SIG) break;
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    entries.push({ name, method, compressedSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Inflates one entry to a Buffer. */
export function readZipEntry(buf, entry) {
  const p = entry.localOffset;
  if (buf.readUInt32LE(p) !== LFH_SIG) {
    throw new Error(`Corrupt local header for ${entry.name}`);
  }
  const nameLen = buf.readUInt16LE(p + 26);
  const extraLen = buf.readUInt16LE(p + 28);
  const start = p + 30 + nameLen + extraLen;
  const data = buf.subarray(start, start + entry.compressedSize);

  if (entry.method === 0) return Buffer.from(data);      // stored
  if (entry.method === 8) return zlib.inflateRawSync(data); // deflate
  throw new Error(`Unsupported zip compression method ${entry.method} for ${entry.name}`);
}

/** Convenience: every entry whose name matches, inflated. */
export function extractMatching(buf, predicate) {
  return listZipEntries(buf)
    .filter((e) => predicate(e.name))
    .map((e) => ({ name: e.name, data: readZipEntry(buf, e) }));
}
