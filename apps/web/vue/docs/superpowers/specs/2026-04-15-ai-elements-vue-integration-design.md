# AI Elements Vue Integration Design

**Date**: 2026-04-15
**Scope**: Replace all custom chat/tool/code/voice/ACP/workflow components in happy-vue with AI Elements Vue equivalents
**Approach**: Hybrid — single effort, dependency-ordered execution

---

## Overview

Integrate the full AI Elements Vue component library (48 components) into the happy-vue web app, replacing existing custom-built chat, tool, code, voice, ACP, and workflow components. Components are source-copied via the shadcn-vue registry pattern, giving full ownership and customization ability.

## Decisions

- **Data layer**: Adapter pattern. Keep existing `NormalizedMessage` types and WebSocket/decryption pipeline. A thin mapping layer transforms messages into AI Elements expected shapes. The adapter is the only file that imports both type systems.
- **Workflow**: Replace raw Vue Flow usage with AI Elements pre-styled wrappers (Canvas, Node, Edge, Controls, Panel, Toolbar).
- **Execution order**: Single branch, but executed bottom-up by dependency depth: registry setup → adapter → primitives → message core → input → content containers → voice → workflow → cleanup.

## Cross-Cutting Concerns

### Internationalization (i18n)

The existing app supports 7 locales (en, es, ca, pl, pt, ru, zh-Hans). Multiple replaced components use `useI18n()` and `t()` for translation keys. AI Elements Vue components arrive with English text hardcoded since they are source-copied.

**Strategy**: After installing AI Elements components, audit all hardcoded English strings in the source-copied components. Replace them with `t()` calls using the existing i18n keys where possible, and add new keys to `src/i18n/locales/` for any new UI text. Audit `src/i18n/locales/en.json` for orphaned keys from removed components.

### Accessibility

The app has ARIA landmarks, skip links (`SkipLink.vue`), keyboard navigation composables, and accessibility tests (`*.a11y.test.ts`). After each major component replacement, run existing a11y tests (`yarn test:a11y`) and verify screen reader compatibility. Ensure AI Elements components provide equivalent ARIA attributes (e.g., `aria-label` on buttons, role attributes on interactive elements).

### Dark Mode & Theming

AI Elements Vue inherits shadcn-vue's CSS variable theming system. The existing app uses CSS custom properties (`--background`, `--foreground`, `--primary`, etc.) with a `.dark` class toggle. After installation, verify AI Elements components respect the existing CSS variable system and dark mode class. The existing `CodeBlock.vue` has explicit Shiki dual-theme handling — verify the AI Elements version handles this equivalently.

### Content Security (XSS)

Several components use `v-html` for rendering (Shiki code highlighting, markdown rendering). Messages arrive through E2E decryption from CLI/agent sources. While the trust model assumes the CLI is not compromised, AI Elements components that render user/agent text via `v-html` should be audited. Verify that `MessageResponse` sanitizes its `content` prop or uses a safe markdown renderer. If not, integrate DOMPurify or equivalent sanitization for `v-html` surfaces.

### @ai-sdk/vue Dependency

After installing AI Elements components (Task 1), audit which source-copied files import from `@ai-sdk/vue`. If only types are needed, use `import type` and consider defining those types locally in the adapter. If no source-copied component actually imports the runtime module, do not add `@ai-sdk/vue` as a dependency. Only add it if a source-copied component requires it at runtime.

---

## Section 1: Installation & Registry Setup

### Registry Configuration

Add AI Elements Vue registry to `components.json`:

```json
"registries": {
  "ai-elements": {
    "url": "https://registry.ai-elements-vue.com"
  }
}
```

### Component Installation

Install all 48 components via shadcn-vue CLI. They land in `src/components/ai-elements/` alongside existing `src/components/ui/` (ShadCN base) and `src/components/app/` (custom).

```bash
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/all.json
```

### Dependencies

- AI Elements Vue components may pull in additional shadcn-vue primitives (e.g., `Collapsible`). The CLI handles this automatically.
- `@ai-sdk/vue` — only add if source-copied components require it at runtime (see Cross-Cutting Concerns above).

---

## Section 2: Adapter Layer

### Location

`src/lib/ai-elements-adapter.ts` — single file, pure functions, no side effects.

### Core Mapping (Message Parts Model)

Used when converting `NormalizedMessage[]` into the parts-based model consumed by the `Message` component:

| `NormalizedMessage.kind` | AI Elements Target    | Mapped To                                                 |
| ------------------------ | --------------------- | --------------------------------------------------------- | ------------------- |
| `user-text`              | `Message`             | `{ role: 'user', parts: [{ type: 'text', text }] }`       |
| `agent-text`             | `Message`             | `{ role: 'assistant', parts: [{ type: 'text', text }] }`  |
| `tool-call`              | `Tool`                | `{ type: 'tool-invocation', toolName, args, state: 'call' | 'result', result }` |
| `tool-result`            | Merged into tool-call | Already folded in `SessionView.vue` normalization         |
| `agent-event`            | `Message` (system)    | `{ role: 'system', parts: [{ type: 'text', text }] }`     |
| `system`                 | `Message` (system)    | `{ role: 'system', parts: [{ type: 'text', text }] }`     |

Parts-based tool state: `running` → `call`, `completed` → `result`, `error` → `result` (with error flag).

### Tool Component State Mapping

Used for the `<ToolHeader :state>` prop on the AI Elements `Tool` collapsible component. This is a separate mapping from the parts model:

| Happy `ToolCall.state` + `ToolPermission.status` | AI Elements `ToolHeader.state` |
| ------------------------------------------------ | ------------------------------ |
| `running` (no permission)                        | `input-available`              |
| `running` + `permission.status === 'pending'`    | `approval-requested`           |
| `running` + `permission.status === 'approved'`   | `input-available`              |
| `completed`                                      | `output-available`             |
| `error`                                          | `output-error`                 |
| Any + `permission.status === 'denied'`           | `output-denied`                |

### Tool Approval Mapping

Used for the `<Confirmation :approval>` prop:

| `ToolPermission.status` | AI Elements `ToolUIPartApproval`   |
| ----------------------- | ---------------------------------- |
| `pending`               | `{ id }` (no approved field)       |
| `approved`              | `{ id, approved: true, reason? }`  |
| `denied` / `canceled`   | `{ id, approved: false, reason? }` |
| undefined               | `undefined`                        |

### ACP Mappings

| ACP Source             | AI Elements Target                     |
| ---------------------- | -------------------------------------- |
| `AcpThoughtView` data  | `Chain of Thought` / `Reasoning` parts |
| `AcpPlanView` data     | `Plan` component parts                 |
| `AcpToolCallView` data | `Tool` component                       |

### Design Rules

- Produces a **new array** — does not mutate `NormalizedMessage[]`. The existing normalization pipeline (`normalize.ts`) stays untouched.
- Since components are source-copied, adjust their TypeScript interfaces where adapter mapping would be awkward (make fields optional rather than synthesizing fake data).
- The adapter is the **only place** that knows about both type systems.

---

## Section 3: Primitives & Code

### Code Block

Replace `src/components/app/CodeBlock.vue` with AI Elements `CodeBlock`. Remove `simpleSyntaxHighlighter.ts` fallback tokenizer. Keep `useShiki` composable if AI Elements version doesn't bundle its own or if `MarkdownView.vue` still uses it.

### File Tree

Replace `FileTree.vue` and `VirtualFileTree.vue` with AI Elements `FileTree`. Create a recursive `AppFileTree.vue` wrapper that converts the store's `FileTreeNode[]` data structure (which uses `isDirectory: boolean`) into the declarative `<FileTreeFolder>` / `<FileTreeFile>` pattern.

**Performance**: The current `VirtualFileTree` uses `@tanstack/vue-virtual` for sessions with 100+ artifacts (HAP-873). After replacement, benchmark the AI Elements FileTree with 500+ nodes. If performance degrades, implement a virtualized wrapper or retain virtual scrolling as a fallback.

### Terminal

Net new. Replace `BashView.vue` and `CodexBashView.vue` tool views with AI Elements `Terminal` for command output with ANSI support. **Important**: Terminal tool views must render as slot content only (no header), because the parent `Tool` compound component already provides `<ToolHeader>`. Rendering a header in both places would create a double-header.

### Shimmer

Net new. Replace Skeleton-based loading states in `SessionView.vue` with AI Elements `Shimmer` for AI response loading.

### Image

Replace `ImagePreview.vue` with AI Elements `Image` in the artifact viewer.

### Loader

Net new. Use AI Elements `Loader` for in-flight states (tool running, message sending).

---

## Section 4: Message Core

### Conversation

Replace `ChatList.vue` with AI Elements `Conversation`. Provides auto-scroll, scroll-to-bottom button, and streaming-aware behavior. Replaces `ScrollArea` + manual message iteration in `SessionView.vue`.

### Message

Replace `MessageView.vue` with AI Elements `Message`. Uses parts-based rendering model. The adapter layer maps each `NormalizedMessage` kind into appropriate parts arrays.

