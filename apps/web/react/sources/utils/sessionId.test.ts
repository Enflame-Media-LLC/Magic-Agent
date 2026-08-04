import { describe, expect, it } from 'vite-plus/test';
import { isValidOpaqueSessionId } from './sessionId';

describe('isValidOpaqueSessionId', () => {
    it('accepts UUID and 32-character hexadecimal session IDs', () => {
        expect(isValidOpaqueSessionId('93a9705e-bc6a-406d-8dce-8acc014dedbd')).toBe(true);
        expect(isValidOpaqueSessionId('93A9705E-BC6A-406D-8DCE-8ACC014DEDBD')).toBe(true);
        expect(isValidOpaqueSessionId('93a9705ebc6a406d8dce8acc014dedbd')).toBe(true);
    });

    it('rejects non-string and empty values', () => {
        expect(isValidOpaqueSessionId(undefined)).toBe(false);
        expect(isValidOpaqueSessionId(null)).toBe(false);
        expect(isValidOpaqueSessionId(123)).toBe(false);
        expect(isValidOpaqueSessionId('')).toBe(false);
    });

    it('rejects route metacharacters and dot segments', () => {
        expect(isValidOpaqueSessionId('93a9705e-bc6a-406d-8dce-8acc014dedbd/file')).toBe(false);
        expect(isValidOpaqueSessionId('93a9705e-bc6a-406d-8dce-8acc014dedbd?path=abc')).toBe(false);
        expect(isValidOpaqueSessionId('93a9705e-bc6a-406d-8dce-8acc014dedbd#file')).toBe(false);
        expect(isValidOpaqueSessionId('93a9705e-bc6a-406d-8dce-8acc014dedbd%2Ffile')).toBe(false);
        expect(isValidOpaqueSessionId('../93a9705e-bc6a-406d-8dce-8acc014dedbd')).toBe(false);
    });
});
