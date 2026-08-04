<script setup lang="ts">
/**
 * Session View - Session Detail with Messages
 *
 * Displays a single session's conversation history with Claude.
 * Shows messages in chronological order with real-time updates.
 */

import { computed, ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useForm } from "@tanstack/vue-form";
import { z } from "zod";
import { useSessionsStore } from "@/stores/sessions";
import { useMessagesStore } from "@/stores/messages";
import { useAuthStore } from "@/stores/auth";
import { useMachinesStore, isMachineOnline } from "@/stores/machines";
import { SessionMessage, AppVoiceControls } from "@/components/app";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  PromptInput,
  PromptInputBody,
  PromptInputHeader,
  PromptInputFooter,
  PromptInputTextarea,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputButton,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { ShareSessionModal } from "@/components/app/sharing";
import ResponsiveContainer from "@/components/app/ResponsiveContainer.vue";
import { useResponsiveLayout } from "@/composables/useResponsiveLayout";
import { fetchSessionMessages } from "@/services/sessions";
import {
  decryptMessageContent,
  decryptSessionMetadata,
} from "@/services/encryption/sessionDecryption";
import { normalizeDecryptedMessage } from "@/services/messages/normalize";
import type { NormalizedMessage } from "@/services/messages/types";
import { sendSessionMessage } from "@/services/sync/messages";
import { toast } from "vue-sonner";
import { Info, Settings } from "lucide-vue-next";

interface SessionMetadata {
  name?: string;
  title?: string;
  path?: string;
  projectPath?: string;
  machineId?: string;
  flavor?: string;
}

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const sessionsStore = useSessionsStore();
const messagesStore = useMessagesStore();
const authStore = useAuthStore();
const machinesStore = useMachinesStore();

// Responsive layout for session view (HAP-976)
const { containerClass: responsiveContainerClass, isSinglePanel } = useResponsiveLayout(
  [{ id: "main", minBreakpoint: "sm", defaultWidth: 100, collapsible: false }],
  "main",
);

// Session ID from route params
const sessionId = computed(() => route.params.id as string);

// Session data
const session = computed(() =>
  sessionId.value ? sessionsStore.getSession(sessionId.value) : undefined,
);

// Messages for this session
const messages = computed(() =>
  sessionId.value ? messagesStore.getMessagesForSession(sessionId.value) : [],
);

// Loading state
const isLoading = ref(true);
const decryptedMetadata = ref<SessionMetadata | null>(null);
const decryptedContentById = ref<Map<string, string>>(new Map());
const isSending = ref(false);
const isShareModalOpen = ref(false);

const messageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

const messageForm = useForm({
  defaultValues: {
    message: "",
  },
  validators: {
    onSubmit: messageSchema,
  },
  onSubmit: async ({ value }) => {
    await doSendMessage(value.message);
  },
});

const sendStatus = ref<"ready" | "submitted" | "streaming" | "error">("ready");

const emptyStateSuggestions = [
  "Explain the project structure",
  "Run the tests",
  "Show recent changes",
  "Summarize the conversation",
];

async function refreshMetadata(): Promise<void> {
  if (!session.value) {
    decryptedMetadata.value = null;
    return;
  }

  const currentSession = session.value;
  const decrypted = await decryptSessionMetadata<SessionMetadata>(currentSession);
  if (session.value?.id !== currentSession.id) {
    return;
  }

  if (decrypted) {
    decryptedMetadata.value = decrypted;
    return;
  }

  try {
    decryptedMetadata.value = JSON.parse(currentSession.metadata) as SessionMetadata;
  } catch {
    decryptedMetadata.value = null;
  }
}

async function refreshDecryptedMessages(): Promise<void> {
  if (!session.value) {
    decryptedContentById.value = new Map();
    return;
  }

  const currentSession = session.value;
  const currentMessages = messages.value;
  const results = await Promise.all(
    currentMessages.map(async (message) => ({
      id: message.id,
      content: await decryptMessageContent(message, currentSession),
    })),
  );

  if (session.value?.id !== currentSession.id) {
    return;
  }

  const next = new Map<string, string>();
  for (const result of results) {
    if (result.content !== null) {
      next.set(result.id, result.content);
    }
  }
  decryptedContentById.value = next;
}

const sessionName = computed(() => {
  if (!session.value) return "Session";
  try {
    const meta = decryptedMetadata.value ?? JSON.parse(session.value.metadata);
    return meta.name || meta.title || `Session ${sessionId.value.slice(0, 8)}`;
  } catch {
    return `Session ${sessionId.value.slice(0, 8)}`;
  }
});

const projectPath = computed(() => {
  if (!session.value) return null;
  try {
    const meta = decryptedMetadata.value ?? JSON.parse(session.value.metadata);
    return meta.path || meta.projectPath || null;
  } catch {
    return null;
  }
});