**Preserve**: Timestamps must be rendered for each non-system message (the existing component shows `HH:MM` format). Add timestamp display as adjacent markup or a slot in the `Message` component.

**Preserve**: Long message truncation (LINE_THRESHOLD = 50, INITIAL_LINES = 20) with "Show N more lines" toggle. Implement this in the new `SessionMessage.vue` wrapper to prevent performance degradation on long assistant responses.

### Tool

Replace `ToolView.vue` + `ToolHeader.vue` + `ToolSectionView.vue` + `ToolError.vue` + `PermissionFooter.vue` with AI Elements `Tool` (collapsible). Specific tool sub-views (`BashView`, `EditView`, `WriteView`, etc.) become slot content inside the AI Elements `Tool` wrapper. The `knownTools.ts` config and `_all.ts` registry pattern is preserved.

**Also replace**: `ToolFullView.vue` — this is the detail view used by the `/session/:id/message/:messageId` route via `ToolMessageView.vue`. It imports `ToolSectionView`, `ToolError`, and `PermissionFooter`, all of which are being deleted. Rewrite to use AI Elements `Tool` with `ToolContent`, `ToolInput`, `ToolOutput`.

### Chain of Thought

Replace `AcpThoughtView.vue` with AI Elements `Chain of Thought`. Collapsible visualization of reasoning steps.

### Reasoning

Net new (or replaces ACP streaming text). Renders streaming reasoning tokens.

### Plan

Replace `AcpPlanView.vue` with AI Elements `Plan` for step-by-step task display.

### Sources & Inline Citation

Net new. Source attribution when the agent references files or documentation.

### Confirmation

Replace `AcpPermissionDialog.vue` and `PermissionFooter.vue` with AI Elements `Confirmation` for tool permission approval/denial.

---

## Section 5: Input & Interaction

### Prompt Input

Replace the entire `AgentInput/` folder (`AgentInput.vue`, `ActionButtons.vue`, `KeyboardShortcutHints.vue`, `SettingsOverlay.vue`, `StatusDisplay.vue`) plus `MultiTextInput.vue` and `AgentInputAutocomplete.vue` with AI Elements `Prompt Input`. Compound component with textarea, file upload, submit button, model picker.

Adaptations:

- Autocomplete system (`useActiveSuggestions`, `applySuggestion` from `src/components/app/autocomplete/`) wires into Prompt Input's textarea via the `usePromptInput()` composable's `textInput` ref and a `@keydown` handler. If the autocomplete system cannot be cleanly integrated, explicitly drop it and remove the `autocomplete/` directory.
- `StatusDisplay` and `SettingsOverlay` become slot content in header area
- Keyboard shortcuts (Cmd+M model cycle, Shift+Tab mode cycle) preserved in `@keydown` handler
- `@tanstack/vue-form` integration for validation stays

### Suggestion

Replace `AgentInputSuggestionView.vue` with AI Elements `Suggestion`.

### Model Selector

Net new. Use for Codex model cycling and potential Claude model selection.

### Context

Net new. Display session metadata (project path, machine status) above conversation.

---

## Section 6: Content Containers

### Artifact

Replace `ArtifactViewer.vue` with AI Elements `Artifact`. File tree sidebar uses AI Elements `File Tree`, content rendering uses AI Elements `Code Block` and `Image`. Download actions become header action slots.

### Snippet

Net new. Inline code references in messages.

### Stack Trace

Net new. Structured rendering for error stack traces from tool errors (replaces raw text in `ToolError.vue`).

### Test Results

Net new. Rendering test output from tool results.

### Web Preview, Commit, Environment Variables, Package Info, Schema Display

Net new utility components. Installed but not actively wired until there's data to feed them.

---

## Section 7: Voice

### Speech Input

Replace `VoiceButton.vue`. Existing `useVoice` composable preserved.

### Voice Selector

Net new. Voice selection dropdown for TTS.

### Audio Player

Net new. Replace `VoiceStatusBar.vue` and `VoiceBars.vue` playback visualization. `@11labs/client` and `media-chrome` integrations stay.

### Mic Selector

Net new. Microphone input device selection.

### Transcription

Net new. Speech-to-text transcription display.

### Persona

Net new. Voice persona display. Available for future use.

---

## Section 8: Workflow

### Canvas

Replace Vue Flow container with AI Elements `Canvas` (pre-styled wrapper around `@vue-flow/core`).

### Node

