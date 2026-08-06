/**
 * Attachment resolution for remote user messages (MAG-1112)
 *
 * User messages sent from the web client can reference E2E-encrypted
 * attachment blobs stored on the server (generic uploads endpoint). This
 * module downloads each blob, decrypts it with the per-session key, writes
 * the raw bytes to a temp file, and returns text notes referencing the local
 * paths so Claude Code can read the files with its own tools.
 *
 * The server only ever stores ciphertext; decryption happens here with the
 * same session key used for message content.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import axios from 'axios'
import { AttachmentBlobPayloadSchema, type UserMessageAttachment } from '@magic-agent/protocol'
import { decrypt, decodeBase64 } from '@/api/encryption'
import { configuration } from '@/configuration'
import { logger } from '@/ui/logger'

export interface AttachmentContext {
    /** Bearer token for downloading blobs from the server */
    token: string
    /** Per-session encryption key (same key used for message content) */
    encryptionKey: Uint8Array
    /** Encryption variant matching the session */
    encryptionVariant: 'legacy' | 'dataKey'
}

/** Temp directories created for resolved attachments, removed on session cleanup */
const createdAttachmentDirectories = new Set<string>()

/**
 * Remove all attachment temp directories created during this process.
 *
 * Never throws: cleanup failures are logged and ignored so session shutdown
 * is never blocked by a stray temp file.
 */
export async function cleanupAttachmentDirectories(): Promise<void> {
    const directories = [...createdAttachmentDirectories]
    createdAttachmentDirectories.clear()
    await Promise.all(directories.map(async (directory) => {
        try {
            await rm(directory, { recursive: true, force: true })
        } catch (error) {
            logger.debug(`[attachments] Failed to remove attachment directory ${directory}:`, error)
        }
    }))
}

/**
 * Sanitize an attachment filename for safe use as a local file name.
 * Strips path separators, control characters, and leading dots.
 */
export function sanitizeAttachmentFilename(filename: string): string {
    const cleaned = filename
        .replace(/[/\\]/g, '_')
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f]/g, '')
        .trim()
        .replace(/^\.+/, '')
    return (cleaned || 'attachment').slice(0, 128)
}

/**
 * Pick a unique file name within a single message's attachment directory.
 */
export function uniqueAttachmentFilename(filename: string, used: Set<string>): string {
    if (!used.has(filename)) {
        used.add(filename)
        return filename
    }
    const dotIndex = filename.lastIndexOf('.')
    const stem = dotIndex > 0 ? filename.slice(0, dotIndex) : filename
    const ext = dotIndex > 0 ? filename.slice(dotIndex) : ''
    let counter = 1
    let candidate = `${stem}-${counter}${ext}`
    while (used.has(candidate)) {
        counter += 1
        candidate = `${stem}-${counter}${ext}`
    }
    used.add(candidate)
    return candidate
}

/**
 * Append attachment notes to the user's message text.
 */
export function appendAttachmentNotes(text: string, notes: string[]): string {
    if (notes.length === 0) {
        return text
    }
    const block = notes.join('\n')
    return text.trim().length > 0 ? `${text}\n\n${block}` : block
}

/**
 * Download, decrypt, and persist attachments to temp files.
 *
 * Never throws: failures degrade to an "[Attachment unavailable: ...]" note so
 * the surrounding message is still delivered to Claude Code.
 */
export async function resolveAttachments(
    attachments: UserMessageAttachment[],
    context: AttachmentContext
): Promise<string[]> {
    const directory = join(tmpdir(), 'happy-attachments', randomUUID())
    const usedNames = new Set<string>()
    let directoryCreated = false
    const notes: string[] = []

    for (const attachment of attachments) {
        const filename = uniqueAttachmentFilename(
            sanitizeAttachmentFilename(attachment.filename),
            usedNames
        )
        try {
            const url = `${configuration.serverUrl}/v1/uploads/${encodeURIComponent(attachment.blobId)}/download`
            const response = await axios.get<{ t?: string; c?: string }>(url, {
                headers: { 'Authorization': `Bearer ${context.token}` },
                responseType: 'json',
                // Bound response buffering: the largest legitimate envelope is a
                // 25 MB attachment after base64 (~34 MB) plus encryption and JSON
                // overhead, so 64 MB gives ample headroom while preventing an
                // oversized blob from exhausting memory.
                maxContentLength: 64 * 1024 * 1024
            })
            const envelope = response.data
            if (!envelope || envelope.t !== 'encrypted' || typeof envelope.c !== 'string') {
                throw new Error('Unexpected attachment envelope shape')
            }

            const decrypted = decrypt(context.encryptionKey, context.encryptionVariant, decodeBase64(envelope.c))
            const payload = AttachmentBlobPayloadSchema.parse(decrypted)

            if (!directoryCreated) {
                await mkdir(directory, { recursive: true })
                directoryCreated = true
                createdAttachmentDirectories.add(directory)
            }
            const filePath = join(directory, filename)
            await writeFile(filePath, Buffer.from(payload.data, 'base64'))
            notes.push(`[Attached file: ${filePath} (${payload.mimeType})]`)
            logger.debug(`[attachments] Resolved attachment ${attachment.blobId} to ${filePath}`)
        } catch (error) {
            logger.debug(`[attachments] Failed to resolve attachment ${attachment.blobId}:`, error)
            notes.push(`[Attachment unavailable: ${filename}]`)
        }
    }

    return notes
}
