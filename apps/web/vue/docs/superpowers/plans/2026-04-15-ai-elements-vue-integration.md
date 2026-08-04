# AI Elements Vue Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all custom chat/tool/code/voice/ACP/workflow components in happy-vue with AI Elements Vue equivalents, executed as a single effort in dependency order.

**Architecture:** Install all 48 AI Elements Vue components via the shadcn-vue registry. Build a thin adapter layer that maps existing `NormalizedMessage` types to AI Elements expected shapes. Replace components bottom-up: primitives first, then message core, input, content containers, voice, workflow, and finally cleanup.

**Tech Stack:** Vue 3 + Composition API, AI Elements Vue (shadcn-vue registry), Shiki, Vue Flow, TypeScript strict mode. `@ai-sdk/vue` only if source-copied components require it at runtime.

**Design spec:** `docs/superpowers/specs/2026-04-15-ai-elements-vue-integration-design.md`

---

## File Structure

### New Files

- `src/lib/ai-elements-adapter.ts` — adapter mapping `NormalizedMessage` → AI Elements types
- `src/components/ai-elements/` — all 48 AI Elements Vue components (installed via CLI)
- `src/components/app/SessionMessage.vue` — message renderer using AI Elements components
- `src/components/app/AppFileTree.vue` — recursive wrapper for AI Elements FileTree
- `src/components/app/AppFileTreeNode.vue` — recursive tree node component

### Modified Files

- `components.json` — add AI Elements Vue registry
- `package.json` — conditionally add `@ai-sdk/vue` (only if source-copied components need it)
- `src/views/SessionView.vue` — replace ChatList/AgentInput/ScrollArea with Conversation/PromptInput
- `src/views/ToolMessageView.vue` — update to use AI Elements Tool (ToolFullView.vue is being deleted)
- `src/components/app/tools/views/BashView.vue` — replace with Terminal (content only, no header)
- `src/components/app/tools/views/CodexBashView.vue` — replace with Terminal (content only, no header)
- `src/components/app/tools/views/_all.ts` — update tool view registry
- `src/components/app/tools/ToolDiffView.vue` — update imports if referencing deleted files
- `src/components/app/ArtifactViewer.vue` → rewritten using Artifact + FileTree + CodeBlock
- `src/components/acp/AcpSessionView.vue` — update to use AI Elements Message/Tool/ChainOfThought
- `src/components/acp/AcpContentBlockRenderer.vue` — update to use AI Elements components
- `src/components/acp/index.ts` — remove replaced exports, add new ones
- `src/components/app/index.ts` (barrel file, if exists) — update exports
- `src/i18n/locales/*.json` — add new keys, audit orphaned keys from removed components

### Files to Remove (after wiring complete)

- `src/components/app/ChatList.vue`
- `src/components/app/MessageView.vue`
- `src/components/app/CodeBlock.vue`
- `src/components/app/simpleSyntaxHighlighter.ts`
- `src/components/app/FileTree.vue`
- `src/components/app/VirtualFileTree.vue`
- `src/components/app/ImagePreview.vue`
- `src/components/app/ToolResult.vue`
- `src/components/app/AgentInput/` (entire folder)
- `src/components/app/AgentInputAutocomplete.vue`
- `src/components/app/AgentInputSuggestionView.vue`
- `src/components/app/MultiTextInput.vue`
- `src/components/app/autocomplete/` (entire directory — if autocomplete is not wired into PromptInput)
- `src/components/app/tools/ToolView.vue`
- `src/components/app/tools/ToolHeader.vue`
- `src/components/app/tools/ToolSectionView.vue`
- `src/components/app/tools/ToolError.vue`
- `src/components/app/tools/PermissionFooter.vue`
- `src/components/app/tools/ToolFullView.vue` (rewritten, old version deleted)
- `src/components/app/tools/ToolStatusIndicator.vue` (only consumer was ToolHeader.vue)
- `src/components/app/tools/useElapsedTime.ts` (only consumer was ToolHeader.vue)
- `src/components/app/voice/VoiceBars.vue`
- `src/components/app/voice/VoiceButton.vue`
- `src/components/app/voice/VoiceStatusBar.vue`
- `src/components/acp/AcpThoughtView.vue`
- `src/components/acp/AcpPlanView.vue`
- `src/components/acp/AcpToolCallView.vue`
- `src/components/acp/AcpStreamingText.vue`
- `src/components/acp/AcpPermissionDialog.vue`

---

## Task 1: Registry Setup & Component Installation

**Files:**

- Modify: `apps/web/vue/components.json`
- Modify: `apps/web/vue/package.json` (via yarn add)
- Create: `apps/web/vue/src/components/ai-elements/` (via CLI)

- [ ] **Step 1: Add AI Elements Vue registry to components.json**

Open `apps/web/vue/components.json` and update the `registries` field:

```json
{
  "$schema": "https://shadcn-vue.com/schema.json",
  "style": "new-york",
  "typescript": true,
  "tailwind": {
    "config": "",
    "css": "src/assets/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "composables": "@/composables"
  },
  "registries": {
    "ai-elements": {
      "url": "https://registry.ai-elements-vue.com"
    }
  }
}
```

- [ ] **Step 2: Install all AI Elements Vue components**

Run from the Vue app directory:

```bash
cd /volume1/Projects/happy/apps/web/vue
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/all.json
```

If the bulk install fails, install individually:

```bash
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/conversation.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/message.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/prompt-input.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/tool.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/chain-of-thought.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/confirmation.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/code-block.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/file-tree.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/terminal.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/artifact.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/shimmer.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/suggestion.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/reasoning.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/plan.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/sources.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/inline-citation.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/model-selector.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/context.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/queue.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/task.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/checkpoint.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/attachments.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/snippet.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/stack-trace.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/test-results.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/web-preview.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/commit.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/environment-variables.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/package-info.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/schema-display.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/agent.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/sandbox.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/image.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/loader.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/open-in-chat.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/speech-input.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/voice-selector.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/audio-player.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/mic-selector.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/transcription.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/persona.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/canvas.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/node.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/edge.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/controls.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/panel.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/toolbar.json
npx shadcn-vue@latest add https://registry.ai-elements-vue.com/connection.json
```

Expected: Components installed to `src/components/ai-elements/`. Any missing shadcn-vue primitives (e.g., `Collapsible`) are auto-installed to `src/components/ui/`.

- [ ] **Step 3: Audit @ai-sdk/vue dependency need**

Check if any installed component imports `@ai-sdk/vue` at runtime (not just types):

```bash
cd /volume1/Projects/happy/apps/web/vue
grep -r "from '@ai-sdk/vue'" src/components/ai-elements/ --include="*.vue" --include="*.ts" | grep -v "import type"
```

If runtime imports exist, install the dependency:

```bash
cd /volume1/Projects/happy
yarn workspace happy-vue add @ai-sdk/vue
```

If only type imports exist, no runtime dependency needed — the types are available via `import type`.

- [ ] **Step 4: Verify installation**

```bash
ls src/components/ai-elements/
```

Expected: Directories for each installed component (conversation, message, prompt-input, tool, etc.).

- [ ] **Step 5: Run typecheck to verify no installation conflicts**

```bash
cd /volume1/Projects/happy/apps/web/vue
yarn typecheck
```

Expected: PASS (no type errors from newly installed components).

- [ ] **Step 6: Commit**

```bash
git add components.json package.json yarn.lock src/components/ai-elements/ src/components/ui/
git commit -m "feat: install AI Elements Vue component library via shadcn-vue registry"
```

---

## Task 2: Adapter Layer

**Files:**

- Create: `src/lib/ai-elements-adapter.ts`
- Create: `src/lib/__tests__/ai-elements-adapter.test.ts`
- Reference: `src/services/messages/types.ts` (existing NormalizedMessage types)

