/**
 * @happy/protocol - Shared protocol types for Happy monorepo
 *
 * This package provides Zod schemas and TypeScript types for the Happy sync protocol.
 * It serves as the single source of truth for:
 * - Update events (persistent state changes)
 * - Ephemeral events (real-time status updates)
 * - Payload wrappers (sequencing containers)
 * - Common types (GitHubProfile, ImageRef, etc.)
 *
 * @example
 * ```typescript
 * import { ApiUpdateSchema, type ApiUpdate } from '@happy/protocol';
 *
 * // Validate incoming update
 * const result = ApiUpdateSchema.safeParse(data);
 * if (result.success) {
 *     const update: ApiUpdate = result.data;
 *     switch (update.t) {
 *         case 'new-message':
 *             console.log('Session:', update.sid);
 *             break;
 *         // ...
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

// Validation constraints (security-focused limits)
export * from './constraints';

// Common types used across the protocol
export * from './common';

// Update event schemas (persistent)
export * from './updates';

// Ephemeral event schemas (transient)
export * from './ephemeral';

// Payload wrapper schemas
export * from './payloads';

// MCP state schemas for CLI-to-App sync
export * from './mcp';

// Type-safe accessor helpers for session and machine IDs
export * from './helpers';

// Usage limits schemas for plan and rate limiting data
export * from './usageLimits';

// Session sharing schemas for sharing sessions with other users
export * from './sharing';

// User message attachment schemas (encrypted blob references)
export * from './attachments';

// Agent Client Protocol (ACP) schemas for universal agent communication
export * from './acp';
