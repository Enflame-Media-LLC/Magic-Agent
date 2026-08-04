# Happy Vue - Development Guidelines

> **Part of the Happy monorepo** — See root [`CLAUDE.md`](../../../CLAUDE.md) for overall architecture and cross-project guidelines.

---

This file provides guidance to Claude Code when working with the Happy Vue.js web client.

## Project Overview

**Happy Vue** is a Vue.js web application for the Happy mobile/web client. It provides remote control and session sharing for Claude Code with end-to-end encryption.

## Architecture

### Directory Structure

```
apps/web/vue/
├── src/
│   ├── components/     # Vue components
│   ├── composables/    # Vue composables (hooks)
│   ├── stores/         # Pinia stores
│   ├── services/       # API and utility services
│   ├── views/          # Page/route views
│   ├── shared/         # Shared utilities (purchases, analytics, url)
│   ├── i18n/           # Internationalization
│   ├── lib/            # Utility libraries
│   └── assets/         # Static assets and styles
├── public/             # Static public files
├── e2e/                # Playwright E2E tests
├── scripts/            # Build and deployment scripts
├── wrangler.toml       # Cloudflare Workers config
├── vite.config.ts      # Vite+ unified build + test configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies and scripts
```

### Key Dependencies

- **@magic-agent/protocol** - Shared Zod schemas from root monorepo (`workspace:*`)
- **Vue 3** - Frontend framework with Composition API
- **Pinia** - State management
- **Vue Router** - Client-side routing
- **TailwindCSS 4** - Styling with ShadCN-Vue components
- **Vite+ (vite-plus)** - Unified build + test toolchain (wraps Vite 7 + Vitest)
- **Zod** - Schema validation

## Development Guidelines

### Package Manager

**Always use yarn v4** from the root monorepo:

```bash
# From root monorepo - install all dependencies
cd /volume1/Projects/happy
yarn install

# From Vue app directory - run scripts
cd apps/web/vue
yarn dev       # Start dev server
yarn build     # Build for production
yarn typecheck # Run TypeScript check
```

### TypeScript

- All code uses TypeScript with **strict mode**
- Path alias: `@/*` → `./src/*`
- Protocol types from `@magic-agent/protocol`

### Path Aliases

```typescript
// Import from local source
import { useAuthStore } from "@/stores/auth";

// Import shared utilities
import { openUrl, trackPurchaseEvent } from "@/shared";

// Import protocol types (from root monorepo)
import { ApiUpdateSchema, type ApiUpdate } from "@magic-agent/protocol";
```

### Code Style

- 2-space indentation
- Double quotes for strings (enforced by `vp check` / oxlint)
- Semicolons required
- Vue Composition API (not Options API)
- `<script setup>` syntax preferred

> **Source of truth**: `vp check` / oxlint config is authoritative. This document is descriptive — if formatter behavior diverges from the guidance here, the formatter wins and this doc should be updated to match.

## Vite+ Migration Workarounds

This project uses **vite-plus** as a unified build and test toolchain, replacing separate `vite` and `vitest` configs with a single `vite.config.ts`. Two compatibility workarounds are in place:

### Cloudflare Plugin Test Exclusion (temporary)

The `cloudflare()` and `VitePWA()` plugins are **conditionally excluded during test runs** via an `isTest` check (`process.env['VITEST'] === 'true'`). These plugins set `resolve.external` which conflicts with vite-plus's integrated vitest runner. Without this exclusion, tests fail with module resolution errors.

**When modifying `vite.config.ts`**: Any new plugin that sets `resolve.external` or assumes a Workers runtime must also be added to the `buildPlugins` conditional to avoid breaking tests.

**Monitor**: This workaround should be removed when vite-plus reaches stable and `@cloudflare/vite-plugin` supports the unified config natively. Track the [vite-plus repository](https://github.com/nicolo-ribaudo/vite-plus) for updates.

### Rolldown manualChunks Function Format (permanent)

The `manualChunks` config uses a **function**, not an object. Rolldown (vite-plus's internal bundler) does not support the object form that standard Rollup accepts. The function form is compatible with both Rolldown and Rollup, so this is a permanent change.

```typescript
// Correct (works with both Rolldown and Rollup)
manualChunks(id: string) {
  if (id.includes('node_modules/vue/')) return 'vue-vendor';
}

// Incorrect (fails with Rolldown)
manualChunks: { 'vue-vendor': ['vue'] }
```

See `vite.config.ts` for full inline documentation of both workarounds (HAP-1082, HAP-1089).

## Common Commands

```bash
# Development
yarn dev          # Start dev server (Vite)

# Building
yarn build        # TypeScript check + Vite build

# Quality
yarn typecheck    # Type check
yarn lint         # Lint (handled at root level)
yarn test         # Run unit tests (Vitest)
yarn test:run     # Run tests once
yarn test:coverage # Run tests with coverage

# E2E Testing
yarn test:e2e     # Run Playwright tests
yarn test:e2e:ui  # Run with Playwright UI

# Deployment
yarn deploy:dev   # Deploy to development (Cloudflare Workers)
yarn deploy:prod  # Deploy to production (Cloudflare Workers)

# Maintenance
yarn clean        # Clean build artifacts
```

## Deployment

### Cloudflare Workers

The app is deployed as a static SPA on Cloudflare Workers:

- **Development**: `happy-vue-dev.enflamemedia.com`
- **Production**: `happy-vue.enflamemedia.com`

Configuration is in `wrangler.toml`.

## Testing

### Unit Tests (Vitest)

```bash
yarn test         # Watch mode
yarn test:run     # Single run
yarn test:coverage # With coverage
```

### E2E Tests (Playwright)

```bash
yarn test:e2e           # All browsers
yarn test:e2e:chromium  # Chromium only
yarn test:e2e:ui        # With UI
```

### Visual Regression (Percy)

```bash
yarn test:e2e:visual:local  # Local only
yarn test:e2e:visual        # With Percy (requires PERCY_TOKEN)
```

## Related Documentation

- Root monorepo: [`../../../CLAUDE.md`](../../../CLAUDE.md)
- Protocol package: [`../../../packages/schema/protocol/CLAUDE.md`](../../../packages/schema/protocol/CLAUDE.md)
- Visual regression: [`docs/VISUAL-REGRESSION-TESTING.md`](./docs/VISUAL-REGRESSION-TESTING.md)
- Linear issue: [HAP-935](https://linear.app/enflame-media/issue/HAP-935)