- [ ] **Step 1: Write failing tests for the adapter**

Create `src/lib/__tests__/ai-elements-adapter.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { adaptMessages, adaptToolState, type AIElementsMessage } from "../ai-elements-adapter";
import type { NormalizedMessage, ToolCall } from "@/services/messages/types";

describe("ai-elements-adapter", () => {
  describe("adaptMessages", () => {
    it("maps user-text to user role with text part", () => {
      const messages: NormalizedMessage[] = [
        {
          kind: "user-text",
          id: "msg-1",
          localId: null,
          createdAt: Date.now(),
          text: "Hello Claude",
        },
      ];

      const result = adaptMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("msg-1");
      expect(result[0]!.role).toBe("user");
      expect(result[0]!.parts).toEqual([{ type: "text", text: "Hello Claude" }]);
    });

    it("maps agent-text to assistant role with text part", () => {
      const messages: NormalizedMessage[] = [
        {
          kind: "agent-text",
          id: "msg-2",
          localId: null,
          createdAt: Date.now(),
          text: "Hello! How can I help?",
        },
      ];

      const result = adaptMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0]!.role).toBe("assistant");
      expect(result[0]!.parts).toEqual([{ type: "text", text: "Hello! How can I help?" }]);
    });

    it("maps tool-call to assistant role with tool-invocation part", () => {
      const tool: ToolCall = {
        name: "Read",
        state: "completed",
        input: { file_path: "/src/main.ts" },
        createdAt: Date.now(),
        startedAt: Date.now(),
        completedAt: Date.now(),
        description: "Reading file",
        result: "file contents here",
      };
      const messages: NormalizedMessage[] = [
        {
          kind: "tool-call",
          id: "msg-3",
          localId: null,
          createdAt: Date.now(),
          tool,
        },
      ];

      const result = adaptMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0]!.role).toBe("assistant");
      expect(result[0]!.parts).toEqual([
        {
          type: "tool-invocation",
          toolName: "Read",
          args: { file_path: "/src/main.ts" },
          state: "result",
          result: "file contents here",
        },
      ]);
    });

    it("maps system messages to system role", () => {
      const messages: NormalizedMessage[] = [
        {
          kind: "system",
          id: "msg-4",
          localId: null,
          createdAt: Date.now(),
          text: "Session started",
        },
      ];

      const result = adaptMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0]!.role).toBe("system");
    });

    it("maps agent-event to system role with formatted text", () => {
      const messages: NormalizedMessage[] = [
        {
          kind: "agent-event",
          id: "msg-5",
          localId: null,
          createdAt: Date.now(),
          event: { type: "switch", mode: "plan" },
        },
      ];

      const result = adaptMessages(messages);

      expect(result).toHaveLength(1);
      expect(result[0]!.role).toBe("system");
      expect(result[0]!.parts[0]).toEqual({ type: "text", text: "Switched to plan" });
    });
  });

  describe("adaptToolState", () => {
    it("maps running to input-available", () => {
      expect(adaptToolState("running")).toBe("input-available");
    });

    it("maps completed to output-available", () => {
      expect(adaptToolState("completed")).toBe("output-available");
    });

    it("maps error to output-error", () => {
      expect(adaptToolState("error")).toBe("output-error");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /volume1/Projects/happy/apps/web/vue
yarn test:run src/lib/__tests__/ai-elements-adapter.test.ts
```

Expected: FAIL — module `../ai-elements-adapter` not found.

- [ ] **Step 3: Implement the adapter**

Create `src/lib/ai-elements-adapter.ts`:

```typescript
/**
 * AI Elements Adapter
 *
 * Maps NormalizedMessage[] from the Happy sync pipeline to the shape
 * expected by AI Elements Vue components.
 *
 * This is the ONLY file that imports both type systems.
 */

import type {
  NormalizedMessage,
  ToolCall,
  AgentEvent,
  ToolPermission,
} from "@/services/messages/types";

// ─── AI Elements Types ──────────────────────────────────────────────────────
// These mirror what AI Elements Vue components expect.
// Defined here rather than importing from @ai-sdk/vue to avoid tight coupling.

export type AIElementsRole = "user" | "assistant" | "system";

export type TextPart = {
  type: "text";
  text: string;
};

export type ToolInvocationPart = {
  type: "tool-invocation";
  toolName: string;
  args: unknown;
  state: "call" | "partial-call" | "result";
  result?: unknown;
};

export type ReasoningPart = {
  type: "reasoning";
  text: string;
};

export type SourcePart = {
  type: "source";
  source: { title: string; url: string };
};

export type AIElementsPart = TextPart | ToolInvocationPart | ReasoningPart | SourcePart;

export type AIElementsMessage = {
  id: string;
  role: AIElementsRole;
  parts: AIElementsPart[];
  createdAt: number;
};

// ─── Tool State ─────────────────────────────────────────────────────────────
// Maps Happy tool states to AI Elements Tool component states.

export type AIToolState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied";

export function adaptToolState(state: ToolCall["state"], permission?: ToolPermission): AIToolState {
  if (permission?.status === "pending") {
    return "approval-requested";
  }
  if (permission?.status === "denied" || permission?.status === "canceled") {
    return "output-denied";
  }
  if (permission?.status === "approved") {
    if (state === "running") return "input-available";
    if (state === "completed") return "output-available";
    if (state === "error") return "output-error";
    return "approval-responded";
  }

  switch (state) {
    case "running":
      return "input-available";
    case "completed":
      return "output-available";
    case "error":
      return "output-error";
  }
}

// ─── Tool Approval ──────────────────────────────────────────────────────────

export type AIToolApproval =
  | { id: string; approved?: never; reason?: never }
  | { id: string; approved: boolean; reason?: string }
  | undefined;

export function adaptToolApproval(permission?: ToolPermission): AIToolApproval {
  if (!permission || !permission.id) return undefined;

  if (permission.status === "pending") {
    return { id: permission.id };
  }

  if (permission.status === "approved") {
    return { id: permission.id, approved: true, reason: permission.reason };
  }

  if (permission.status === "denied" || permission.status === "canceled") {
    return { id: permission.id, approved: false, reason: permission.reason };
  }

  return undefined;
}

// ─── Event Formatting ───────────────────────────────────────────────────────

function formatAgentEvent(event: AgentEvent): string {
  switch (event.type) {
    case "switch":
      return `Switched to ${event.mode}`;
    case "message":
      return event.message;
    case "limit-reached": {
      const endsAt = Number(event.endsAt);
      if (Number.isFinite(endsAt)) {
        return `Usage limit until ${new Date(endsAt * 1000).toLocaleTimeString()}`;
      }
      return "Usage limit reached";
    }
    default:
      return "System event";
  }
}

// ─── Message Adaptation ─────────────────────────────────────────────────────

function adaptSingleMessage(msg: NormalizedMessage): AIElementsMessage {
  switch (msg.kind) {
    case "user-text":
      return {
        id: msg.id,
        role: "user",
        parts: [{ type: "text", text: msg.displayText ?? msg.text }],
        createdAt: msg.createdAt,
      };

    case "agent-text":
      return {
        id: msg.id,
        role: "assistant",
        parts: [{ type: "text", text: msg.text }],
        createdAt: msg.createdAt,
      };

    case "tool-call": {
      const toolState: ToolInvocationPart["state"] =
        msg.tool.state === "completed" || msg.tool.state === "error" ? "result" : "call";

      const part: ToolInvocationPart = {
        type: "tool-invocation",
        toolName: msg.tool.name,
        args: msg.tool.input,
        state: toolState,
      };

      if (toolState === "result") {
        part.result = msg.tool.result;
      }

      return {
        id: msg.id,
        role: "assistant",
        parts: [part],
        createdAt: msg.createdAt,
      };
    }

    case "tool-result":
      // Tool results are folded into tool-calls by SessionView normalization.
      // If we encounter one standalone, render as system message.
      return {
        id: msg.id,
        role: "system",
        parts: [{ type: "text", text: String(msg.content) }],
        createdAt: msg.createdAt,
      };

    case "agent-event":
      return {
        id: msg.id,
        role: "system",
        parts: [{ type: "text", text: formatAgentEvent(msg.event) }],
        createdAt: msg.createdAt,
      };

    case "system":
      return {
        id: msg.id,
        role: "system",
        parts: [{ type: "text", text: msg.text }],
        createdAt: msg.createdAt,
      };
  }
}

/**
 * Converts an array of NormalizedMessage into AIElementsMessage[].
 * Returns a new array — does not mutate the input.
 */
export function adaptMessages(messages: NormalizedMessage[]): AIElementsMessage[] {
  return messages.map(adaptSingleMessage);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /volume1/Projects/happy/apps/web/vue
yarn test:run src/lib/__tests__/ai-elements-adapter.test.ts
```

