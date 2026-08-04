/**
 * User message attachment schemas (MAG-1112)
 *
 * Attachments ride inside the E2E-encrypted user message payload as opaque
 * references to encrypted blobs stored via the generic uploads endpoint
 * (`POST /v1/uploads` / `GET /v1/uploads/:id/download`). The server only ever
 * sees ciphertext:
 *
 * 1. The client encrypts the raw file bytes (as an {@link AttachmentBlobPayload})
 *    with the per-session key and uploads the resulting envelope
 *    (`{ t: 'encrypted', c: <base64 ciphertext> }`) as an `application/json` file.
 * 2. The outgoing user message references the uploaded blob via
 *    {@link UserMessageAttachment} entries, which are themselves part of the
 *    E2E-encrypted message content.
 * 3. The CLI downloads the blob, decrypts it with the same session key, and
 *    forwards the file to the agent.
 *
 * @see apps/web/vue/src/services/sync/attachments.ts (upload side)
 * @see apps/cli/src/claude/utils/attachments.ts (download side)
 */

import { z } from 'zod';
import { STRING_LIMITS } from './constraints';

/**
 * Client-side limits for user message attachments.
 *
 * These bound memory usage during base64 handling and keep the encrypted
 * envelope well within the server's general upload limit (100 MB).
 */
export const ATTACHMENT_LIMITS = {
    /** Maximum number of attachments per user message */
    MAX_COUNT: 10,
    /** Maximum raw (pre-encryption) size per attachment in bytes (25 MB) */
    MAX_SIZE_BYTES: 25 * 1024 * 1024,
} as const;

/**
 * Reference to an encrypted attachment blob, embedded in the E2E-encrypted
 * user message payload.
 *
 * @example
 * ```typescript
 * const attachment = UserMessageAttachmentSchema.parse({
 *     blobId: 'clm8z0xyz000008l5g1h9e2ab',
 *     filename: 'screenshot.png',
 *     mimeType: 'image/png',
 *     size: 48213,
 * });
 * ```
 */
export const UserMessageAttachmentSchema = z.object({
    /** Upload ID of the encrypted blob (`GET /v1/uploads/:id/download`) */
    blobId: z.string().min(1).max(STRING_LIMITS.ID_MAX),
    /** Original filename (display + reconstruction hint) */
    filename: z.string().min(1).max(STRING_LIMITS.TITLE_MAX),
    /** MIME type of the raw (decrypted) file */
    mimeType: z.string().min(1).max(STRING_LIMITS.NAME_MAX),
    /** Raw (pre-encryption) size in bytes */
    size: z.number().int().nonnegative(),
});

export type UserMessageAttachment = z.infer<typeof UserMessageAttachmentSchema>;

/**
 * Decrypted content of an uploaded attachment blob.
 *
 * This is what the ciphertext in the uploaded envelope decrypts to; the `data`
 * field carries the raw file bytes as base64.
 */
export const AttachmentBlobPayloadSchema = z.object({
    /** Payload format version */
    v: z.literal(1),
    /** Original filename */
    filename: z.string().min(1).max(STRING_LIMITS.TITLE_MAX),
    /** MIME type of the raw file bytes */
    mimeType: z.string().min(1).max(STRING_LIMITS.NAME_MAX),
    /** Base64-encoded raw file bytes */
    data: z.string(),
});

export type AttachmentBlobPayload = z.infer<typeof AttachmentBlobPayloadSchema>;