const statusText = computed(() => {
  if (!session.value) return "Disconnected";
  return session.value.active ? "Connected" : "Archived";
});

const statusColor = computed(() => (session.value?.active ? "text-green-500" : "text-gray-500"));

const codexModelOptions = ["gpt-5-codex high", "gpt-5-codex medium", "gpt-5-codex low"];

const codexPermissionModes = [
  { value: "default", label: "default" },
  { value: "read-only", label: "read-only" },
  { value: "safe-yolo", label: "safe yolo" },
  { value: "yolo", label: "yolo" },
];

const claudePermissionModes = [
  { value: "default", label: "default" },
  { value: "acceptEdits", label: "accept edits" },
  { value: "plan", label: "plan" },
  { value: "bypassPermissions", label: "bypass permissions" },
];

const modelLabel = ref("");
const permissionMode = ref("default");

const permissionLabel = computed(() => {
  if (permissionMode.value === "default") {
    return "";
  }
  const isCodex =
    decryptedMetadata.value?.flavor === "codex" || decryptedMetadata.value?.flavor === "gpt";
  const options = isCodex ? codexPermissionModes : claudePermissionModes;
  const match = options.find((option) => option.value === permissionMode.value);
  return match?.label ?? "default";
});

watch(
  () => decryptedMetadata.value?.flavor,
  (flavor) => {
    const defaultCodexModel = codexModelOptions[0] ?? "gpt-5-codex high";
    const defaultCodexMode = codexPermissionModes[0]?.value ?? "default";
    const defaultClaudeMode = claudePermissionModes[0]?.value ?? "default";

    if (flavor === "codex" || flavor === "gpt") {
      modelLabel.value = defaultCodexModel;
      permissionMode.value = defaultCodexMode;
      return;
    }
    modelLabel.value = "";
    permissionMode.value = defaultClaudeMode;
  },
  { immediate: true },
);

function cycleModelLabel(): void {
  if (!modelLabel.value) {
    return;
  }
  const currentIndex = codexModelOptions.indexOf(modelLabel.value);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % codexModelOptions.length;
  modelLabel.value = codexModelOptions[nextIndex] ?? codexModelOptions[0] ?? modelLabel.value;
}

function cyclePermissionMode(): void {
  const isCodex =
    decryptedMetadata.value?.flavor === "codex" || decryptedMetadata.value?.flavor === "gpt";
  const options = isCodex ? codexPermissionModes : claudePermissionModes;
  const currentIndex = options.findIndex((option) => option.value === permissionMode.value);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % options.length;
  permissionMode.value = options[nextIndex]?.value ?? "default";
}

const normalizedMessages = computed<NormalizedMessage[]>(() => {
  if (!session.value) {
    return [];
  }

  // Two-pass to handle out-of-order decryption: a tool-result may arrive
  // (or decrypt) before its matching tool-call. First pass collects all
  // normalized items and indexes every tool-call by id; second pass folds
  // each result into its call if present, otherwise emits the result.
  const allItems: NormalizedMessage[] = [];
  const toolCalls = new Map<string, NormalizedMessage>();

  for (const message of messages.value) {
    const decrypted = decryptedContentById.value.get(message.id);
    if (!decrypted) {
      allItems.push({
        kind: "system",
        id: message.id,
        sourceMessageId: message.id,
        localId: message.localId,
        createdAt: message.createdAt,
        text: t("session.encryptedMessagePlaceholder"),
      });
      continue;
    }

    const normalized = normalizeDecryptedMessage({
      id: message.id,
      localId: message.localId,
      createdAt: message.createdAt,
      decrypted,
    });
    if (normalized.length === 0) {
      allItems.push({
        kind: "system",
        id: message.id,
        sourceMessageId: message.id,
        localId: message.localId,
        createdAt: message.createdAt,
        text: decrypted,
      });
      continue;
    }

    for (const item of normalized) {
      allItems.push(item);
      if (item.kind === "tool-call") {
        toolCalls.set(item.id, item);
      }
    }
  }

  const result: NormalizedMessage[] = [];
  for (const item of allItems) {
    if (item.kind === "tool-result") {
      const toolCall = toolCalls.get(item.toolUseId);
      if (toolCall && toolCall.kind === "tool-call") {
        toolCall.tool.state = item.isError ? "error" : "completed";
        toolCall.tool.result = item.content;
        toolCall.tool.permission = item.permission;
        continue;
      }
    }
    result.push(item);
  }

  return result;
});

const machineOnline = computed(() => {
  const machineId = decryptedMetadata.value?.machineId;
  if (!machineId) return false;
  const machine = machinesStore.getMachine(machineId);
  return machine ? isMachineOnline(machine) : false;
});