Expected: PASS — all 5 tests pass.

- [ ] **Step 5: Run typecheck**

```bash
yarn typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai-elements-adapter.ts src/lib/__tests__/ai-elements-adapter.test.ts
git commit -m "feat: add AI Elements adapter layer for NormalizedMessage mapping"
```

---

## Task 3: Replace CodeBlock Component

**Files:**

- Modify: All files importing `CodeBlock` from `@/components/app/CodeBlock.vue` or `@/components/app`
- Remove (later): `src/components/app/CodeBlock.vue`, `src/components/app/simpleSyntaxHighlighter.ts`

- [ ] **Step 1: Find all CodeBlock consumers**

```bash
cd /volume1/Projects/happy/apps/web/vue
grep -r "CodeBlock" src/ --include="*.vue" --include="*.ts" -l
```

Document every file that imports `CodeBlock`.

- [ ] **Step 2: Create a drop-in wrapper for backward compatibility**

Create `src/components/app/CodeBlock.vue` as a thin wrapper around AI Elements CodeBlock. This preserves the existing import path while using the new component internally:

```vue
<script setup lang="ts">
/**
 * CodeBlock — Drop-in wrapper around AI Elements CodeBlock.
 * Preserves the existing prop interface for backward compatibility.
 */
import {
  CodeBlock as AICodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockFilename,
  CodeBlockActions,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";

interface Props {
  code: string;
  language?: string;
  filename?: string;
}

const props = withDefaults(defineProps<Props>(), {
  language: "",
  filename: "",
});

const displayLabel = props.filename || props.language || "code";
</script>

<template>
  <AICodeBlock :code="code" :language="language || 'text'">
    <CodeBlockHeader>
      <CodeBlockTitle>
        <CodeBlockFilename>{{ displayLabel }}</CodeBlockFilename>
      </CodeBlockTitle>
      <CodeBlockActions>
        <CodeBlockCopyButton />
      </CodeBlockActions>
    </CodeBlockHeader>
  </AICodeBlock>
</template>
```

- [ ] **Step 3: Run typecheck**

```bash
yarn typecheck
```

Expected: PASS. All existing consumers of `CodeBlock` continue to work unchanged.

- [ ] **Step 4: Verify visually**

Start the dev server and confirm code blocks render with syntax highlighting:

```bash
yarn dev
```

Open a session with tool results containing code and verify rendering.

- [ ] **Step 5: Remove old simpleSyntaxHighlighter.ts**

Delete `src/components/app/simpleSyntaxHighlighter.ts` — no longer needed since AI Elements CodeBlock uses Shiki directly.

Verify no other files import it:

```bash
grep -r "simpleSyntaxHighlighter" src/ --include="*.vue" --include="*.ts"
```

- [ ] **Step 6: Evaluate useShiki composable**

Check if `src/composables/useShiki.ts` is still needed. The AI Elements CodeBlock may bundle its own Shiki integration. If so, check for other consumers:

```bash
grep -r "useShiki" src/ --include="*.vue" --include="*.ts"
```

If only the old CodeBlock used it, delete it. If MarkdownView.vue also uses it, keep it.

- [ ] **Step 7: Commit**

```bash
git add src/components/app/CodeBlock.vue
git rm src/components/app/simpleSyntaxHighlighter.ts  # if deleted
git commit -m "feat: replace CodeBlock with AI Elements CodeBlock wrapper"
```

---

## Task 4: Replace FileTree Component

**Files:**

- Modify: `src/components/app/ArtifactViewer.vue` (primary consumer)
- Modify: Any other FileTree consumers
- Remove (later): `src/components/app/FileTree.vue`, `src/components/app/VirtualFileTree.vue`

- [ ] **Step 1: Find all FileTree consumers**

```bash
grep -r "FileTree\|VirtualFileTree" src/ --include="*.vue" --include="*.ts" -l
```

- [ ] **Step 2: Understand the existing tree data structure**

Read `src/stores/artifacts.ts` to understand the `fileTree` computed shape. The AI Elements FileTree uses a declarative `<FileTreeFolder>` / `<FileTreeFile>` pattern rather than a data-driven tree. We need a recursive component or a render helper to convert the store's tree structure into AI Elements FileTree components.

- [ ] **Step 3: Create an AppFileTree wrapper**

Create `src/components/app/AppFileTree.vue` that takes the store's tree data and renders AI Elements FileTree components. **Important**: Use the `FileTreeNode` type from the store (which uses `isDirectory: boolean`, NOT `type: 'file' | 'directory'`):

```vue
<script setup lang="ts">
import { computed } from "vue";
import { FileTree, FileTreeFolder, FileTreeFile } from "@/components/ai-elements/file-tree";
import AppFileTreeNode from "./AppFileTreeNode.vue";
import type { FileTreeNode } from "@/stores/artifacts";

interface Props {
  tree: FileTreeNode[];
  selectedId?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  selectedId: null,
});

const emit = defineEmits<{
  (event: "select", artifactId: string): void;
}>();

// Map artifact IDs to paths for selection tracking
const selectedPath = computed(() => {
  if (!props.selectedId) return "";
  return findPathById(props.tree, props.selectedId) ?? "";
});

function findPathById(nodes: FileTreeNode[], id: string): string | null {
  for (const node of nodes) {
    if (node.artifactId === id) return node.path;
    if (node.children) {
      const found = findPathById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function handleSelect(path: string) {
  const artifactId = findIdByPath(props.tree, path);
  if (artifactId) {
    emit("select", artifactId);
  }
}

function findIdByPath(nodes: FileTreeNode[], path: string): string | null {
  for (const node of nodes) {
    if (node.path === path && node.artifactId) return node.artifactId;
    if (node.children) {
      const found = findIdByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

// Collect all folder paths for default expansion
const allFolderPaths = computed(() => {
  const paths = new Set<string>();
  function collect(nodes: FileTreeNode[]) {
    for (const node of nodes) {
      if (node.isDirectory) {
        paths.add(node.path);
        if (node.children) collect(node.children);
      }
    }
  }
  collect(props.tree);
  return paths;
});
</script>

<template>
  <FileTree
    :selected-path="selectedPath"
    :default-expanded="allFolderPaths"
    @update:selected-path="handleSelect"
  >
    <AppFileTreeNode v-for="node in tree" :key="node.path" :node="node" />
  </FileTree>
</template>
```

Also create `src/components/app/AppFileTreeNode.vue` for recursive rendering:

```vue
<script setup lang="ts">
import { FileTreeFolder, FileTreeFile } from "@/components/ai-elements/file-tree";
import type { FileTreeNode } from "@/stores/artifacts";

interface Props {
  node: FileTreeNode;
}

defineProps<Props>();
</script>

<template>
  <FileTreeFolder v-if="node.isDirectory" :path="node.path" :name="node.name">
    <AppFileTreeNode v-for="child in node.children" :key="child.path" :node="child" />
  </FileTreeFolder>
  <FileTreeFile v-else :path="node.path" :name="node.name" />
</template>
```

