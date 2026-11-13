import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = join(dirname(fileURLToPath(import.meta.url)), "entry.png");
const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const destination = join(outputDirectory, "entry.png");

function reject(message: string): never {
  throw new Error(message);
}

function dimensionsOfJpeg(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    reject("Input does not begin with the JPEG signature.");
  }

  let cursor = 2;
  while (cursor < bytes.length) {
    if (bytes[cursor] !== 0xff) reject("Malformed JPEG marker sequence.");
    while (cursor < bytes.length && bytes[cursor] === 0xff) cursor++;
    if (cursor >= bytes.length) break;

    const marker = bytes[cursor++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (cursor + 2 > bytes.length) reject("Truncated JPEG segment length.");

    const segmentLength = bytes.readUInt16BE(cursor);
    if (segmentLength < 2 || cursor + segmentLength > bytes.length) {
      reject("Truncated or invalid JPEG segment.");
    }

    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      if (segmentLength < 7) reject("JPEG frame header is too short.");
      const height = bytes.readUInt16BE(cursor + 3);
      const width = bytes.readUInt16BE(cursor + 5);
      if (width === 0 || height === 0) reject("JPEG frame has zero dimensions.");
      if (width > 1024 || height > 1024) reject("JPEG dimensions exceed 1024 pixels.");
      return { width, height };
    }

    cursor += segmentLength;
  }

  reject("JPEG has no supported SOF0, SOF1, or SOF2 frame.");
}

async function main(): Promise<void> {
  const bytes = await readFile(source);
  if (bytes.length === 0) reject("Input image is empty.");
  if (bytes.length > 1048576) reject("Input image exceeds 1048576 bytes.");
  const { width, height } = dimensionsOfJpeg(bytes);
  if (width <= 0 || height <= 0) {
    reject("JPEG width and height must both be greater than zero.");
  }
  if (bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) {
    reject("JPEG is missing its FF D9 end marker.");
  }

  await mkdir(outputDirectory, { recursive: true });
  await copyFile(source, destination);
  const written = await stat(destination);
  const digest = createHash("sha256").update(bytes).digest("hex");
  console.log(`Wrote ${destination}: ${written.size} bytes, ${width}x${height}, sha256 ${digest}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
