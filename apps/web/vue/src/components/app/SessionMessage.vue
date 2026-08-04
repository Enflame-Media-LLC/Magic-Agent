<script setup lang="ts">
/**
 * SessionMessage - Renders a single NormalizedMessage using AI Elements.
 *
 * Replaces the legacy `MessageView.vue` as part of the AI Elements Vue
 * integration epic (HAP-1090). This component is rendered inside a
 * `<Conversation>` / `<ConversationContent>` tree by `SessionView.vue`.
 *
 * Preserves behaviors from MessageView:
 * - HH:MM timestamps on non-system (user/assistant) messages.
 * - Long message truncation (LINE_THRESHOLD=50, INITIAL_LINES=20)
 *   with a "Show N more lines"/"Show less" toggle.
 * - Tool-call click navigates to the tool detail view at
 *   /session/:id/message/:messageId.
 * - Tool-specific view dispatch via `getToolViewComponent()` — falls back
 *   to generic `<ToolInput>` / `<ToolOutput>` when no view is registered.
 * - Tool state/permission mapping via `adaptToolState()` from the adapter.
 *
 * Message kind → AI Elements component mapping:
 * - user-text    → <Message from="user">     + <MessageContent>
 * - agent-text   → <Message from="assistant">+ <MessageResponse>
 * - tool-call    → <Tool> + <ToolHeader> + <ToolContent>
 * - tool-result  → <Message from="system">   + <Tool> + <ToolOutput>
 * - agent-event  → <Message from="system">   with formatted event text
 * - system       → <Message from="system">   with plain text
 *
 * @see HAP-1095 — Replace ChatList + MessageView with AI Elements
 */

import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ExternalLinkIcon } from "lucide-vue-next";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Loader } from "@/components/ai-elements/loader";
import MarkdownView, { type Option } from "./markdown/MarkdownView.vue";
import { getToolViewComponent } from "./tools/views/_all";
import { getToolConfig } from "./tools/knownTools";
import { adaptToolState, describeAgentEvent } from "@/lib/ai-elements-adapter";
import type { NormalizedMessage } from "@/services/messages/types";
import { cn } from "@/lib/utils";

// AI Elements ToolHeader accepts this narrower state union from @ai-sdk.
// Our adapter's AIToolState union is a superset (includes 'output-streaming')
// so we narrow it here and upgrade 'error' tool results to 'output-error' so
// the StatusBadge renders the correct destructive styling.
type ToolHeaderState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "approval-responded"
  | "output-available"
  | "output-error"
  | "output-denied";

interface Props {
  message: NormalizedMessage;
  sessionId: string;
  onOptionPress?: (option: Option) => void;
}

const props = defineProps<Props>();
const router = useRouter();
const { t } = useI18n();
const isExpanded = ref(false);

const LINE_THRESHOLD = 50;
const INITIAL_LINES = 20;

// ── Kind predicates ─────────────────────────────────────────────────────────

const isUser = computed(() => props.message.kind === "user-text");
const isAssistant = computed(() => props.message.kind === "agent-text");

// ── Timestamp (HH:MM) ───────────────────────────────────────────────────────

const timestamp = computed(() => {
  const date = new Date(props.message.createdAt);
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
});

// ── Text content + truncation (for user-text / agent-text) ──────────────────

const rawMarkdown = computed(() => {
  if (props.message.kind === "user-text") {
    return props.message.displayText ?? props.message.text;
  }
  if (props.message.kind === "agent-text") {
    return props.message.text;
  }
  return "";
});

const truncatedMarkdown = computed(() => {
  if (!rawMarkdown.value) {
    return { text: "", needsTruncation: false, hiddenLines: 0 };
  }
  const lines = rawMarkdown.value.split("\n");
  const needsTruncation = lines.length > LINE_THRESHOLD;
  if (!needsTruncation || isExpanded.value) {
    return { text: rawMarkdown.value, needsTruncation, hiddenLines: 0 };
  }
  const hiddenLines = lines.length - INITIAL_LINES;
  return {
    text: lines.slice(0, INITIAL_LINES).join("\n"),
    needsTruncation,
    hiddenLines,
  };
});