async function loadArchivedHistory(): Promise<void> {
  if (!session.value || session.value.active) {
    return;
  }

  if (!authStore.token) {
    toast.error("Not authenticated");
    return;
  }

  try {
    const apiMessages = await fetchSessionMessages(sessionId.value, authStore.token);
    const mappedMessages = apiMessages.map((message) => ({
      id: message.id,
      sessionId: sessionId.value,
      seq: message.seq,
      localId: message.localId ?? null,
      content: message.content,
      createdAt: message.createdAt,
    }));
    mappedMessages.sort((a, b) => a.seq - b.seq);
    messagesStore.setMessagesForSession(sessionId.value, mappedMessages);
  } catch (error) {
    console.error("[session] Failed to load archived history", error);
    toast.error("Failed to load session history");
  }
}

onMounted(async () => {
  await loadArchivedHistory();
  await refreshMetadata();
  await refreshDecryptedMessages();
  isLoading.value = false;
});

watch(sessionId, async () => {
  isLoading.value = true;
  await loadArchivedHistory();
  await refreshMetadata();
  await refreshDecryptedMessages();
  isLoading.value = false;
});

watch(
  () => [session.value, messages.value],
  async () => {
    await refreshMetadata();
    await refreshDecryptedMessages();
  },
);

function goBack() {
  router.push("/");
}

function navigateToInfo() {
  router.push(`/session/${sessionId.value}/info`);
}

function navigateToSettings() {
  router.push("/settings");
}

function openShareModal() {
  isShareModalOpen.value = true;
}

async function handlePromptSubmit(payload: PromptInputMessage): Promise<void> {
  const text = payload.text ?? "";
  messageForm.setFieldValue("message", text);
  await messageForm.handleSubmit();
}

async function doSendMessage(text: string): Promise<void> {
  if (!session.value || !session.value.active) {
    toast.error("Session is not active");
    return;
  }

  if (isSending.value) {
    return;
  }

  const trimmedText = text.trim();
  if (!trimmedText) {
    return;
  }

  isSending.value = true;
  sendStatus.value = "submitted";
  const result = await sendSessionMessage(session.value, trimmedText, permissionMode.value);
  isSending.value = false;

  if (!result.ok) {
    sendStatus.value = "error";
    const errorMessage = result.error ?? "Failed to send message";
    toast.error(errorMessage);
    // Throw so PromptInput's submit handler treats this as an error and
    // preserves the user's input instead of clearing it on resolve.
    throw new Error(errorMessage);
  }

  sendStatus.value = "ready";
  messageForm.reset();
}

async function handleOptionPress(option: { title: string }): Promise<void> {
  messageForm.setFieldValue("message", option.title);
  await messageForm.handleSubmit();
}

async function handleSuggestionClick(suggestion: string): Promise<void> {
  await handleOptionPress({ title: suggestion });
}

function handlePromptKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "m") {
    event.preventDefault();
    cycleModelLabel();
    return;
  }

  // Ctrl/Cmd+Shift+P cycles permission mode without hijacking Shift+Tab
  // (which must remain free for backward keyboard navigation — WCAG 2.1).
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "p") {
    event.preventDefault();
    cyclePermissionMode();
  }
}
</script>

