const UUID_SESSION_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_SESSION_ID_REGEX = /^[0-9a-f]{32}$/i;

/**
 * Returns true when the value is an opaque session id that can safely be used
 * as a single route parameter.
 */
export function isValidOpaqueSessionId(value: unknown): value is string {
    if (typeof value !== 'string') {
        return false;
    }

    return UUID_SESSION_ID_REGEX.test(value) || HEX_SESSION_ID_REGEX.test(value);
}