function toggleExpanded(): void {
  isExpanded.value = !isExpanded.value;
}

// ── Tool-call rendering ─────────────────────────────────────────────────────

const toolCall = computed(() => (props.message.kind === "tool-call" ? props.message : null));

const toolConfig = computed(() => {
  const t = toolCall.value;
  return t ? getToolConfig(t.tool) : null;
});

const toolTitle = computed(() => {
  const t = toolCall.value;
  if (!t) return undefined;
  const cfg = toolConfig.value;
  if (!cfg?.title) return t.tool.name;
  return typeof cfg.title === "function" ? cfg.title(t.tool) : cfg.title;
});

const toolSubtitle = computed(() => {
  const t = toolCall.value;
  if (!t) return null;
  return toolConfig.value?.subtitle?.(t.tool) ?? null;
});

const SpecificToolView = computed(() => {
  const t = toolCall.value;
  return t ? getToolViewComponent(t.tool.name) : null;
});

const toolState = computed<ToolHeaderState>(() => {
  const t = toolCall.value;
  if (!t) return "input-available";
  // adapter maps error -> 'output-available'; upgrade to 'output-error' for UI.
  if (t.tool.state === "error") return "output-error";
  const adapted = adaptToolState(t.tool.state, t.tool.permission);
  // adapter union includes 'output-streaming' which ToolHeader doesn't accept;
  // our adapter never actually returns it for these inputs, but narrow safely.
  if (adapted === "output-streaming") return "output-available";
  return adapted;
});

const toolErrorText = computed(() => {
  const t = toolCall.value;
  if (!t || t.tool.state !== "error") return undefined;
  const result = t.tool.result;
  if (typeof result === "string") return result;
  if (result == null) return undefined;
  return JSON.stringify(result, null, 2);
});

const toolOutput = computed(() => {
  const t = toolCall.value;
  if (!t) return undefined;
  if (t.tool.state !== "completed") return undefined;
  return t.tool.result;
});

function openToolMessage(event: Event): void {
  event.stopPropagation();
  if (props.message.kind !== "tool-call") return;
  router.push({
    name: "session-message",
    params: {
      id: props.sessionId,
      messageId: props.message.sourceMessageId ?? props.message.id,
    },
  });
}

// ── Tool-result (standalone) rendering ──────────────────────────────────────

const standaloneToolResult = computed(() => {
  if (props.message.kind !== "tool-result") return null;
  const content = props.message.content;
  return {
    isError: props.message.isError,
    output: content,
    errorText: props.message.isError && typeof content === "string" ? content : undefined,
  };
});

// ── Agent-event formatted text ──────────────────────────────────────────────

// Resolve a structured AgentEvent descriptor into localized text via t().
// The adapter is kept pure (no English literals) so all locale handling lives
// in the Vue layer. See HAP-1104.
const agentEventText = computed(() => {
  if (props.message.kind !== "agent-event") return "";
  const descriptor = describeAgentEvent(props.message.event);
  switch (descriptor.type) {
    case "switch":
      return t("message.switchedToMode", { mode: descriptor.mode });
    case "message":
      return descriptor.message;
    case "limit-reached": {
      const endsAt = descriptor.endsAt;
      const time =
        typeof endsAt === "number" && Number.isFinite(endsAt)
          ? new Date(endsAt * 1000).toLocaleTimeString()
          : t("message.unknownTime");
      return t("message.usageLimitUntil", { time });
    }
    case "unknown":
    default:
      return t("message.unknownEvent");
  }
});

// ── Role for <Message from="..."> ───────────────────────────────────────────

const messageRole = computed<"user" | "assistant" | "system">(() => {
  if (isUser.value) return "user";
  if (isAssistant.value) return "assistant";
  return "system";
});

// ── System message styling (for kind === 'system' | 'agent-event' | 'tool-result') ──

const systemBubbleClass = cn(
  "w-full justify-center text-center text-sm italic text-muted-foreground",
);
</script>