AI Elements `Node` compound component (`NodeHeader`, `NodeTitle`, `NodeDescription`, `NodeContent`, `NodeFooter`) replaces custom Vue Flow node templates.

### Edge

AI Elements `Edge` for styled bezier curves.

### Controls

Replace `@vue-flow/controls` with AI Elements `Controls`.

### Panel

AI Elements `Panel` for canvas overlay positioning.

### Toolbar

Replace `@vue-flow/node-toolbar` with AI Elements `Toolbar`.

### Connection

AI Elements `Connection` for drag-to-connect interaction rendering.

### Dependency Cleanup

Evaluate removal of `@vue-flow/background`, `@vue-flow/controls`, `@vue-flow/node-toolbar` from `package.json`.

---

## Section 9: Cleanup & Testing

### Files to Remove

**Chat/Message components:**

- `src/components/app/ChatList.vue`
- `src/components/app/MessageView.vue`

**Code components:**

- `src/components/app/CodeBlock.vue` (replaced by AI Elements wrapper at same path)
- `src/components/app/simpleSyntaxHighlighter.ts`
- `src/components/app/FileTree.vue`
- `src/components/app/VirtualFileTree.vue`
- `src/components/app/ImagePreview.vue`

**Input components:**

- `src/components/app/AgentInput/` (entire folder)
- `src/components/app/AgentInputAutocomplete.vue`
- `src/components/app/AgentInputSuggestionView.vue`
- `src/components/app/MultiTextInput.vue`
- `src/components/app/autocomplete/` (entire directory — if autocomplete is dropped)

**Tool components:**

- `src/components/app/ToolResult.vue`
- `src/components/app/tools/ToolView.vue`
- `src/components/app/tools/ToolHeader.vue`
- `src/components/app/tools/ToolSectionView.vue`
- `src/components/app/tools/ToolError.vue`
- `src/components/app/tools/PermissionFooter.vue`
- `src/components/app/tools/ToolFullView.vue` (rewritten, old version removed)
- `src/components/app/tools/ToolStatusIndicator.vue` (only consumer was ToolHeader.vue)
- `src/components/app/tools/useElapsedTime.ts` (only consumer was ToolHeader.vue)

**Voice components:**

- `src/components/app/voice/VoiceBars.vue`
- `src/components/app/voice/VoiceButton.vue`
- `src/components/app/voice/VoiceStatusBar.vue`

**ACP components:**

- `src/components/acp/AcpThoughtView.vue`
- `src/components/acp/AcpPlanView.vue`
- `src/components/acp/AcpToolCallView.vue`
- `src/components/acp/AcpStreamingText.vue`
- `src/components/acp/AcpPermissionDialog.vue`

### Files Preserved

- `src/components/app/tools/views/` — tool sub-views become slot content inside AI Elements `Tool`
- `src/components/app/tools/knownTools.ts` and `views/_all.ts` — tool registry
- `src/components/app/tools/ToolDiffView.vue` — update imports if needed (verify it doesn't import deleted files)
- `src/components/app/markdown/MarkdownView.vue` and `MermaidRenderer.vue`
- `src/components/app/sharing/` — no AI Elements equivalent
- `src/components/app/CommandPalette.vue`, `CommandView.vue`, `ConnectionStatus.vue`, `DesktopNavigation.vue`, `MobileBottomNav.vue`, etc. — app chrome
- All composables — evaluated individually, kept if still referenced
- ACP session management components: `AcpSessionBrowser.vue`, `AcpAgentPicker.vue`, `AcpAgentBadge.vue`, `AcpConfigPanel.vue`, `AcpCommandPalette.vue`, `AcpModeIndicator.vue`, `AcpUsageWidget.vue`, `AcpContentBlockRenderer.vue`, `AcpSessionView.vue`

### Dependency Cleanup

Evaluate removal of:

- `ansi-to-vue3` (if Terminal handles ANSI natively)
- `@vue-flow/background`, `@vue-flow/controls`, `@vue-flow/node-toolbar` (if fully wrapped)
- `@tanstack/vue-virtual` (if VirtualFileTree is the only consumer)

### Testing Strategy

- Typecheck passes (`yarn typecheck`)
- Existing unit tests updated for new component imports
- Accessibility tests pass (`yarn test:a11y`)
- E2E tests updated and pass (`yarn test:e2e`)
- Percy visual regression baselines updated
- Manual verification of session view golden path: load session → see messages with timestamps → see tools → send message → see response
- Verify artifact viewer with large artifact sets (500+ nodes)
- Verify voice controls, workflow canvas
- Verify dark mode rendering
- Verify i18n for all supported locales
