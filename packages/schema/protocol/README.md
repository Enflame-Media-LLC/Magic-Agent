# @happy/protocol

Shared protocol types for the Happy monorepo. This package provides **Zod schemas** and **TypeScript types** for the Happy sync protocol, serving as the single source of truth across all four consumer projects.

## Installation

This package is automatically available within the Happy monorepo via **yarn workspaces**. No additional installation is required.

```bash
# From monorepo root - already included in workspace
yarn install
```

## Usage

### ESM (happy-cli, happy-app, happy-server-workers)

```typescript
import {
  ApiUpdateSchema,
  ApiEphemeralUpdateSchema,
  type ApiUpdate,
  type ApiEphemeralUpdate
} from '@happy/protocol';

// Validate incoming update
const result = ApiUpdateSchema.safeParse(data);
if (result.success) {
  const update: ApiUpdate = result.data;
  switch (update.t) {
    case 'new-message':
    case 'new-session':
    case 'update-session':
    case 'delete-session':
      // All session updates use 'sid' (standardized in HAP-654)
      console.log('Session:', update.sid);
      break;
    // ... handle other types (see Field Name Reference below)
  }
}
```

### CommonJS (happy-server)

```javascript
const { ApiUpdateSchema, ApiEphemeralUpdateSchema } = require('@happy/protocol');

// Same usage as ESM
const result = ApiUpdateSchema.safeParse(data);
```

## Available Exports

### Update Schemas (Persistent Events)

These are state changes that are stored and synced across devices.

| Schema | Type | Description |
|--------|------|-------------|
| `ApiUpdateSchema` | `ApiUpdate` | Discriminated union of all update types |
| `ApiUpdateNewMessageSchema` | `ApiUpdateNewMessage` | New encrypted message in session |
| `ApiUpdateNewSessionSchema` | `ApiUpdateNewSession` | New session created |
| `ApiDeleteSessionSchema` | `ApiDeleteSession` | Session archived/deleted |
| `ApiUpdateSessionStateSchema` | `ApiUpdateSessionState` | Session state change |
| `ApiUpdateAccountSchema` | `ApiUpdateAccount` | Account metadata update |
| `ApiNewMachineSchema` | `ApiNewMachine` | New machine registered |
| `ApiUpdateMachineStateSchema` | `ApiUpdateMachineState` | Machine state change |
| `ApiNewArtifactSchema` | `ApiNewArtifact` | New artifact created |
| `ApiUpdateArtifactSchema` | `ApiUpdateArtifact` | Artifact updated |
| `ApiDeleteArtifactSchema` | `ApiDeleteArtifact` | Artifact deleted |
| `ApiRelationshipUpdatedSchema` | `ApiRelationshipUpdated` | Friend relationship change |
| `ApiNewFeedPostSchema` | `ApiNewFeedPost` | Activity feed post |
| `ApiKvBatchUpdateSchema` | `ApiKvBatchUpdate` | KV store batch update |

### Ephemeral Schemas (Transient Events)

Real-time status updates that don't require persistence.

| Schema | Type | Description |
|--------|------|-------------|
| `ApiEphemeralUpdateSchema` | `ApiEphemeralUpdate` | Union of all ephemeral types |
| `ApiEphemeralActivityUpdateSchema` | `ApiEphemeralActivityUpdate` | Session activity status |
| `ApiEphemeralUsageUpdateSchema` | `ApiEphemeralUsageUpdate` | Token/cost usage |
| `ApiEphemeralMachineActivityUpdateSchema` | `ApiEphemeralMachineActivityUpdate` | Machine activity |
| `ApiEphemeralMachineStatusUpdateSchema` | `ApiEphemeralMachineStatusUpdate` | Machine online/offline |

### Payload Wrappers

Container schemas for WebSocket message sequencing.

| Schema | Type | Description |
|--------|------|-------------|
| `ApiUpdateContainerSchema` | `ApiUpdateContainer` | Sequenced update wrapper |
| `UpdatePayloadSchema` | `UpdatePayload` | Server-side wire format |
| `EphemeralPayloadSchema` | `EphemeralPayload` | Ephemeral wrapper |

### Common Types

Shared types used across the protocol.