<template>
  <!-- user-text / agent-text -->
  <Message v-if="message.kind === 'user-text' || message.kind === 'agent-text'" :from="messageRole">
    <MessageContent>
      <MarkdownView
        v-if="message.kind === 'user-text'"
        :markdown="truncatedMarkdown.text"
        :on-option-press="props.onOptionPress"
      />
      <MessageResponse v-else :content="truncatedMarkdown.text" />

      <button
        v-if="truncatedMarkdown.needsTruncation"
        type="button"
        class="mt-1 self-start text-xs text-muted-foreground underline underline-offset-4"
        @click="toggleExpanded"
      >
        {{
          isExpanded
            ? t("message.showLess")
            : t("message.showMore", { lines: truncatedMarkdown.hiddenLines })
        }}
      </button>

      <span
        :class="['mt-1 block text-xs', isUser ? 'text-foreground/60' : 'text-muted-foreground']"
      >
        {{ timestamp }}
      </span>
    </MessageContent>
  </Message>

  <!-- tool-call: <Tool> collapsible + header + content -->
  <Tool v-else-if="message.kind === 'tool-call' && toolCall" class="max-w-full">
    <div class="flex items-stretch">
      <ToolHeader
        class="flex-1"
        type="dynamic-tool"
        :state="toolState"
        :tool-name="toolCall.tool.name"
        :title="toolTitle"
      />
      <button
        type="button"
        class="flex shrink-0 items-center justify-center border-l px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        :aria-label="`Open details for ${toolTitle}`"
        @click="openToolMessage"
      >
        <ExternalLinkIcon class="size-4" />
      </button>
    </div>

    <p
      v-if="toolSubtitle"
      class="truncate border-t px-3 py-2 font-mono text-xs text-muted-foreground"
    >
      {{ toolSubtitle }}
    </p>

    <ToolContent>
      <!-- In-flight loader -->
      <div
        v-if="toolCall.tool.state === 'running'"
        class="flex items-center gap-2 p-4 text-xs text-muted-foreground"
      >
        <Loader :size="14" />
        <span>{{ t("tools.running") }}</span>
      </div>

      <!-- Specific tool view (BashView, EditView, TodoView, etc.) -->
      <div v-if="SpecificToolView" class="p-4">
        <component :is="SpecificToolView" :tool="toolCall.tool" :messages="toolCall.children" />
      </div>

      <!-- Generic fallback: show parameters + result/error -->
      <template v-else>
        <ToolInput :input="toolCall.tool.input" />
        <ToolOutput
          v-if="toolCall.tool.state !== 'running'"
          :output="toolOutput"
          :error-text="toolErrorText"
        />
      </template>
    </ToolContent>
  </Tool>

  <!-- tool-result (standalone — usually matched with tool-call and folded in) -->
  <Message
    v-else-if="message.kind === 'tool-result' && standaloneToolResult"
    from="system"
    :class="systemBubbleClass"
  >
    <Tool class="max-w-full">
      <ToolHeader
        type="dynamic-tool"
        :state="standaloneToolResult.isError ? 'output-error' : 'output-available'"
        tool-name="tool"
        :title="t('tools.toolResult')"
      />
      <ToolContent>
        <ToolOutput
          :output="standaloneToolResult.output"
          :error-text="standaloneToolResult.errorText"
        />
      </ToolContent>
    </Tool>
  </Message>

  <!-- agent-event -->
  <Message v-else-if="message.kind === 'agent-event'" from="system" :class="systemBubbleClass">
    <MessageContent class="bg-transparent">
      <p class="whitespace-pre-wrap break-words">{{ agentEventText }}</p>
    </MessageContent>
  </Message>

  <!-- system (plain text) -->
  <Message v-else-if="message.kind === 'system'" from="system" :class="systemBubbleClass">
    <MessageContent class="bg-transparent">
      <p class="whitespace-pre-wrap break-words">{{ message.text }}</p>
    </MessageContent>
  </Message>
</template>