- [ ] **Step 4: Update ArtifactViewer to use AppFileTree**

In `src/components/app/ArtifactViewer.vue`, replace the FileTree/VirtualFileTree imports:

```typescript
// Before:
import FileTree from "./FileTree.vue";
import VirtualFileTree from "./VirtualFileTree.vue";

// After:
import AppFileTree from "./AppFileTree.vue";
```

Update the template to use `AppFileTree` and remove the `useVirtualTree` conditional:

```vue
<!-- Before: -->
<VirtualFileTree v-else-if="useVirtualTree" ... />
<ScrollArea v-else ...>
  <FileTree ... />
</ScrollArea>

<!-- After: -->
<ScrollArea class="flex-1">
  <AppFileTree
    :tree="fileTree"
    :selected-id="artifactsStore.selectedArtifactId"
    @select="handleSelect"
  />
</ScrollArea>
```

- [ ] **Step 5: Run typecheck and verify**

```bash
yarn typecheck
yarn dev
```

Open the artifacts view and verify the file tree renders and selection works.

- [ ] **Step 6: Commit**

```bash
git add src/components/app/AppFileTree.vue src/components/app/ArtifactViewer.vue
git commit -m "feat: replace FileTree/VirtualFileTree with AI Elements FileTree"
```

---

## Task 5: Wire Terminal into Bash Tool Views

**Files:**

- Modify: `src/components/app/tools/views/BashView.vue`
- Modify: `src/components/app/tools/views/CodexBashView.vue`

- [ ] **Step 1: Read the existing BashView.vue**

```bash
cat src/components/app/tools/views/BashView.vue
```

Understand the current prop interface and how it receives tool data.

- [ ] **Step 2: Replace BashView with Terminal**

Rewrite `src/components/app/tools/views/BashView.vue`.

**Important**: This component renders as slot content inside the parent `<Tool>` compound component in `SessionMessage.vue`. The parent already provides `<ToolHeader>`. Do NOT render a Terminal header here — that would create a double-header. Only render `<TerminalContent>` with copy action:

```vue
<script setup lang="ts">
import {
  Terminal,
  TerminalContent,
  TerminalActions,
  TerminalCopyButton,
} from "@/components/ai-elements/terminal";
import type { ToolCall } from "@/services/messages/types";

interface Props {
  tool: ToolCall;
}

const props = defineProps<Props>();

const command =
  typeof props.tool.input === "object" && props.tool.input !== null
    ? (((props.tool.input as Record<string, unknown>).command as string) ?? "")
    : "";

const output =
  typeof props.tool.result === "string"
    ? props.tool.result
    : props.tool.result !== undefined
      ? JSON.stringify(props.tool.result, null, 2)
      : "";

const fullOutput = command ? `$ ${command}\n${output}` : output;
const isStreaming = props.tool.state === "running";
</script>

<template>
  <Terminal :output="fullOutput" :is-streaming="isStreaming">
    <TerminalActions>
      <TerminalCopyButton />
    </TerminalActions>
    <TerminalContent />
  </Terminal>
</template>
```

- [ ] **Step 3: Apply the same pattern to CodexBashView**

Read `CodexBashView.vue` and apply the same Terminal replacement, adjusting for any Codex-specific data shape.

- [ ] **Step 4: Run typecheck**

```bash
yarn typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/components/app/tools/views/BashView.vue src/components/app/tools/views/CodexBashView.vue
git commit -m "feat: replace bash tool views with AI Elements Terminal"
```

---

## Task 6: Replace ChatList + MessageView with Conversation + Message

**Files:**

- Modify: `src/views/SessionView.vue`
- Create: `src/components/app/SessionMessage.vue` (new wrapper)
- Reference: `src/lib/ai-elements-adapter.ts`

This is the most critical task — it replaces the core chat UI.

- [ ] **Step 1: Create SessionMessage component**

This component renders a single message using AI Elements components, switching on the adapted message type.

Create `src/components/app/SessionMessage.vue`:

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import MarkdownView from "./markdown/MarkdownView.vue";
import { getToolViewComponent } from "./tools/views/_all";
import { adaptToolState } from "@/lib/ai-elements-adapter";
import type { NormalizedMessage } from "@/services/messages/types";
import type { Option } from "./markdown/MarkdownView.vue";

interface Props {
  message: NormalizedMessage;
  sessionId: string;
  onOptionPress?: (option: Option) => void;
}

const props = defineProps<Props>();
const router = useRouter();
const isExpanded = ref(false);

const LINE_THRESHOLD = 50;
const INITIAL_LINES = 20;

const isUser = computed(() => props.message.kind === "user-text");
const isAssistant = computed(() => props.message.kind === "agent-text");

const messageRole = computed(() => {
  if (isUser.value) return "user" as const;
  if (isAssistant.value) return "assistant" as const;
  return "system" as const;
});

// Timestamp formatting (preserve from MessageView)
const timestamp = computed(() => {
  const date = new Date(props.message.createdAt);
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
});

const textContent = computed(() => {
  if (props.message.kind === "user-text") {
    return props.message.displayText ?? props.message.text;
  }
  if (props.message.kind === "agent-text") {
    return props.message.text;
  }
  return "";
});

// Long message truncation (preserve from MessageView)
const truncatedContent = computed(() => {
  if (!textContent.value) return { text: "", needsTruncation: false, hiddenLines: 0 };
  const lines = textContent.value.split("\n");
  const needsTruncation = lines.length > LINE_THRESHOLD;
  if (!needsTruncation || isExpanded.value) {
    return { text: textContent.value, needsTruncation, hiddenLines: 0 };
  }
  return {
    text: lines.slice(0, INITIAL_LINES).join("\n"),
    needsTruncation,
    hiddenLines: lines.length - INITIAL_LINES,
  };
});

const eventText = computed(() => {
  if (props.message.kind === "agent-event") {
    const event = props.message.event;
    if (event.type === "switch") return `Switched to ${event.mode}`;
    if (event.type === "message") return event.message;
    if (event.type === "limit-reached") {
      const endsAt = Number(event.endsAt);
      if (Number.isFinite(endsAt)) {
        return `Usage limit until ${new Date(endsAt * 1000).toLocaleTimeString()}`;
      }
      return "Usage limit reached";
    }
    return "System event";
  }
  if (props.message.kind === "system") {
    return props.message.text;
  }
  return "";
});

function openToolMessage(): void {
  if (props.message.kind !== "tool-call") return;
  router.push({
    name: "session-message",
    params: {
      id: props.sessionId,
      messageId: props.message.sourceMessageId ?? props.message.id,
    },
  });
}

function toggleExpanded(): void {
  isExpanded.value = !isExpanded.value;
}
</script>

