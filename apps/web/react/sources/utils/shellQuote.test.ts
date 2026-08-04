import { describe, expect, it } from 'vite-plus/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { quotePosixShellArg } from './shellQuote';

describe('quotePosixShellArg', () => {
    it('quotes shell metacharacters as one inert argument', () => {
        expect(quotePosixShellArg('$(touch${IFS}/tmp/pwned); "quoted"')).toBe(
            '\'$(touch${IFS}/tmp/pwned); "quoted"\''
        );
    });

    it('escapes embedded single quotes', () => {
        expect(quotePosixShellArg("it's safe")).toBe("'it'\\''s safe'");
    });

    it('rejects NUL bytes that shells cannot represent in arguments', () => {
        expect(() => quotePosixShellArg('bad\0path')).toThrow('NUL');
    });

    it('prevents command substitution when used in the git diff command', () => {
        const tempDir = mkdtempSync(join(tmpdir(), 'magic-agent-shell-quote-'));
        const markerPath = join(tempDir, 'pwned');

        try {
            execFileSync('git', ['init'], { cwd: tempDir, stdio: 'ignore' });
            const maliciousPath = `$(touch${'${IFS}'}${markerPath})`;
            const command = `git diff --no-ext-diff -- ${quotePosixShellArg(maliciousPath)}`;

            try {
                execFileSync('/bin/sh', ['-c', command], { cwd: tempDir, stdio: 'ignore' });
            } catch {
                // The path does not need to exist; this test only verifies that
                // the shell does not execute command substitution before git runs.
            }

            expect(existsSync(markerPath)).toBe(false);
        } finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
    });
});
