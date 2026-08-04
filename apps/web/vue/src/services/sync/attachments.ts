/**
 * Session attachment upload pipeline (MAG-1112)
 *
 * Encrypts attachment bytes with the per-session key (same E2E crypto as
 * message content) and uploads the resulting envelope to the generic uploads
 * endpoint. The server only ever stores ciphertext; the outgoing user message
 * references uploads by blob ID inside its own encrypted payload.
 */

import {
  ATTACHMENT_LIMITS,
  type AttachmentBlobPayload,
  type UserMessageAttachment,
} from "@magic-agent/protocol";
import { getApiBaseUrl } from "@/services/apiBase";
import { encryptSessionMessage } from "@/services/encryption/sessionDecryption";
import { secureStorage } from "@/services/storage";
import type { Session } from "@/stores/sessions";

/**
 * Outgoing file shape produced by PromptInput on submit (AI SDK `FileUIPart`
 * subset): `url` is a base64 `data:` URL (or `blob:` URL if conversion failed).
 */
export interface OutgoingFileAttachment {
  url?: string;
  mediaType?: string;
  filename?: string;
}

export type UploadAttachmentsResult =
  | { ok: true; attachments: UserMessageAttachment[] }
  | { ok: false; error: string };

interface UploadResponse {
  success?: boolean;
  file?: { id?: string };
  error?: string;
}

const DEFAULT_MIME = "application/octet-stream";
const MAX_FILENAME_LENGTH = 256;

function encodeBytesToBase64(bytes: Uint8Array): string {
  // Chunked to avoid call-stack limits with String.fromCharCode on large files
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ByteLength(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function normalizeFilename(filename: string | undefined, mimeType: string): string {
  const trimmed = filename?.trim();
  if (trimmed) {
    return trimmed.slice(0, MAX_FILENAME_LENGTH);
  }
  const extension = mimeType.split("/")[1]?.split("+")[0];
  return extension ? `attachment.${extension}` : "attachment";
}

async function readFileAsBase64(
  file: OutgoingFileAttachment,
): Promise<{ base64: string; mimeType: string } | null> {
  const url = file.url;
  if (!url) {
    return null;
  }

  if (url.startsWith("data:")) {
    const commaIndex = url.indexOf(",");
    if (commaIndex < 0 || !url.slice(0, commaIndex).includes(";base64")) {
      return null;
    }
    const mimeType =
      file.mediaType || url.slice(5, commaIndex).split(";")[0] || DEFAULT_MIME;
    return { base64: url.slice(commaIndex + 1), mimeType };
  }

  // Fallback for blob: URLs (when PromptInput's data-URL conversion failed)
  try {
    const response = await fetch(url);
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      base64: encodeBytesToBase64(bytes),
      mimeType: file.mediaType || DEFAULT_MIME,
    };
  } catch {
    return null;
  }
}

async function uploadEncryptedBlob(
  encryptedContent: string,
  filename: string,
  token: string,
): Promise<{ ok: true; blobId: string } | { ok: false; error: string }> {
  // The envelope mirrors the protocol's EncryptedContent shape and is uploaded
  // as application/json so it passes the server's content-type allowlist while
  // remaining opaque ciphertext.
  const envelope = JSON.stringify({ t: "encrypted", c: encryptedContent });
  const form = new FormData();
  form.append(
    "file",
    new File([envelope], `${filename}.encrypted.json`, { type: "application/json" }),
  );
  form.append("category", "files");

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/v1/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    return { ok: false, error: `Failed to upload attachment "${filename}"` };
  }

  if (!response.ok) {
    return { ok: false, error: `Failed to upload attachment "${filename}"` };
  }

  let result: UploadResponse;
  try {
    result = (await response.json()) as UploadResponse;
  } catch {
    return { ok: false, error: `Failed to upload attachment "${filename}"` };
  }

  if (!result.success || !result.file?.id) {
    return { ok: false, error: `Failed to upload attachment "${filename}"` };
  }

  return { ok: true, blobId: result.file.id };
}

/**
 * Encrypt and upload attachments for an outgoing session message.
 *
 * Returns blob references to embed in the encrypted message payload. Fails
 * atomically from the caller's perspective: any per-file failure aborts the
 * send so no message is delivered with silently missing attachments.
 */
export async function uploadSessionAttachments(
  session: Session,
  files: OutgoingFileAttachment[],
): Promise<UploadAttachmentsResult> {
  if (files.length === 0) {
    return { ok: true, attachments: [] };
  }

  if (files.length > ATTACHMENT_LIMITS.MAX_COUNT) {
    return {
      ok: false,
      error: `Too many attachments (max ${String(ATTACHMENT_LIMITS.MAX_COUNT)})`,
    };
  }

  const credentials = await secureStorage.getCredentials();
  if (!credentials?.token) {
    return { ok: false, error: "Not authenticated" };
  }

  const attachments: UserMessageAttachment[] = [];

  for (const file of files) {
    const contents = await readFileAsBase64(file);
    const filename = normalizeFilename(file.filename, contents?.mimeType ?? DEFAULT_MIME);
    if (!contents) {
      return { ok: false, error: `Failed to read attachment "${filename}"` };
    }

    const size = base64ByteLength(contents.base64);
    if (size > ATTACHMENT_LIMITS.MAX_SIZE_BYTES) {
      const maxMb = Math.round(ATTACHMENT_LIMITS.MAX_SIZE_BYTES / (1024 * 1024));
      return {
        ok: false,
        error: `Attachment "${filename}" exceeds the ${String(maxMb)}MB limit`,
      };
    }

    const payload: AttachmentBlobPayload = {
      v: 1,
      filename,
      mimeType: contents.mimeType,
      data: contents.base64,
    };

    const encrypted = await encryptSessionMessage(session, payload);
    if (!encrypted) {
      return { ok: false, error: `Failed to encrypt attachment "${filename}"` };
    }

    const uploaded = await uploadEncryptedBlob(encrypted, filename, credentials.token);
    if (!uploaded.ok) {
      return uploaded;
    }

    attachments.push({
      blobId: uploaded.blobId,
      filename,
      mimeType: contents.mimeType,
      size,
    });
  }

  return { ok: true, attachments };
}
