# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Navigation**: This is the root documentation. Each project has its own detailed CLAUDE.md—see [Project Documentation](#project-documentation) below.

## Project Overview

**Happy** is a mobile and web client for Claude Code and Codex, enabling remote control and session sharing across devices with end-to-end encryption. This is a TypeScript/Swift monorepo containing multiple applications and shared packages.

## Project Documentation

**⚠️ Always consult the project-specific CLAUDE.md when working within that project's directory.**

### Applications

| Project | Directory | Description | Documentation |
|---------|-----------|-------------|---------------|
| **happy-cli** | [`/apps/cli/`](./apps/cli/) | Node.js CLI wrapper for Claude Code | [`apps/cli/CLAUDE.md`](./apps/cli/CLAUDE.md) |
| **happy-app** | [`/apps/web/react/`](./apps/web/react/) | React Native mobile/web client (Expo) | [`apps/web/react/CLAUDE.md`](./apps/web/react/CLAUDE.md) |
| **happy-vue** | [`/apps/web/vue/`](./apps/web/vue/) | Vue.js web client (migration in progress) | [`apps/web/vue/CLAUDE.md`](./apps/web/vue/CLAUDE.md) |
| **happy-server** | [`/apps/server/docker/`](./apps/server/docker/) | Fastify backend API server | [`apps/server/docker/CLAUDE.md`](./apps/server/docker/CLAUDE.md) |
| **happy-server-workers** | [`/apps/server/workers/`](./apps/server/workers/) | Cloudflare Workers edge functions | [`apps/server/workers/CLAUDE.md`](./apps/server/workers/CLAUDE.md) |
| **happy-admin** | [`/apps/admin/web/`](./apps/admin/web/) | Admin dashboard Vue.js SPA (frontend-only) | [`apps/admin/web/CLAUDE.md`](./apps/admin/web/CLAUDE.md) |
| **happy-admin-api** | [`/apps/admin/api/`](./apps/admin/api/) | Admin dashboard API (Hono + Cloudflare Workers) | [`apps/admin/api/CLAUDE.md`](./apps/admin/api/CLAUDE.md) |
| **happy-macos** | [`/apps/macos/`](./apps/macos/) | Native macOS client (Swift/SwiftUI) | [`apps/macos/CLAUDE.md`](./apps/macos/CLAUDE.md) |
| **happy-ios** | [`/apps/mobile/ios/`](./apps/mobile/ios/) | Native iOS client (planned) | [`apps/mobile/ios/CLAUDE.md`](./apps/mobile/ios/CLAUDE.md) |
| **happy-android** | [`/apps/mobile/android/`](./apps/mobile/android/) | Native Android client (planned) | [`apps/mobile/android/CLAUDE.md`](./apps/mobile/android/CLAUDE.md) |

### Shared Packages

| Package | Directory | Description | Documentation |
|---------|-----------|-------------|---------------|
| **@magic-agent/protocol** | [`packages/schema/protocol/`](./packages/schema/protocol/) | Shared Zod schemas for API types | [`packages/schema/protocol/CLAUDE.md`](./packages/schema/protocol/CLAUDE.md) |
| **@magic-agent/errors** | [`packages/schema/errors/`](./packages/schema/errors/) | Unified error handling (AppError) | [`packages/schema/errors/CLAUDE.md`](./packages/schema/errors/CLAUDE.md) |
| **@happy/lint-rules** | [`dev/lint-rules/`](./dev/lint-rules/) | Custom oxlint/ESLint rules | [`dev/lint-rules/CLAUDE.md`](./dev/lint-rules/CLAUDE.md) |

### Additional Documentation

| Document | Location | Description |
|----------|----------|-------------|
| Encryption Architecture | [`docs/ENCRYPTION-ARCHITECTURE.md`](./docs/ENCRYPTION-ARCHITECTURE.md) | E2E encryption design |
| Error Codes | [`docs/errors/`](./docs/errors/) | CLI error code documentation |
| Shared Types RFC | [`docs/RFC-SHARED-TYPES-PACKAGE.md`](./docs/RFC-SHARED-TYPES-PACKAGE.md) | Design decision for @magic-agent/protocol |
| API Versioning | [`docs/API-VERSIONING.md`](./docs/API-VERSIONING.md) | API versioning strategy |
| Remote Logging | [`docs/REMOTE-LOGGING.md`](./docs/REMOTE-LOGGING.md) | Development debugging feature |
| Mutation Testing | [`docs/MUTATION-TESTING.md`](./docs/MUTATION-TESTING.md) | Mutation testing best practices |