<template>
  <!-- User / Assistant text messages -->
  <Message v-if="message.kind === 'user-text' || message.kind === 'agent-text'" :from="messageRole">
    <MessageContent>
      <MessageResponse v-if="isAssistant" :content="truncatedContent.text" />
      <div v-else>
        <MarkdownView :markdown="truncatedContent.text" :on-option-press="onOptionPress" />
      </div>
      <button
        v-if="truncatedContent.needsTruncation"
        type="button"
        class="text-xs text-muted-foreground underline underline-offset-4"
        @click="toggleExpanded"
      >
        {{ isExpanded ? "Show less" : `Show ${truncatedContent.hiddenLines} more lines` }}
      </button>
      <!-- Timestamp -->
      <span class="text-xs text-muted-foreground mt-1 block">{{ timestamp }}</span>
    </MessageContent>
  </Message>

  <!-- Tool calls -->
  <button
    v-else-if="message.kind === 'tool-call'"
    type="button"
    class="w-full text-left"
    @click="openToolMessage"
  >
    <Tool :default-open="message.tool.state === 'running'">
      <ToolHeader
        :type="`tool-${message.tool.name}`"
        :state="adaptToolState(message.tool.state, message.tool.permission)"
        :title="message.tool.description ?? message.tool.name"
      />
      <ToolContent>
        <component
          :is="getToolViewComponent(message.tool.name)"
          v-if="getToolViewComponent(message.tool.name)"
          :tool="message.tool"
          :messages="message.children"
        />
        <template v-else>
          <ToolInput :input="message.tool.input" />
          <ToolOutput
            v-if="message.tool.result !== undefined"
            :output="message.tool.result"
            :error-text="message.tool.state === 'error' ? String(message.tool.result) : undefined"
          />
        </template>
      </ToolContent>
    </Tool>
  </button>

  <!-- System / Agent events -->
  <Message v-else-if="message.kind === 'system' || message.kind === 'agent-event'" from="system">
    <MessageContent>
      <p class="text-sm text-muted-foreground italic">
        {{ eventText }}
      </p>
    </MessageContent>
  </Message>

  <!-- Tool results (standalone — rare) -->
  <Message v-else-if="message.kind === 'tool-result'" from="system">
    <MessageContent>
      <Tool :default-open="true">
        <ToolHeader
          type="tool-result"
          :state="message.isError ? 'output-error' : 'output-available'"
          title="Tool Result"
        />
        <ToolContent>
          <ToolOutput
            :output="message.content"
            :error-text="message.isError ? String(message.content) : undefined"
          />
        </ToolContent>
      </Tool>
    </MessageContent>
  </Message>
</template>
```

- [ ] **Step 2: Update SessionView to use Conversation + SessionMessage**

In `src/views/SessionView.vue`, replace the ChatList and ScrollArea with Conversation:

Update imports:

```typescript
// Remove:
import { AgentInput, ChatList, VoiceStatusBar, VoiceButton } from "@/components/app";
import { ScrollArea } from "@/components/ui/scroll-area";

// Add:
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import SessionMessage from "@/components/app/SessionMessage.vue";
import { VoiceStatusBar, VoiceButton } from "@/components/app";
import { Shimmer } from "@/components/ai-elements/shimmer";
```

Replace the `<!-- Content -->` section template:

```vue
<!-- Content -->
<Conversation class="flex-1 min-h-0">
  <!-- Floating voice status bar -->
  <VoiceStatusBar variant="floating" />

  <!-- Loading state -->
  <template v-if="isLoading">
    <div class="p-4 space-y-4">
      <Shimmer v-for="i in 3" :key="i" as="div" class="h-16 rounded-lg bg-muted/50" />
    </div>
  </template>

  <!-- Session not found -->
  <template v-else-if="!session">
    <!-- Keep existing empty state markup -->
  </template>

  <!-- Messages -->
  <ConversationContent v-else-if="normalizedMessages.length > 0">
    <SessionMessage
      v-for="message in normalizedMessages"
      :key="message.id + String(message.createdAt)"
      :message="message"
      :session-id="sessionId"
      :on-option-press="handleOptionPress"
    />
  </ConversationContent>

  <!-- Empty messages -->
  <template v-else>
    <!-- Keep existing empty state markup -->
  </template>

  <ConversationScrollButton />
</Conversation>
```

- [ ] **Step 3: Run typecheck**

```bash
yarn typecheck
```

Fix any type errors.

- [ ] **Step 4: Verify visually**

```bash
yarn dev
```

Open a session and verify:

- User messages render correctly
- Assistant messages render with markdown
- Tool calls render with the collapsible Tool component
- System events render as styled system messages
- Auto-scroll works when new messages arrive
- Scroll-to-bottom button appears

- [ ] **Step 5: Commit**

```bash
git add src/components/app/SessionMessage.vue src/views/SessionView.vue
git commit -m "feat: replace ChatList/MessageView with AI Elements Conversation/Message/Tool"
```

---

## Task 6a: Rewrite ToolFullView for ToolMessageView Route

**Files:**

- Modify: `src/components/app/tools/ToolFullView.vue`
- Modify: `src/views/ToolMessageView.vue` (if needed)

`ToolFullView.vue` is used by the `/session/:id/message/:messageId` route. It imports `ToolSectionView`, `ToolError`, and `PermissionFooter` — all being deleted in Task 12. Rewrite it before deletion.

- [ ] **Step 1: Read ToolFullView.vue**

```bash
cat src/components/app/tools/ToolFullView.vue
```

- [ ] **Step 2: Rewrite using AI Elements Tool**

Rewrite `ToolFullView.vue` using AI Elements `Tool` + `ToolContent` + `ToolInput` + `ToolOutput`, following the same pattern as `SessionMessage.vue`'s tool-call rendering. Keep the specific tool view component dispatch via `getToolViewComponent()`.

- [ ] **Step 3: Verify ToolMessageView route works**

```bash
yarn dev
```

Navigate to `/session/<id>/message/<messageId>` and verify the tool detail view renders.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/tools/ToolFullView.vue
git commit -m "feat: rewrite ToolFullView to use AI Elements Tool component"
```

---

## Task 7: Replace AgentInput with Prompt Input

**Files:**

- Modify: `src/views/SessionView.vue`
- Reference: Existing `AgentInput/` folder for behavior to preserve

- [ ] **Step 1: Read the Prompt Input component source**

```bash
ls src/components/ai-elements/prompt-input/
cat src/components/ai-elements/prompt-input/index.ts
```

Understand available sub-components and their interfaces.

- [ ] **Step 2: Replace AgentInput in SessionView**

In `src/views/SessionView.vue`, replace the AgentInput section.

Update imports:

```typescript
// Remove AgentInput import

// Add:
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputTools,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
```

Replace the input area template:

```vue
<!-- Input area -->
<ResponsiveContainer
  v-if="session?.active"
  size="full"
  padding="compact"
  class="border-t bg-muted/20"
>
  <!-- Suggestions -->
  <Suggestions v-if="!normalizedMessages.length" class="mb-2">
    <Suggestion
      suggestion="What can you help me with?"
      @click="(text: string) => { messageInput = text; handleSendMessage(); }"
    />
    <Suggestion
      suggestion="Show me the project structure"
      @click="(text: string) => { messageInput = text; handleSendMessage(); }"
    />
  </Suggestions>

  <PromptInput @submit="handlePromptSubmit">
    <PromptInputHeader>
      <div class="flex items-center justify-between text-[11px] text-muted-foreground">
        <span :class="machineOnline ? 'text-green-500' : 'text-muted-foreground'">
          {{ machineOnline ? 'Online' : 'Offline' }}
        </span>
        <div class="flex items-center gap-2">
          <span v-if="modelLabel" class="text-muted-foreground">{{ modelLabel }}</span>
          <span v-if="permissionLabel" class="text-muted-foreground">{{ permissionLabel }}</span>
        </div>
      </div>
    </PromptInputHeader>
    <PromptInputBody>
      <PromptInputTextarea />
    </PromptInputBody>
    <PromptInputFooter>
      <PromptInputTools>
        <VoiceButton
          v-if="session?.active"
          :session-id="sessionId"
          size="sm"
          variant="ghost"
        />
      </PromptInputTools>
      <PromptInputSubmit :status="isSending ? 'streaming' : 'ready'" />
    </PromptInputFooter>
  </PromptInput>
</ResponsiveContainer>
```

Add the submit handler:

```typescript
async function handlePromptSubmit(message: PromptInputMessage): Promise<void> {
  await doSendMessage(message.text);
}
```

- [ ] **Step 3: Wire keyboard shortcuts**

The PromptInput's textarea handles Enter/Shift+Enter natively. For model cycling (Cmd+M) and mode cycling (Shift+Tab), add a keydown handler on the PromptInput wrapper or use a global keyboard listener:

```typescript
function handlePromptKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "m") {
    event.preventDefault();
    cycleModelLabel();
  }
  if (event.key === "Tab" && event.shiftKey) {
    event.preventDefault();
    cyclePermissionMode();
  }
}
```

- [ ] **Step 4: Run typecheck**

```bash
yarn typecheck
```

- [ ] **Step 5: Verify visually**

```bash
yarn dev
```

Verify:

- Text input works
- Enter sends message
- Shift+Enter adds newline
- Submit button shows sending state
- Keyboard shortcuts work
- Voice button appears

- [ ] **Step 6: Commit**

```bash
git add src/views/SessionView.vue
git commit -m "feat: replace AgentInput with AI Elements PromptInput"
```

---

## Task 8: Replace ArtifactViewer with Artifact Component

**Files:**

- Modify: `src/components/app/ArtifactViewer.vue`

- [ ] **Step 1: Rewrite ArtifactViewer using Artifact + AppFileTree + CodeBlock**

Rewrite `src/components/app/ArtifactViewer.vue` to use AI Elements `Artifact` for the content display area while keeping the split-pane layout:

```vue
<script setup lang="ts">
import { computed, watch } from "vue";
import { toast } from "vue-sonner";
import { DownloadIcon } from "lucide-vue-next";
import { useArtifactsStore, type DecryptedArtifact } from "@/stores/artifacts";
import { useArtifactDownload } from "@/composables/useArtifactDownload";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
  ArtifactContent,
} from "@/components/ai-elements/artifact";
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockTitle,
  CodeBlockFilename,
  CodeBlockActions,
  CodeBlockCopyButton,
} from "@/components/ai-elements/code-block";
import AppFileTree from "./AppFileTree.vue";

interface Props {
  sessionId?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  sessionId: null,
});

const artifactsStore = useArtifactsStore();
const {
  downloadAll: downloadAllArtifacts,
  downloadSingle,
  downloadProgress,
  isDownloading,
} = useArtifactDownload();

const artifacts = computed(() =>
  props.sessionId
    ? artifactsStore.artifactsForSession(props.sessionId)
    : artifactsStore.artifactsList,
);

const fileTree = computed(() => artifactsStore.fileTree);
const selectedArtifact = computed(() => artifactsStore.selectedArtifact);
const isLoading = computed(() => {
  const selected = artifactsStore.selectedArtifactId;
  return selected ? artifactsStore.isBodyLoading(selected) : false;
});
const isCode = computed(
  () => selectedArtifact.value?.fileType === "code" || selectedArtifact.value?.fileType === "data",
);
const isImage = computed(() => selectedArtifact.value?.fileType === "image");
const displayFilename = computed(() => {
  const artifact = selectedArtifact.value;
  return artifact?.filePath || artifact?.title || artifact?.id || "";
});

function handleSelect(artifactId: string) {
  artifactsStore.setSelectedArtifact(artifactId);
}

function downloadArtifact(artifact: DecryptedArtifact) {
  if (!artifact.body) return;
  downloadSingle(artifact);
}

async function downloadAll() {
  if (artifacts.value.length === 0) {
    toast.error("No artifacts to download");
    return;
  }
  const result = await downloadAllArtifacts(artifacts.value, props.sessionId ?? undefined);
  if (result.success) {
    toast.success(`Downloaded ${result.fileCount} file${result.fileCount !== 1 ? "s" : ""} as ZIP`);
  } else {
    toast.error(result.error ?? "Failed to create ZIP file");
  }
}

watch(
  artifacts,
  (newArtifacts) => {
    if (newArtifacts.length > 0 && !artifactsStore.selectedArtifactId) {
      const firstFile = newArtifacts.find((a) => a.filePath || a.title);
      if (firstFile) artifactsStore.setSelectedArtifact(firstFile.id);
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex h-full border rounded-lg overflow-hidden bg-background">
    <!-- Sidebar with file tree -->
    <div class="w-64 border-r flex flex-col">
      <div class="flex flex-col border-b bg-muted/30">
        <div class="flex items-center justify-between px-3 py-2">
          <span class="text-sm font-medium">Files</span>
          <Button
            v-if="artifacts.length > 0"
            variant="ghost"
            size="sm"
            class="h-7 w-7 p-0"
            :disabled="isDownloading"
            @click="downloadAll"
          >
            <DownloadIcon class="h-4 w-4" />
          </Button>
        </div>
        <div v-if="downloadProgress" class="px-3 pb-2">
          <Progress :model-value="downloadProgress.percent" class="h-1" />
          <p class="text-xs text-muted-foreground mt-1 truncate">{{ downloadProgress.status }}</p>
        </div>
      </div>
      <ScrollArea v-if="artifacts.length > 0" class="flex-1">
        <AppFileTree
          :tree="fileTree"
          :selected-id="artifactsStore.selectedArtifactId"
          @select="handleSelect"
        />
      </ScrollArea>
      <div v-else class="flex-1 p-4 text-center text-muted-foreground">
        <p class="text-sm">No artifacts</p>
      </div>
    </div>

    <!-- Content area -->
    <div class="flex-1 flex flex-col">
      <template v-if="selectedArtifact">
        <Artifact>
          <ArtifactHeader>
            <div>
              <ArtifactTitle>{{ displayFilename }}</ArtifactTitle>
              <ArtifactDescription v-if="selectedArtifact.language">
                {{ selectedArtifact.language }}
              </ArtifactDescription>
            </div>
            <ArtifactActions>
              <ArtifactAction
                tooltip="Download"
                label="Download"
                :icon="DownloadIcon"
                @click="downloadArtifact(selectedArtifact!)"
              />
            </ArtifactActions>
          </ArtifactHeader>
          <ArtifactContent>
            <div v-if="isLoading" class="p-4 space-y-2">
              <div class="h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div class="h-4 w-1/2 bg-muted animate-pulse rounded" />
            </div>
            <ScrollArea v-else-if="isCode && selectedArtifact.body" class="h-full">
              <CodeBlock
                :code="selectedArtifact.body"
                :language="selectedArtifact.language ?? 'text'"
              >
                <CodeBlockHeader>
                  <CodeBlockTitle>
                    <CodeBlockFilename>{{ displayFilename }}</CodeBlockFilename>
                  </CodeBlockTitle>
                  <CodeBlockActions>
                    <CodeBlockCopyButton />
                  </CodeBlockActions>
                </CodeBlockHeader>
              </CodeBlock>
            </ScrollArea>
            <img
              v-else-if="isImage && selectedArtifact.body"
              :src="selectedArtifact.body"
              :alt="displayFilename"
              class="max-w-full max-h-full object-contain p-4"
            />
            <ScrollArea v-else-if="selectedArtifact.body" class="h-full">
              <pre class="p-4 text-sm font-mono whitespace-pre-wrap">{{
                selectedArtifact.body
              }}</pre>
            </ScrollArea>
            <div v-else class="flex-1 flex items-center justify-center text-muted-foreground">
              <p class="text-sm">No content available</p>
            </div>
          </ArtifactContent>
        </Artifact>
      </template>
      <div v-else class="flex-1 flex items-center justify-center text-muted-foreground">
        <p class="text-sm">Select a file to view</p>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Run typecheck**

```bash
yarn typecheck
```

- [ ] **Step 3: Verify visually**

```bash
yarn dev
```

Open a session with artifacts and verify file tree + content display works.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/ArtifactViewer.vue
git commit -m "feat: replace ArtifactViewer with AI Elements Artifact/FileTree/CodeBlock"
```

---

## Task 9: Update ACP Components

**Files:**

- Modify: `src/components/acp/AcpContentBlockRenderer.vue`
- Modify: `src/components/acp/AcpSessionView.vue`
- Modify: `src/components/acp/index.ts`