<template>
  <div
    :class="[responsiveContainerClass, 'min-h-0 bg-background']"
    :data-single-panel="isSinglePanel || undefined"
  >
    <header class="flex items-center gap-4 border-b bg-background sticky top-0 z-10">
      <ResponsiveContainer size="full" padding="compact" class="flex items-center gap-4">
        <Button variant="ghost" size="icon" @click="goBack">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Button>

        <button class="flex-1 min-w-0 text-left" @click="navigateToInfo">
          <h1 class="font-semibold truncate">{{ sessionName }}</h1>
          <div class="flex items-center gap-2 text-sm">
            <p v-if="projectPath" class="text-muted-foreground truncate">{{ projectPath }}</p>
            <span :class="['flex items-center gap-1', statusColor]">
              <span class="w-2 h-2 rounded-full bg-current" />
              {{ statusText }}
            </span>
          </div>
        </button>

        <!-- Voice controls (AI Elements SpeechInput + AudioPlayer) -->
        <AppVoiceControls v-if="session?.active" :session-id="sessionId" />

        <Button variant="ghost" size="icon" @click="openShareModal" title="Share session">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        </Button>

        <Button variant="ghost" size="icon" @click="navigateToInfo">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </Button>
      </ResponsiveContainer>
    </header>

    <!-- Content -->
    <div class="relative flex flex-1 min-h-0 flex-col">
      <!-- Loading state — Shimmer replaces Skeleton -->
      <div v-if="isLoading" class="flex-1 space-y-4 p-4">
        <Shimmer class="text-sm">Loading conversation…</Shimmer>
        <div class="space-y-3">
          <Shimmer as="div" class="h-4 w-3/4 rounded bg-muted/50" />
          <Shimmer as="div" class="h-4 w-1/2 rounded bg-muted/50" />
          <Shimmer as="div" class="h-4 w-2/3 rounded bg-muted/50" />
        </div>
      </div>

      <!-- Session not found -->
      <div
        v-else-if="!session"
        class="flex flex-1 flex-col items-center justify-center p-8 text-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-12 w-12 text-muted-foreground mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        <h2 class="text-lg font-semibold mb-2">Session Not Found</h2>
        <p class="text-muted-foreground mb-4">
          This session may have been deleted or is no longer available.
        </p>
        <Button @click="goBack">Go Back</Button>
      </div>

      <!-- Messages — AI Elements Conversation with auto-scroll + scroll-to-bottom -->
      <Conversation v-else-if="normalizedMessages.length > 0" class="flex-1 min-h-0">
        <ConversationContent>
          <SessionMessage
            v-for="message in normalizedMessages"
            :key="message.id + String(message.createdAt)"
            :message="message"
            :session-id="sessionId"
            :on-option-press="handleOptionPress"
          />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <!-- Empty messages — with Suggestions from HAP-1097 -->
      <div v-else class="flex flex-1 flex-col items-center justify-center p-8 text-center gap-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-12 w-12 text-muted-foreground mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <h2 class="text-lg font-semibold">No Messages Yet</h2>
        <p class="text-muted-foreground">Messages will appear here when the session starts.</p>
        <Suggestions v-if="session?.active" class="mt-2 justify-center">
          <Suggestion
            v-for="suggestion in emptyStateSuggestions"
            :key="suggestion"
            :suggestion="suggestion"
            @click="handleSuggestionClick"
          />
        </Suggestions>
      </div>
    </div>

    <ResponsiveContainer
      v-if="session?.active"
      size="full"
      padding="compact"
      class="border-t bg-muted/20"
    >
      <!--
        Attachments are intentionally disabled (HAP-1097): sendSessionMessage does not
        accept files, so enabling :multiple would silently drop pasted/dropped files.
        Follow-up to wire the attachment pipeline is tracked separately.
      -->
      <PromptInput class="rounded-2xl" @submit="handlePromptSubmit">
        <PromptInputBody>
          <PromptInputHeader class="justify-between">
            <div class="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span
                class="h-2 w-2 rounded-full"
                :class="machineOnline ? 'bg-emerald-500' : 'bg-gray-400'"
              />
              <span>{{ machineOnline ? "online" : "offline" }}</span>
            </div>
            <div class="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span
                v-if="modelLabel"
                class="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-foreground"
                >{{ modelLabel }}</span
              >
              <span
                v-if="permissionLabel"
                class="rounded-full border border-border/60 bg-background/40 px-2 py-0.5 text-foreground"
                >{{ permissionLabel }}</span
              >
              <Button
                variant="outline"
                size="sm"
                class="h-6 rounded-full border-border/60 bg-background/40 px-3 text-[11px]"
                @click="navigateToSettings"
              >
                CLI Settings
              </Button>
            </div>
          </PromptInputHeader>

          <PromptInputTextarea
            placeholder="Type a message..."
            :disabled="isSending"
            @keydown="handlePromptKeydown"
          />

          <PromptInputFooter>
            <div class="flex items-center gap-2 text-muted-foreground">
              <PromptInputButton
                aria-label="Settings"
                variant="ghost"
                size="icon-sm"
                @click="navigateToSettings"
              >
                <Settings class="size-3.5" />
              </PromptInputButton>
              <PromptInputButton
                aria-label="Info"
                variant="ghost"
                size="icon-sm"
                @click="navigateToInfo"
              >
                <Info class="size-3.5" />
              </PromptInputButton>
              <div class="hidden md:flex items-center gap-2 text-[10px] text-muted-foreground">
                <div class="flex items-center gap-1"><Kbd>Enter</Kbd><span>Send</span></div>
                <div class="flex items-center gap-1">
                  <Kbd>Shift</Kbd><Kbd>Tab</Kbd><span>Cycle mode</span>
                </div>
                <div class="flex items-center gap-1">
                  <Kbd>Cmd</Kbd><Kbd>M</Kbd><span>Cycle model</span>
                </div>
                <div class="flex items-center gap-1"><Kbd>Esc</Kbd><span>Abort</span></div>
              </div>
            </div>
            <PromptInputTools>
              <PromptInputSubmit :status="sendStatus" :disabled="isSending" />
            </PromptInputTools>
          </PromptInputFooter>
        </PromptInputBody>
      </PromptInput>
    </ResponsiveContainer>

    <div v-else class="border-t p-4 bg-muted/30">
      <p class="text-sm text-center text-muted-foreground">
        View-only mode. Use the CLI to send messages.
      </p>
    </div>

    <ShareSessionModal v-model:open="isShareModalOpen" :session-id="sessionId" />
  </div>
</template>
