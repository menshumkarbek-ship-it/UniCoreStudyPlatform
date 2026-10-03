import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { HttpError } from "@/lib/http";

const uploadRoot = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads"));

type Kind = { contentType: string; extension: string; matches: (bytes: Buffer) => boolean };

const kinds = {
  pdf: { contentType: "application/pdf", extension: ".pdf", matches: (bytes) => bytes.subarray(0, 5).toString("latin1") === "%PDF-" },
  jpeg: { contentType: "image/jpeg", extension: ".jpg", matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  png: { contentType: "image/png", extension: ".png", matches: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  webp: { contentType: "image/webp", extension: ".webp", matches: (bytes) => bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP" },
} satisfies Record<string, Kind>;

export const documentKinds = [kinds.pdf, kinds.jpeg, kinds.png];
export const imageKinds = [kinds.jpeg, kinds.png, kinds.webp];

const zipSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const oleSignature = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const materialTypes: Record<string, string> = {
  ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint", ".doc": "application/msword", ".xls": "application/vnd.ms-excel",
  ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".mp3": "audio/mpeg",
};

/** Teaching materials: documents, presentations, spreadsheets, images, video and audio. The file's bytes must match its extension. */
export async function validateMaterial(value: FormDataEntryValue | null, maxBytes: number): Promise<ValidatedUpload> {
  if (!(value instanceof File) || value.size === 0) throw new HttpError(400, "Choose a file to upload.");
  if (value.size > maxBytes) throw new HttpError(413, `Files must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller.`);
  const name = value.name.replace(/[\u0000-\u001f\u007f/\\]/g, "").trim().slice(0, 200) || "file";
  const extension = path.extname(name).toLowerCase();
  const contentType = materialTypes[extension];
  if (!contentType) throw new HttpError(415, "Upload a PDF, presentation, document, spreadsheet, image, video (MP4, MOV, WebM), or MP3 file.");
  const bytes = Buffer.from(await value.arrayBuffer());
  const head = bytes.subarray(0, 12);
  const ok = contentType === "application/pdf" ? kinds.pdf.matches(bytes)
    : contentType === "image/jpeg" ? kinds.jpeg.matches(bytes)
    : contentType === "image/png" ? kinds.png.matches(bytes)
    : contentType === "image/webp" ? kinds.webp.matches(bytes)
    : extension === ".pptx" || extension === ".docx" || extension === ".xlsx" ? head.subarray(0, 4).equals(zipSignature)
    : extension === ".ppt" || extension === ".doc" || extension === ".xls" ? head.subarray(0, 8).equals(oleSignature)
    : extension === ".mp4" || extension === ".mov" ? head.subarray(4, 8).toString("latin1") === "ftyp"
    : extension === ".webm" ? head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    : head.subarray(0, 3).toString("latin1") === "ID3" || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0);
  if (!ok) throw new HttpError(415, "The file's content does not match its type.");
  return { buffer: bytes, name, contentType, extension, size: value.size };
}

/** Rejects an oversized upload from its Content-Length header, before the body is read into memory. */
export function assertBodyWithin(request: Request, maxFileBytes: number) {
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0) throw new HttpError(411, "The upload must state its size.");
  if (length > maxFileBytes + 64 * 1024) throw new HttpError(413, `Files must be ${Math.round(maxFileBytes / 1024 / 1024)} MB or smaller.`);
}

export type ValidatedUpload = { buffer: Buffer; name: string; contentType: string; extension: string; size: number };

/** Checks the size and the file's real content (not just the browser-supplied type). */
export async function validateUpload(value: FormDataEntryValue | null, allowed: Kind[], maxBytes: number, label: string): Promise<ValidatedUpload> {
  if (!(value instanceof File) || value.size === 0) throw new HttpError(400, `Choose a ${label} file.`);
  if (value.size > maxBytes) throw new HttpError(413, `Files must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller.`);
  const buffer = Buffer.from(await value.arrayBuffer());
  const kind = allowed.find((candidate) => candidate.matches(buffer));
  if (!kind) throw new HttpError(415, `Only ${label} files are accepted.`);
  const name = value.name.replace(/[\u0000-\u001f\u007f/\\]/g, "").trim().slice(0, 200) || `file${kind.extension}`;
  return { buffer, name, contentType: kind.contentType, extension: kind.extension, size: value.size };
}

function absolutePath(relativePath: string) {
  const resolved = path.resolve(/*turbopackIgnore: true*/ uploadRoot, relativePath);
  if (!resolved.startsWith(uploadRoot + path.sep)) throw new Error("Upload path escapes the upload directory.");
  return resolved;
}

/** Writes the file under a random name and returns its path relative to the upload root. */
export async function saveUpload(folder: string, upload: ValidatedUpload) {
  const relativePath = path.posix.join(folder, `${randomUUID()}${upload.extension}`);
  const target = absolutePath(relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, upload.buffer);
  return relativePath;
}

export async function readUpload(relativePath: string) {
  try {
    return await readFile(absolutePath(relativePath));
  } catch {
    return null;
  }
}

export async function deleteUpload(relativePath: string | null | undefined) {
  if (relativePath) await unlink(absolutePath(relativePath)).catch(() => undefined);
}

/** Serves a stored file. The filename works for any language (RFC 6266 filename*), with an ASCII fallback. */
export async function fileResponse(relativePath: string, fileName: string, contentType: string, download: boolean) {
  const content = await readUpload(relativePath);
  if (!content) throw new HttpError(404, "The file is no longer available.");
  const asciiName = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "") || "file";
  return new Response(new Uint8Array(content), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(content.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