## Monorepo Structure

```
/happy/
├── CLAUDE.md               # ← You are here (root documentation)
├── packages/               # Shared packages
│   └── schema/
│       ├── protocol/       # @magic-agent/protocol - Zod schemas for API types
│       │   └── CLAUDE.md   # Protocol package guidelines
│       └── errors/         # @magic-agent/errors - Unified error handling
│           └── CLAUDE.md   # Errors package guidelines
├── dev/
│   └── lint-rules/         # @happy/lint-rules - Custom oxlint/ESLint rules
│       └── CLAUDE.md       # Lint rules guidelines
├── apps/
│   ├── cli/                # Node.js CLI wrapper (ESM)
│   │   ├── src/            # TypeScript sources
│   │   │   └── daemon/     # Daemon subsystem (has own CLAUDE.md)
│   │   ├── bin/            # Executable scripts
│   │   └── CLAUDE.md       # CLI-specific guidelines ★
│   ├── web/
│   │   ├── react/          # Expo React Native (ESM)
│   │   │   ├── sources/    # TypeScript sources (note: not 'src')
│   │   │   └── CLAUDE.md   # App-specific guidelines ★
│   │   └── vue/            # Vue.js web client (migration)
│   │       ├── apps/       # Vue applications
│   │       ├── packages/   # Vue workspace packages
│   │       └── CLAUDE.md   # Vue-specific guidelines ★
│   ├── server/
│   │   ├── docker/         # Fastify server (ESM)
│   │   │   ├── sources/    # TypeScript sources (note: not 'src')
│   │   │   ├── prisma/     # Database schema
│   │   │   └── CLAUDE.md   # Server-specific guidelines ★
│   │   └── workers/        # Cloudflare Workers (ESM)
│   │       ├── src/        # TypeScript sources
│   │       ├── drizzle/    # D1 migrations
│   │       └── CLAUDE.md   # Workers-specific guidelines ★
│   ├── admin/
│   │   ├── web/            # Admin Dashboard (Vue.js SPA)
│   │   │   ├── src/        # Vue.js application
│   │   │   └── CLAUDE.md   # Dashboard guidelines ★
│   │   └── api/            # Admin API (Hono + Workers)
│   │       ├── src/        # TypeScript sources
│   │       ├── migrations/ # D1 migrations
│   │       └── CLAUDE.md   # API guidelines ★
│   ├── macos/              # Native macOS client (Swift/SwiftUI)
│   │   ├── Happy/          # Swift sources
│   │   ├── Happy.xcodeproj # Xcode project
│   │   └── CLAUDE.md       # macOS-specific guidelines ★
│   └── mobile/
│       ├── ios/            # Native iOS client (planned)
│       │   └── CLAUDE.md   # iOS guidelines ★
│       └── android/        # Native Android client (planned)
│           └── CLAUDE.md   # Android guidelines ★
├── docs/                   # Cross-project documentation
│   ├── ENCRYPTION-ARCHITECTURE.md
│   ├── API-VERSIONING.md
│   └── errors/             # CLI error code documentation
├── package.json            # Root workspaces config
└── yarn.lock               # Shared lockfile
```

> ★ = Primary development guidelines for each project

## Package Management

All projects use **yarn** (not npm). The monorepo uses **yarn workspaces** configured in the root `package.json` to:
- Share dependencies across projects (hoisted to root `node_modules/`)
- Link shared packages like `@magic-agent/protocol` via `workspace:*`
- Maintain a single `yarn.lock` for consistent dependency versions

## Shared Packages