| Schema | Type | Description |
|--------|------|-------------|
| `GitHubProfileSchema` | `GitHubProfile` | GitHub OAuth profile data |
| `ImageRefSchema` | `ImageRef` | Image/avatar reference |
| `RelationshipStatusSchema` | `RelationshipStatus` | User relationship enum |
| `UserProfileSchema` | `UserProfile` | Social user profile |
| `FeedBodySchema` | `FeedBody` | Activity feed content |
| `EncryptedContentSchema` | `EncryptedContent` | Encrypted payload wrapper |
| `VersionedValueSchema` | `VersionedValue` | Optimistic concurrency value |
| `NullableVersionedValueSchema` | `NullableVersionedValue` | Nullable versioned value |

### Attachment Schemas

Types for user message attachments carried as encrypted blob references (MAG-1112).

| Schema | Type | Description |
|--------|------|-------------|
| `UserMessageAttachmentSchema` | `UserMessageAttachment` | Encrypted-blob reference embedded in the E2E-encrypted user message payload |
| `AttachmentBlobPayloadSchema` | `AttachmentBlobPayload` | Decrypted attachment blob content (base64 file bytes) |
| `ATTACHMENT_LIMITS` | — | Client-side count/size limits for attachments |

### Session Sharing Schemas

Types for sharing sessions with other users (HAP-766).

| Schema | Type | Description |
|--------|------|-------------|
| `SessionSharePermissionSchema` | `SessionSharePermission` | Permission enum (view_only, view_and_chat) |
| `SessionShareEntrySchema` | `SessionShareEntry` | Individual user share with profile |
| `SessionShareUrlConfigSchema` | `SessionShareUrlConfig` | Public URL sharing configuration |
| `InvitationStatusSchema` | `InvitationStatus` | Invitation status enum |
| `SessionShareInvitationSchema` | `SessionShareInvitation` | Email invitation with status |
| `SessionShareSettingsSchema` | `SessionShareSettings` | Combined sharing state container |
| `AddSessionShareRequestSchema` | `AddSessionShareRequest` | Add share by userId or email |
| `UpdateSessionShareRequestSchema` | `UpdateSessionShareRequest` | Update permission level |
| `RemoveSessionShareRequestSchema` | `RemoveSessionShareRequest` | Remove share access |
| `UpdateUrlSharingRequestSchema` | `UpdateUrlSharingRequest` | Configure URL sharing |
| `RevokeInvitationRequestSchema` | `RevokeInvitationRequest` | Revoke pending invitation |
| `ResendInvitationRequestSchema` | `ResendInvitationRequest` | Resend invitation email |

### Usage Limits Schemas

Types for plan and rate limiting data.

| Schema | Type | Description |
|--------|------|-------------|
| `UsageLimitSchema` | `UsageLimit` | Single usage limit entry |
| `PlanLimitsResponseSchema` | `PlanLimitsResponse` | Complete plan limits response |

## Field Name Reference

### Session ID Field Names

All session-related schemas now consistently use `sid` (standardized in HAP-654):

| Schema | Update Type | Field Name | Discriminator | Notes |
|--------|-------------|------------|---------------|-------|
| `ApiUpdateNewSessionSchema` | `new-session` | `sid` | `t` | Persistent update |
| `ApiUpdateSessionStateSchema` | `update-session` | `sid` | `t` | Persistent update |
| `ApiUpdateNewMessageSchema` | `new-message` | `sid` | `t` | Persistent update |
| `ApiDeleteSessionSchema` | `delete-session` | `sid` | `t` | Persistent update |
| `ApiEphemeralActivityUpdateSchema` | `activity` | `sid` | `type` | Ephemeral event |
| `ApiEphemeralUsageUpdateSchema` | `usage` | `sid` | `type` | Ephemeral event |

**Pattern Summary:**
- **`sid`**: All session schemas now consistently use `sid` (standardized in HAP-654)

### Machine ID Field Names

The machine ID is represented with different field names:

| Schema | Update Type | Field Name | Discriminator | Notes |
|--------|-------------|------------|---------------|-------|
| `ApiNewMachineSchema` | `new-machine` | `machineId` | `t` | Persistent update |
| `ApiUpdateMachineStateSchema` | `update-machine` | `machineId` | `t` | Persistent update |
| `ApiEphemeralMachineStatusUpdateSchema` | `machine-status` | `machineId` | `type` | Ephemeral event |
| `ApiEphemeralMachineActivityUpdateSchema` | `machine-activity` | `machineId` | `type` | Ephemeral event |

**Pattern Summary:**
- **`machineId`**: All machine schemas now consistently use `machineId` (standardized in HAP-655)

### Discriminator Fields

**Important:** Persistent updates and ephemeral events use different discriminator field names:

| Category | Discriminator Field | Example |
|----------|---------------------|---------|
| Persistent Updates | `t` | `update.t === 'new-session'` |
| Ephemeral Events | `type` | `event.type === 'activity'` |

### Historical Context

The original naming inconsistencies (HAP-383) have been fully resolved:
- **Session ID**: All session schemas now use `sid` (HAP-654) - previously some used `id`
- **Machine ID**: All machine schemas now use `machineId` (HAP-655) - previously `machine-activity` used `id`

### Consumer Code Example

When handling updates, always check the discriminator (`t` or `type`) first:

```typescript
import type { ApiUpdate, ApiEphemeralUpdate } from '@happy/protocol';

// Persistent updates use 't' discriminator
function handleUpdate(update: ApiUpdate) {
  switch (update.t) {
    case 'new-message':
    case 'delete-session':
    case 'new-session':
    case 'update-session':
      // All session updates now use 'sid' (HAP-654)
      const sessionId = update.sid;
      break;
    case 'new-machine':
    case 'update-machine':
      // All machine updates use 'machineId'
      const machineId = update.machineId;
      break;
  }
}

// Ephemeral events use 'type' discriminator
function handleEphemeral(event: ApiEphemeralUpdate) {
  switch (event.type) {
    case 'activity':
    case 'usage':
      // All session ephemerals now use 'sid' (HAP-654)
      const sessionId = event.sid;
      break;
    case 'machine-activity':
    case 'machine-status':
      // All machine ephemerals now use 'machineId' (HAP-655)
      const machineId = event.machineId;
      break;
  }
}
```

## Type Guard Patterns

```typescript
import { ApiUpdateSchema, type ApiUpdate, type ApiUpdateType } from '@happy/protocol';

// Type narrowing with switch
function handleUpdate(update: ApiUpdate) {
  switch (update.t) {
    case 'new-message':
      // TypeScript knows: update is ApiUpdateNewMessage
      console.log(update.sid, update.message);
      break;
    case 'new-session':
      // TypeScript knows: update is ApiUpdateNewSession
      console.log(update.sid, update.metadata);
      break;
  }
}

// Available type discriminators
const updateTypes: ApiUpdateType[] = [
  'new-message', 'new-session', 'delete-session',
  'update-session', 'update-account', 'new-machine',
  // ... etc
];
```

## Building

```bash
# From packages/schema/protocol
yarn build        # Build ESM + CJS output
yarn typecheck    # Type check without emitting
yarn clean        # Remove dist folder

# From monorepo root
yarn build:protocol
yarn typecheck:protocol
```

## Output Files

After building, the `dist/` folder contains:

| File | Format | Purpose |
|------|--------|---------|
| `index.js` | ESM | Modern ES modules |
| `index.cjs` | CommonJS | Legacy require() support |
| `index.d.ts` | TypeScript | ESM type declarations |
| `index.d.cts` | TypeScript | CJS type declarations |
| `index.js.map` | Sourcemap | ESM debugging |
| `index.cjs.map` | Sourcemap | CJS debugging |

## Peer Dependencies

This package requires `zod@^3.0.0` as a peer dependency. All consumer projects in the monorepo already have zod installed.

## Why This Package Exists

The Happy monorepo had ~95 duplicated types across four projects, causing schema drift bugs. The most notable was the `sessionId` vs `sid` field naming inconsistency (see HAP-383).

This package:
1. **Single source of truth** - All protocol types defined once
2. **Zod validation** - Runtime validation matches TypeScript types
3. **Dual format** - Works with both ESM and CommonJS projects
4. **Migration path** - Projects can adopt gradually

## Migration Guide

When migrating existing code to use `@happy/protocol`:

1. **Import from package** instead of local types:
   ```typescript
   // Before
   import { ApiUpdate } from '../api/types';

   // After
   import { ApiUpdate } from '@happy/protocol';
   ```

2. **Remove duplicate definitions** from local files

3. **Run typecheck** to catch any mismatches

See individual project integration issues (HAP-385 through HAP-388) for detailed migration steps.

## Related Issues

- **HAP-383**: RFC - Shared Types Package (complete)
- **HAP-384**: Set up yarn workspaces (this package)
- **HAP-385**: Integrate in happy-app
- **HAP-386**: Integrate in happy-cli
- **HAP-387**: Integrate in happy-server-workers
- **HAP-388**: Integrate in happy-server
- **HAP-389**: CI validation

## License

MIT
