/**
 * Quote a string as a single POSIX shell argument.
 *
 * This is only for legacy RPCs that accept command strings. Prefer argv-based
 * execution for new RPCs so untrusted values never pass through a shell.
 */
export function quotePosixShellArg(value: string): string {
    if (value.includes('\0')) {
        throw new Error('Shell arguments cannot contain NUL bytes');
    }

    return `'${value.replace(/'/g, `'\\''`)}'`;
}