Shared packages live in `packages/schema/` and are tracked in the `happy-shared` GitHub repository (separate from individual project repos). Each package has its own [`CLAUDE.md`](#shared-packages) with detailed development guidelines.

### @magic-agent/protocol

> **Full documentation**: [`packages/schema/protocol/CLAUDE.md`](./packages/schema/protocol/CLAUDE.md)

The `@magic-agent/protocol` package provides shared Zod schemas for:
- **API Updates**: Session, machine, message, artifact, account schemas
- **Ephemeral Events**: Real-time events like typing indicators, cost updates

**Usage:**
```typescript
import { ApiUpdateSchema, type ApiUpdate } from '@magic-agent/protocol';
```

**Building:**
```bash
yarn workspace @magic-agent/protocol build
yarn workspace @magic-agent/protocol typecheck
```

### @magic-agent/errors

> **Full documentation**: [`packages/schema/errors/CLAUDE.md`](./packages/schema/errors/CLAUDE.md)

The `@magic-agent/errors` package provides unified error handling:
- **AppError class**: Standardized error structure with error codes
- **Error codes**: Centralized error code constants

**Usage:**
```typescript
import { AppError, ErrorCodes } from '@magic-agent/errors';
```

**Building:**
```bash
yarn workspace @magic-agent/errors build
yarn workspace @magic-agent/errors typecheck
```

### @happy/lint-rules

> **Full documentation**: [`dev/lint-rules/CLAUDE.md`](./dev/lint-rules/CLAUDE.md)

The `@happy/lint-rules` package provides custom linting rules for oxlint and ESLint:
- **happy/github-casing**: Enforces "GitHub" casing in PascalCase identifiers (HAP-502)
- **happy/protocol-helpers**: Enforces `@magic-agent/protocol` ID accessor helper usage (HAP-658)

**Usage with oxlint:**
```json
{
    "jsPlugins": ["@happy/lint-rules"],
    "rules": {
        "happy/github-casing": "warn",
        "happy/protocol-helpers": "warn"
    }
}
```

### Consuming Shared Packages

Projects consume packages via workspace linking:
```json
{
  "dependencies": {
    "@magic-agent/protocol": "workspace:*",
    "@magic-agent/errors": "workspace:*"
  },
  "devDependencies": {
    "@happy/lint-rules": "workspace:*"
  }
}
```

## Git Repository Structure

The monorepo uses **multiple git repositories**:

| Repository | Tracks | GitHub |
|------------|--------|--------|
| `happy-shared` | Root configs, `packages/`, docs | [Enflame-Media/happy-shared](https://github.com/Enflame-Media/happy-shared) |
| `apps/web/react` | React Native mobile/web app | [Enflame-Media/happy](https://github.com/Enflame-Media/happy) |
| `apps/web/vue` | Vue.js web client | Individual repo |
| `apps/cli` | CLI wrapper code | Individual repo |
| `apps/server/docker` | Backend server code | Individual repo |
| `apps/server/workers` | Cloudflare Workers | Individual repo |
| `apps/admin/web` | Admin dashboard frontend | Individual repo |
| `apps/admin/api` | Admin dashboard API | Individual repo |
| `apps/macos` | macOS native client | Individual repo |

Each project directory has its own `.git/` - they are independent repositories.

## Development Workflow

### Working on a Single Project

Navigate to the project directory and follow its specific `CLAUDE.md`:

```bash
# CLI development
cd apps/cli
yarn build && yarn test

# Server (Docker/Fastify) development
cd apps/server/docker
yarn dev  # Uses .env.dev

# Server (Workers) development
cd apps/server/workers
yarn dev  # Uses .dev.vars

# React Native app development
cd apps/web/react
yarn start

# Vue.js app development
cd apps/web/vue
yarn dev:web

# Admin dashboard development
cd apps/admin/web && yarn dev
cd apps/admin/api && yarn dev  # Different ports

# macOS app development
cd apps/macos
open Happy.xcodeproj  # Opens in Xcode
```

### Cross-Project Changes

When changes span multiple projects:

1. **Protocol/API changes**: Update in this order:
   - `apps/server/docker` - Update API endpoints/types first
   - `apps/cli` - Update API client to match
   - `apps/web/react` - Update sync logic to match

2. **Type definitions**: Use `@magic-agent/protocol` for shared types. Project-specific types remain in:
   - Shared: `packages/schema/protocol/` (Zod schemas for API updates/events)
   - Server: `sources/app/api/types.ts`
   - CLI: `src/api/types.ts`
   - App: `sources/sync/types.ts`

3. **Testing**: Test each project independently after changes

## System Architecture

### Authentication Flow
1. CLI generates keypair and displays QR code
2. Mobile app scans QR and approves connection
3. Server facilitates challenge-response authentication
4. All subsequent data is end-to-end encrypted

### Session Synchronization
1. CLI wraps Claude Code and captures session state
2. CLI encrypts and sends updates to server via WebSocket
3. Server relays encrypted messages to connected mobile devices
4. Mobile app decrypts and displays real-time session state

### Data Flow
```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  apps/cli   │◄──────► │ apps/server/docker │◄──────► │  apps/web/react  │
│  (Node.js)  │ encrypt │  (Fastify)   │ encrypt │ (React Native)│
│             │  WSS    │              │  WSS    │             │
└─────────────┘         └──────────────┘         └─────────────┘
       │                                                  │
       ▼                                                  ▼
  Claude Code                                      Mobile UI
  (subprocess)                                    (encrypted view)
```

## Common Commands

### Building All Projects
```bash
# From root
cd apps/cli && yarn build
cd ../server/docker && yarn build
cd ../../web/react && yarn typecheck
```

### Running Tests
```bash
# CLI tests (includes integration tests)
cd apps/cli && yarn test

# Server tests
cd apps/server/docker && yarn test

# App tests
cd apps/web/react && yarn test
```

### Local Development with All Components
```bash
# Terminal 1: Start server locally
cd apps/server/docker
yarn dev

# Terminal 2: Run CLI with local server
cd apps/cli
yarn dev:local-server

# Terminal 3: Run mobile app with local server
cd apps/web/react
yarn start:local-server
```

## Important Notes

- **Path aliases**: TypeScript projects use `@/*` to import from their respective source directories
- **Source directories**:
  - CLI: `src/`
  - Server (Docker): `sources/`
  - Server (Workers): `src/`
  - React Native: `sources/`
  - Vue.js: `src/`
  - Admin: `src/`
- **Module systems**:
  - CLI: ESM
  - Server (Docker): ESM
  - Server (Workers): ESM
  - React Native: ESM (via Expo)
  - Vue.js: ESM
  - Admin: ESM
  - macOS: Swift
- **TypeScript**: All TypeScript projects use strict mode
- **Encryption**: End-to-end encryption using AES-256-GCM (clients) and TweetNaCl secretbox (server) - server never sees plaintext user data
- **Database**:
  - Server (Docker): Prisma with PostgreSQL
  - Server (Workers): Drizzle with D1 (SQLite)
- **Environment variables**: Each project has its own `.env` or `.dev.vars` file structure (see Environment & Secrets section)

## Code Style Conventions

### GitHub Naming Convention

When referencing GitHub in code:

| Context | Convention | Example |
|---------|------------|---------|
| Type/Class/Schema names | `GitHub` (PascalCase with capital H) | `GitHubProfileSchema`, `GitHubUser` |
| Variable names | `github` (camelCase) | `githubToken`, `existingGithubConnection` |
| Function names | `GitHub` in name | `createGitHubToken`, `verifyGitHubToken` |
| URL paths | `github` (lowercase) | `/v1/connect/github/callback` |
| Translation keys | `github` (lowercase) | `t('modals.disconnectGithub')` |
| File names | `github` (lowercase) | `apiGithub.ts`, `githubConnect.ts` |

This follows the official GitHub branding (capital H) while respecting language-specific conventions.

## Environment & Secrets Management

### Environment File Structure

Each project follows a consistent pattern for environment files:

| File | Purpose | Committed to Git |
|------|---------|------------------|
| `.env.example` | Template with all variables and descriptions | Yes |
| `.env.dev` | Local development with safe defaults | Yes |
| `.env.staging` | Staging environment template | Yes |
| `.env` | Active environment (copied from template) | No |
| `.env.local` | Local overrides | No |
| `.env.production` | Production values | No |

### Project-Specific Variables

#### apps/cli
- `HAPPY_SERVER_URL` - API server URL
- `HAPPY_WEBAPP_URL` - Web application URL
- `HAPPY_HOME_DIR` - Local data directory (~/.happy)
- `DEBUG` - Enable verbose logging

#### apps/server/docker
- `DATABASE_URL` - PostgreSQL connection string (required)
- `REDIS_URL` - Redis connection for pub/sub (required)
- `HAPPY_MASTER_SECRET` - Master encryption key (required, replaces deprecated `HANDY_MASTER_SECRET`)
- `S3_*` - S3/MinIO storage configuration (required)
- `ELEVENLABS_API_KEY` - Voice synthesis (optional)
- `GITHUB_*` - GitHub OAuth integration (optional)

#### apps/web/react
- `EXPO_PUBLIC_HAPPY_SERVER_URL` - API server URL (baked into app at build time)

#### apps/server/workers (Cloudflare)
- Uses `.dev.vars` for local development (gitignored)
- Production secrets via `wrangler secret put`
- Bindings (D1, R2, Durable Objects) in `wrangler.toml`

#### apps/admin/web (Cloudflare - Frontend)
- Frontend-only worker, no secrets required
- Serves Vue.js SPA via [site] bucket
- API calls go to apps/admin/api

#### apps/admin/api (Cloudflare - API)
- Uses `.dev.vars` for local development (gitignored)
- `BETTER_AUTH_SECRET` - Session signing secret
- Uses main happy D1 databases (happy-dev, happy-prod)
- Analytics Engine via Secrets Store bindings

### Generating Secrets

Use the provided script to generate cryptographic secrets:

```bash
cd apps/server/docker
./scripts/generate-secrets.sh
./scripts/generate-secrets.sh --env production
```

This generates:
- `HAPPY_MASTER_SECRET` - 32-byte hex for JWT signing (replaces deprecated `HANDY_MASTER_SECRET`)
- `GITHUB_WEBHOOK_SECRET` - Webhook signature verification
- TweetNaCl keypairs for client encryption

### Cloudflare Secrets (Workers)

For `apps/server/workers`, production secrets are managed via Wrangler:

```bash
cd apps/server/workers

# Set a secret
wrangler secret put HAPPY_MASTER_SECRET --env prod

# List all secrets
wrangler secret list --env prod

# Delete a secret
wrangler secret delete SECRET_NAME --env prod
```

Required production secrets:
- `HAPPY_MASTER_SECRET` - Authentication and encryption (replaces deprecated `HANDY_MASTER_SECRET`)

Optional:
- `ELEVENLABS_API_KEY` - Voice features
- `GITHUB_PRIVATE_KEY` - GitHub App authentication
- `GITHUB_CLIENT_SECRET` - GitHub OAuth

### Secret Rotation

See `apps/server/docker/docs/SECRET-ROTATION.md` for detailed procedures on rotating secrets, including:
- Impact assessment for each secret type
- Step-by-step rotation procedures
- Emergency rotation checklist
- Cloudflare Secrets commands reference

### Security Best Practices

1. **Never commit secrets** - All `.env` files with real credentials are gitignored
2. **Use different secrets per environment** - Dev, staging, and production should have unique secrets
3. **Rotate quarterly** - Regular rotation reduces exposure window
4. **Use Cloudflare Secrets for Workers** - Never put production secrets in `wrangler.toml`
5. **Generate cryptographically secure secrets** - Use `openssl rand -hex 32` or the provided script

## Security Considerations

- All sensitive data is encrypted client-side before transmission
- Server acts as a "zero-knowledge" relay - cannot decrypt messages
- Authentication uses cryptographic signatures, no passwords
- Session IDs and encryption keys never leave the client devices

## Project Dependencies

### Runtime Dependencies

- **apps/cli** depends on: Claude Code (globally installed, not bundled)
- **apps/server/docker** depends on: PostgreSQL, Redis, S3-compatible storage
- **apps/server/workers** depends on: Cloudflare D1, R2
- **apps/web/react** depends on: Nothing (standalone app)
- **apps/web/vue** depends on: Nothing (standalone app)
- **apps/admin/web** depends on: apps/admin/api
- **apps/admin/api** depends on: Cloudflare D1
- **apps/macos** depends on: Nothing (standalone app)

### Internal Package Dependencies

All TypeScript projects can consume shared packages:
- `@magic-agent/protocol` - API type definitions (Zod schemas)
- `@magic-agent/errors` - Error handling utilities
- `@happy/lint-rules` - Linting rules (devDependency)

### Communication

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  apps/cli   │────│   server/   │────│ apps/web/   │
│  (Node.js)  │    │   docker    │    │   react     │
└─────────────┘    │  or workers │    └─────────────┘
       │           └─────────────┘           │
       │                  │                  │
       ▼                  │                  ▼
  Claude Code             │           Mobile/Web UI
                          │
                    ┌─────────────┐
                    │ apps/macos  │
                    │  (Swift)    │
                    └─────────────┘
```

## When Working Across Projects

1. **Always check project-specific CLAUDE.md** before making changes
2. **Respect different conventions** (ESM vs CommonJS, src vs sources, 2-space vs 4-space indentation)
3. **Test independently** - each project has its own test suite
4. **Consider backward compatibility** - mobile apps may be on older versions
5. **Update @magic-agent/protocol first** when changing shared types, then update consuming projects
6. **Commit to correct repo** - shared packages go to `happy-shared`, project code to individual repos

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Magic-Agent** (41451 symbols, 118925 relationships, 299 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Magic-Agent/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Magic-Agent/clusters` | All functional areas |
| `gitnexus://repo/Magic-Agent/processes` | All execution flows |
| `gitnexus://repo/Magic-Agent/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
