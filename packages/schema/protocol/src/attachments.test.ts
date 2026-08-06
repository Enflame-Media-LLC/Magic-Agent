import { describe, it, expect } from 'vite-plus/test';
import {
    ATTACHMENT_LIMITS,
    AttachmentBlobPayloadSchema,
    UserMessageAttachmentSchema,
} from './attachments';
import { STRING_LIMITS } from './constraints';

describe('UserMessageAttachmentSchema', () => {
    const validAttachment = {
        blobId: 'clm8z0xyz000008l5g1h9e2ab',
        filename: 'screenshot.png',
        mimeType: 'image/png',
        size: 48213,
    };

    it('validates a well-formed attachment reference', () => {
        const result = UserMessageAttachmentSchema.safeParse(validAttachment);
        expect(result.success).toBe(true);
    });

    it('rejects an empty blobId', () => {
        const result = UserMessageAttachmentSchema.safeParse({
            ...validAttachment,
            blobId: '',
        });
        expect(result.success).toBe(false);
    });

    it('rejects a blobId over ID_MAX', () => {
        const result = UserMessageAttachmentSchema.safeParse({
            ...validAttachment,
            blobId: 'a'.repeat(STRING_LIMITS.ID_MAX + 1),
        });
        expect(result.success).toBe(false);
    });

    it('rejects an empty filename', () => {
        const result = UserMessageAttachmentSchema.safeParse({
            ...validAttachment,
            filename: '',
        });
        expect(result.success).toBe(false);
    });

    it('rejects a filename over TITLE_MAX', () => {
        const result = UserMessageAttachmentSchema.safeParse({
            ...validAttachment,
            filename: 'a'.repeat(STRING_LIMITS.TITLE_MAX + 1),
        });
        expect(result.success).toBe(false);
    });

    it('rejects a negative size', () => {
        const result = UserMessageAttachmentSchema.safeParse({
            ...validAttachment,
            size: -1,
        });
        expect(result.success).toBe(false);
    });

    it('rejects a size over MAX_SIZE_BYTES', () => {
        const result = UserMessageAttachmentSchema.safeParse({
            ...validAttachment,
            size: ATTACHMENT_LIMITS.MAX_SIZE_BYTES + 1,
        });
        expect(result.success).toBe(false);
    });

    it('rejects a non-integer size', () => {
        const result = UserMessageAttachmentSchema.safeParse({
            ...validAttachment,
            size: 1.5,
        });
        expect(result.success).toBe(false);
    });

    it('rejects a missing mimeType', () => {
        const { mimeType: _mimeType, ...rest } = validAttachment;
        const result = UserMessageAttachmentSchema.safeParse(rest);
        expect(result.success).toBe(false);
    });
});

describe('AttachmentBlobPayloadSchema', () => {
    const validPayload = {
        v: 1,
        filename: 'notes.txt',
        mimeType: 'text/plain',
        data: 'aGVsbG8gd29ybGQ=',
    };

    it('validates a well-formed blob payload', () => {
        const result = AttachmentBlobPayloadSchema.safeParse(validPayload);
        expect(result.success).toBe(true);
    });

    it('rejects an unknown payload version', () => {
        const result = AttachmentBlobPayloadSchema.safeParse({
            ...validPayload,
            v: 2,
        });
        expect(result.success).toBe(false);
    });

    it('rejects a missing data field', () => {
        const { data: _data, ...rest } = validPayload;
        const result = AttachmentBlobPayloadSchema.safeParse(rest);
        expect(result.success).toBe(false);
    });

    it('rejects data that is not valid base64', () => {
        const result = AttachmentBlobPayloadSchema.safeParse({
            ...validPayload,
            data: 'not base64!!',
        });
        expect(result.success).toBe(false);
    });

    it('accepts an empty data field (zero-byte file)', () => {
        const result = AttachmentBlobPayloadSchema.safeParse({
            ...validPayload,
            data: '',
        });
        expect(result.success).toBe(true);
    });
});

describe('ATTACHMENT_LIMITS', () => {
    it('exposes sane client-side limits', () => {
        expect(ATTACHMENT_LIMITS.MAX_COUNT).toBeGreaterThan(0);
        expect(ATTACHMENT_LIMITS.MAX_SIZE_BYTES).toBeGreaterThan(0);
        expect(ATTACHMENT_LIMITS.MAX_DATA_BASE64_LENGTH).toBe(
            4 * Math.ceil(ATTACHMENT_LIMITS.MAX_SIZE_BYTES / 3),
        );
    });
});
