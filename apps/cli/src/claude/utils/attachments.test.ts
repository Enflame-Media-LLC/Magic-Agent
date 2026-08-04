/**
 * Tests for user message attachment helpers (MAG-1112)
 *
 * Network-dependent resolution (blob download + decryption) is covered by
 * integration flows; these tests verify the pure helpers and the extended
 * user message schema.
 */
import { describe, it, expect } from 'vite-plus/test'
import {
    appendAttachmentNotes,
    sanitizeAttachmentFilename,
    uniqueAttachmentFilename
} from './attachments'
import { UserMessageSchema } from '@/api/types'

describe('sanitizeAttachmentFilename', () => {
    it('keeps ordinary filenames intact', () => {
        expect(sanitizeAttachmentFilename('screenshot.png')).toBe('screenshot.png')
    })

    it('strips path separators', () => {
        expect(sanitizeAttachmentFilename('../../etc/passwd')).toBe('_.._etc_passwd')
        expect(sanitizeAttachmentFilename('a\\b/c.txt')).toBe('a_b_c.txt')
    })

    it('strips leading dots to avoid hidden files', () => {
        expect(sanitizeAttachmentFilename('.env')).toBe('env')
    })

    it('strips control characters', () => {
        expect(sanitizeAttachmentFilename('a\u0000b\u001fc.txt')).toBe('abc.txt')
    })

    it('falls back to a default name when empty', () => {
        expect(sanitizeAttachmentFilename('   ')).toBe('attachment')
    })

    it('caps length at 128 characters', () => {
        expect(sanitizeAttachmentFilename('a'.repeat(300)).length).toBe(128)
    })
})

describe('uniqueAttachmentFilename', () => {
    it('returns the name unchanged when unused', () => {
        const used = new Set<string>()
        expect(uniqueAttachmentFilename('a.png', used)).toBe('a.png')
    })

    it('suffixes duplicates before the extension', () => {
        const used = new Set<string>()
        expect(uniqueAttachmentFilename('a.png', used)).toBe('a.png')
        expect(uniqueAttachmentFilename('a.png', used)).toBe('a-1.png')
        expect(uniqueAttachmentFilename('a.png', used)).toBe('a-2.png')
    })

    it('handles extensionless names', () => {
        const used = new Set<string>()
        expect(uniqueAttachmentFilename('notes', used)).toBe('notes')
        expect(uniqueAttachmentFilename('notes', used)).toBe('notes-1')
    })
})

describe('appendAttachmentNotes', () => {
    it('returns the text unchanged when there are no notes', () => {
        expect(appendAttachmentNotes('hello', [])).toBe('hello')
    })

    it('appends notes after a blank line', () => {
        expect(appendAttachmentNotes('hello', ['[Attached file: /tmp/a.png (image/png)]'])).toBe(
            'hello\n\n[Attached file: /tmp/a.png (image/png)]'
        )
    })

    it('uses notes alone for attachment-only messages', () => {
        expect(appendAttachmentNotes('   ', ['[Attached file: /tmp/a.png (image/png)]'])).toBe(
            '[Attached file: /tmp/a.png (image/png)]'
        )
    })
})

describe('UserMessageSchema with attachments (MAG-1112)', () => {
    it('parses a message without attachments (backward compatible)', () => {
        const result = UserMessageSchema.safeParse({
            role: 'user',
            content: { type: 'text', text: 'hello' }
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.attachments).toBeUndefined()
        }
    })

    it('parses a message with attachment references', () => {
        const result = UserMessageSchema.safeParse({
            role: 'user',
            content: { type: 'text', text: 'see attached' },
            attachments: [{
                blobId: 'clm8z0xyz000008l5g1h9e2ab',
                filename: 'screenshot.png',
                mimeType: 'image/png',
                size: 48213
            }],
            meta: { sentFrom: 'web', permissionMode: 'default' }
        })
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.attachments).toHaveLength(1)
            expect(result.data.attachments?.[0]?.blobId).toBe('clm8z0xyz000008l5g1h9e2ab')
        }
    })

    it('rejects malformed attachment references', () => {
        const result = UserMessageSchema.safeParse({
            role: 'user',
            content: { type: 'text', text: 'see attached' },
            attachments: [{ blobId: '', filename: 'a.png', mimeType: 'image/png', size: 1 }]
        })
        expect(result.success).toBe(false)
    })
})