- [ ] **Step 1: Read AcpContentBlockRenderer.vue**

```bash
cat src/components/acp/AcpContentBlockRenderer.vue
```

Understand what content block types it handles and how they map to AI Elements components.

- [ ] **Step 2: Update AcpContentBlockRenderer to use AI Elements components**

Replace internal rendering with AI Elements equivalents:

- Text blocks → `MessageResponse` from AI Elements Message
- Tool use blocks → `Tool` + `ToolHeader` + `ToolContent`
- Thinking/reasoning blocks → `ChainOfThought` or `Reasoning`

Read the component source, identify each block type handler, and replace with the corresponding AI Elements component import.

- [ ] **Step 3: Update AcpSessionView.vue**

Replace any usage of `AcpThoughtView`, `AcpPlanView`, `AcpToolCallView`, `AcpStreamingText` with AI Elements equivalents:

- `AcpThoughtView` → `ChainOfThought` + `ChainOfThoughtHeader` + `ChainOfThoughtContent`
- `AcpPlanView` → AI Elements `Plan` component
- `AcpToolCallView` → `Tool` component
- `AcpStreamingText` → `Shimmer` for loading, `MessageResponse` for content
- `AcpPermissionDialog` → `Confirmation` component

- [ ] **Step 4: Update ACP index.ts exports**

Remove exports for replaced components, keep exports for preserved components:

```typescript
// Keep:
export { default as AcpSessionBrowser } from "./AcpSessionBrowser.vue";
export { default as AcpAgentPicker } from "./AcpAgentPicker.vue";
export { default as AcpAgentBadge } from "./AcpAgentBadge.vue";
export { default as AcpConfigPanel } from "./AcpConfigPanel.vue";
export { default as AcpCommandPalette } from "./AcpCommandPalette.vue";
export { default as AcpModeIndicator } from "./AcpModeIndicator.vue";
export { default as AcpUsageWidget } from "./AcpUsageWidget.vue";
export { default as AcpContentBlockRenderer } from "./AcpContentBlockRenderer.vue";
export { default as AcpSessionView } from "./AcpSessionView.vue";

// Remove exports for: AcpStreamingText, AcpThoughtView, AcpPlanView, AcpToolCallView, AcpPermissionDialog
```

- [ ] **Step 5: Run typecheck**

```bash
yarn typecheck
```

Fix any import errors from removed exports.

- [ ] **Step 6: Commit**

```bash
git add src/components/acp/
git commit -m "feat: update ACP components to use AI Elements (Tool, ChainOfThought, Confirmation)"
```

---

## Task 10: Replace Voice Components

**Files:**

- Modify: `src/views/SessionView.vue` (VoiceStatusBar, VoiceButton references)
- Create: `src/components/app/voice/AppVoiceControls.vue` (new wrapper)

- [ ] **Step 1: Read existing voice components**

```bash
cat src/components/app/voice/VoiceButton.vue
cat src/components/app/voice/VoiceStatusBar.vue
cat src/components/app/voice/VoiceBars.vue
```

Understand the 11Labs integration and composable usage.

- [ ] **Step 2: Read AI Elements voice component sources**

```bash
ls src/components/ai-elements/speech-input/
ls src/components/ai-elements/audio-player/
ls src/components/ai-elements/voice-selector/
```

Understand their interfaces.

- [ ] **Step 3: Create AppVoiceControls wrapper**

Create `src/components/app/voice/AppVoiceControls.vue` that combines AI Elements Speech Input and Audio Player with the existing 11Labs composable:

```vue
<script setup lang="ts">
/**
 * AppVoiceControls — Combines AI Elements voice components with 11Labs integration.
 * Replaces VoiceButton + VoiceStatusBar + VoiceBars.
 */
// Read the existing useVoice/use11Labs composable to understand the interface
// Wire Speech Input for recording, Audio Player for playback
// Preserve existing session-based voice state management
</script>

<template>
  <!-- Wire AI Elements SpeechInput for voice recording -->
  <!-- Wire AI Elements AudioPlayer for TTS playback -->
  <!-- Show voice status inline -->
</template>
```

**Note**: The exact implementation depends on the voice composable interface. The agent implementing this task must read `src/composables/useVoice.ts` (or similar) and the AI Elements speech-input/audio-player source to wire them together.

- [ ] **Step 4: Update SessionView to use AppVoiceControls**

Replace `VoiceButton` and `VoiceStatusBar` imports with `AppVoiceControls`.

- [ ] **Step 5: Run typecheck and verify**

```bash
yarn typecheck
yarn dev
```

- [ ] **Step 6: Commit**

```bash
git add src/components/app/voice/ src/views/SessionView.vue
git commit -m "feat: replace voice components with AI Elements SpeechInput/AudioPlayer"
```

---

## Task 11: Replace Workflow Components

**Files:**

- Find and modify: All files using `@vue-flow/core`, `@vue-flow/controls`, `@vue-flow/node-toolbar`

- [ ] **Step 1: Find all Vue Flow consumers**

```bash
grep -r "@vue-flow" src/ --include="*.vue" --include="*.ts" -l
```

- [ ] **Step 2: Read AI Elements workflow component sources**

```bash
ls src/components/ai-elements/canvas/
ls src/components/ai-elements/node/
ls src/components/ai-elements/edge/
ls src/components/ai-elements/controls/
```

- [ ] **Step 3: Replace Vue Flow usage with AI Elements wrappers**

For each file found in Step 1:

- Replace `@vue-flow/core` `VueFlow` with AI Elements `Canvas`
- Replace custom node templates with AI Elements `Node` compound component
- Replace `@vue-flow/controls` with AI Elements `Controls`
- Replace `@vue-flow/node-toolbar` with AI Elements `Toolbar`
- Replace default edges with AI Elements `Edge`

**Note**: The exact changes depend on how Vue Flow is currently used. The implementing agent must read each consumer file and map the current Vue Flow usage to the AI Elements equivalents.

- [ ] **Step 4: Run typecheck**

```bash
yarn typecheck
```

- [ ] **Step 5: Commit**

Stage the specific files modified in this task and commit:

```bash
git add src/components/ src/views/
git commit -m "feat: replace Vue Flow components with AI Elements workflow wrappers"
```

---

## Task 12: Cleanup — Remove Old Components

**Files:**

- Remove: All files listed in "Files to Remove" section above

- [ ] **Step 1: Verify no remaining imports of old components**

For each file to be removed, verify nothing still imports it:

```bash
grep -r "from.*ChatList" src/ --include="*.vue" --include="*.ts"
grep -r "from.*MessageView" src/ --include="*.vue" --include="*.ts"
grep -r "from.*AgentInput" src/ --include="*.vue" --include="*.ts"
grep -r "from.*MultiTextInput" src/ --include="*.vue" --include="*.ts"
grep -r "from.*AgentInputAutocomplete" src/ --include="*.vue" --include="*.ts"
grep -r "from.*AgentInputSuggestionView" src/ --include="*.vue" --include="*.ts"
grep -r "from.*ToolResult'" src/ --include="*.vue" --include="*.ts"
grep -r "from.*ToolView'" src/ --include="*.vue" --include="*.ts"
grep -r "from.*ToolHeader'" src/ --include="*.vue" --include="*.ts"
grep -r "from.*ToolSectionView" src/ --include="*.vue" --include="*.ts"
grep -r "from.*ToolError'" src/ --include="*.vue" --include="*.ts"
grep -r "from.*PermissionFooter" src/ --include="*.vue" --include="*.ts"
grep -r "from.*VoiceBars" src/ --include="*.vue" --include="*.ts"
grep -r "from.*VoiceButton" src/ --include="*.vue" --include="*.ts"
grep -r "from.*VoiceStatusBar" src/ --include="*.vue" --include="*.ts"
grep -r "from.*ImagePreview" src/ --include="*.vue" --include="*.ts"
grep -r "from.*AcpThoughtView" src/ --include="*.vue" --include="*.ts"
grep -r "from.*AcpPlanView" src/ --include="*.vue" --include="*.ts"
grep -r "from.*AcpToolCallView" src/ --include="*.vue" --include="*.ts"
grep -r "from.*AcpStreamingText" src/ --include="*.vue" --include="*.ts"
grep -r "from.*AcpPermissionDialog" src/ --include="*.vue" --include="*.ts"
```

If any imports remain, update them before deleting.

- [ ] **Step 2: Update barrel exports**

Check if there's an `src/components/app/index.ts` barrel file and update it:

```bash
cat src/components/app/index.ts
```

Remove exports for deleted components, add exports for new wrappers (SessionMessage, AppFileTree, AppVoiceControls).

- [ ] **Step 3: Delete old files**

```bash
cd /volume1/Projects/happy/apps/web/vue

# Old chat components
rm src/components/app/ChatList.vue
rm src/components/app/MessageView.vue

# Old code components
rm src/components/app/simpleSyntaxHighlighter.ts
rm src/components/app/FileTree.vue
rm src/components/app/VirtualFileTree.vue
rm src/components/app/ImagePreview.vue

# Old input components
rm -rf src/components/app/AgentInput/
rm src/components/app/AgentInputAutocomplete.vue
rm src/components/app/AgentInputSuggestionView.vue
rm src/components/app/MultiTextInput.vue

# Old autocomplete (if not wired into PromptInput)
rm -rf src/components/app/autocomplete/

# Old tool components
rm src/components/app/ToolResult.vue
rm src/components/app/tools/ToolView.vue
rm src/components/app/tools/ToolHeader.vue
rm src/components/app/tools/ToolSectionView.vue
rm src/components/app/tools/ToolError.vue
rm src/components/app/tools/PermissionFooter.vue
rm src/components/app/tools/ToolStatusIndicator.vue
rm src/components/app/tools/useElapsedTime.ts

# Old voice components
rm src/components/app/voice/VoiceBars.vue
rm src/components/app/voice/VoiceButton.vue
rm src/components/app/voice/VoiceStatusBar.vue

# Old ACP components
rm src/components/acp/AcpThoughtView.vue
rm src/components/acp/AcpPlanView.vue
rm src/components/acp/AcpToolCallView.vue
rm src/components/acp/AcpStreamingText.vue
rm src/components/acp/AcpPermissionDialog.vue
```

- [ ] **Step 4: Run typecheck**

```bash
yarn typecheck
```

Expected: PASS. If any type errors appear, there are still references to deleted files that need updating.

- [ ] **Step 5: Commit**

Stage deleted and modified files and commit:

```bash
git add src/components/app/ src/components/acp/
git commit -m "chore: remove old components replaced by AI Elements Vue"
```

---

## Task 13: Dependency Cleanup & Final Verification

**Files:**

- Modify: `apps/web/vue/package.json` (potentially)
- Modify: Existing test files

- [ ] **Step 1: Verify ToolFullView.vue was rewritten (done in Task 6a below)**

ToolFullView.vue must be rewritten before it can be deleted in Task 12. Verify that the rewrite from Task 6a is complete and the `/session/:id/message/:messageId` route works.

- [ ] **Step 2: Update ToolDiffView.vue imports**

Check if `ToolDiffView.vue` imports any deleted files:

```bash
grep -r "import.*from" src/components/app/tools/ToolDiffView.vue
```

Update any imports pointing to deleted files.

- [ ] **Step 3: Audit and wire i18n translations**

Find all translation keys used by replaced components:

```bash
grep -r "t('" src/components/app/ChatList.vue src/components/app/MessageView.vue src/components/app/AgentInput/ src/components/app/tools/ToolView.vue src/components/app/tools/ToolHeader.vue --include="*.vue" 2>/dev/null
```

For each key found, add the corresponding `t()` call to the new AI Elements source-copied components or pass the translated string via props/slots. Check `src/i18n/locales/en.json` for orphaned keys from deleted components.

- [ ] **Step 4: Benchmark FileTree performance with large artifact sets**

Test with 500+ artifacts to verify no performance regression from removing virtual scrolling:

```bash
# In the browser console on a session with many artifacts:
# performance.now() before/after rendering
```

If rendering takes >100ms or causes jank, implement a virtualized wrapper around AppFileTree or retain the virtual scrolling threshold.

- [ ] **Step 5: Verify dark mode and theming**

Start the dev server and toggle dark mode:

```bash
yarn dev
```

Verify all AI Elements components render correctly in both light and dark modes. Check that CSS variables (`--background`, `--foreground`, `--primary`, etc.) are respected.

- [ ] **Step 6: Run accessibility tests**

```bash
yarn test:a11y
```

Fix any ARIA or keyboard navigation regressions.

- [ ] **Step 7: Check if ansi-to-vue3 is still needed**

```bash
grep -r "ansi-to-vue3" src/ --include="*.vue" --include="*.ts"
```

If the AI Elements Terminal component bundles its own ANSI support and no other file imports `ansi-to-vue3`, remove it:

```bash
cd /volume1/Projects/happy
yarn workspace happy-vue remove ansi-to-vue3
```

- [ ] **Step 2: Check if @tanstack/vue-virtual is still needed**

```bash
grep -r "@tanstack/vue-virtual" src/ --include="*.vue" --include="*.ts"
```

If VirtualFileTree was the only consumer (now deleted), remove it:

```bash
cd /volume1/Projects/happy
yarn workspace happy-vue remove @tanstack/vue-virtual
```

- [ ] **Step 3: Check if Vue Flow sub-packages are still needed**

```bash
grep -r "@vue-flow/background\|@vue-flow/controls\|@vue-flow/node-toolbar" src/ --include="*.vue" --include="*.ts"
```

If no direct imports remain (AI Elements workflow components wrap them), consider keeping them as they may be peer dependencies of the AI Elements workflow components.

- [ ] **Step 4: Update existing unit tests**

Find test files that import old components:

```bash
grep -r "ChatList\|MessageView\|AgentInput\|ToolView\|CodeBlock\|FileTree\|VoiceButton" src/ --include="*.test.ts" --include="*.spec.ts" -l
```

Update each test file to import from new locations or test the new wrapper components.

- [ ] **Step 5: Run full test suite**

```bash
yarn test:run
```

Fix any failing tests.

- [ ] **Step 6: Run typecheck one final time**

```bash
yarn typecheck
```

Expected: PASS.

- [ ] **Step 7: Run lint**

```bash
yarn lint
```

Fix any lint issues.

- [ ] **Step 8: Commit**

```bash
git add package.json yarn.lock src/
git commit -m "chore: dependency cleanup and test updates for AI Elements integration"
```

- [ ] **Step 8: Run E2E tests and update visual baselines**

```bash
yarn test:e2e
```

If visual regression tests fail due to component changes (expected), update Percy baselines:

```bash
yarn test:e2e:visual:local
```

Review screenshot diffs to confirm changes are expected.

- [ ] **Step 9: Check router imports**

```bash
grep -r "from.*components/app" src/router/ --include="*.ts"
```

Ensure the router does not import any deleted components (e.g., for lazy-loaded route components).

- [ ] **Step 10: Final manual verification**

Start the dev server and walk through these flows:

1. **Session list** → load home page, see sessions
2. **Session chat** → open a session, see messages render with AI Elements components
3. **Send message** → type in Prompt Input, send, see response
4. **Tool calls** → verify tool calls render with collapsible Tool component
5. **Artifacts** → open artifact viewer, see file tree + code rendering
6. **Voice** → test voice controls if applicable
7. **Keyboard shortcuts** → Cmd+M (model cycle), Shift+Tab (mode cycle), Enter (send)

```bash
yarn dev
```
