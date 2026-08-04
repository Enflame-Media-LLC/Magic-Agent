<script setup lang="ts">
import { computed, ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ToolFullView } from "@/components/app";
import { getToolConfig } from "@/components/app/tools/knownTools";
import { useSessionsStore } from "@/stores/sessions";
import { useMessagesStore } from "@/stores/messages";
import { useAuthStore } from "@/stores/auth";
import { decryptMessageContent } from "@/services/encryption/sessionDecryption";
import { normalizeDecryptedMessage } from "@/services/messages/normalize";
import { fetchSessionMessages } from "@/services/sessions";
import type { NormalizedMessage } from "@/services/messages/types";
import { toast } from "vue-sonner";
import ResponsiveContainer from "@/components/app/ResponsiveContainer.vue";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const sessionsStore = useSessionsStore();
const messagesStore = useMessagesStore();
const authStore = useAuthStore();

const sessionId = computed(() => route.params.id as string);
const messageId = computed(() => route.params.messageId as string);

const session = computed(() =>
  sessionId.value ? sessionsStore.getSession(sessionId.value) : undefined,
);
const message = computed(() =>
  sessionId.value && messageId.value
    ? messagesStore.getMessage(sessionId.value, messageId.value)
    : undefined,
);

const normalizedMessages = ref<NormalizedMessage[]>([]);
const isLoading = ref(true);

async function loadArchivedHistory(): Promise<void> {
  if (!session.value || session.value.active) {
    return;
  }

  if (!authStore.token) {
    toast.error(t("errors.notAuthenticated"));
    return;
  }

  try {
    const apiMessages = await fetchSessionMessages(sessionId.value, authStore.token);
    const mappedMessages = apiMessages.map((item) => ({
      id: item.id,
      sessionId: sessionId.value, // Use the session ID from the route param
      seq: item.seq,
      localId: item.localId ?? null,
      content: item.content,
      createdAt: item.createdAt,
    }));
    mappedMessages.sort((a, b) => a.seq - b.seq);
    messagesStore.setMessagesForSession(sessionId.value, mappedMessages);
  } catch (error) {
    console.error("[tool-message] Failed to load archived history", error);
    toast.error(t("session.failedToLoadHistory"));
  }
}

async function refreshNormalized(): Promise<void> {
  if (!session.value || !message.value) {
    normalizedMessages.value = [];
    return;
  }

  const decrypted = await decryptMessageContent(message.value, session.value);
  if (!decrypted) {
    normalizedMessages.value = [];
    return;
  }

  normalizedMessages.value = normalizeDecryptedMessage({
    id: message.value.id,
    localId: message.value.localId,
    createdAt: message.value.createdAt,
    decrypted,
  });
}

const toolMessage = computed(() =>
  normalizedMessages.value.find((msg) => msg.kind === "tool-call"),
);
const toolResultMessage = computed(() =>
  normalizedMessages.value.find((msg) => msg.kind === "tool-result"),
);

const mergedToolCall = computed(() => {
  if (!toolMessage.value) {
    return null;
  }
  if (toolResultMessage.value && toolResultMessage.value.kind === "tool-result") {
    const tool = { ...toolMessage.value.tool };
    tool.state = toolResultMessage.value.isError ? "error" : "completed";
    tool.result = toolResultMessage.value.content;
    tool.permission = toolResultMessage.value.permission;
    return tool;
  }
  return toolMessage.value.tool;
});

/**
 * Header tool: the tool shown in the page header (back button + title).
 * Prefers the merged tool call (includes result state) when available,
 * otherwise falls back to the raw toolMessage.tool.
 */
const headerTool = computed(() => mergedToolCall.value ?? toolMessage.value?.tool ?? null);

const headerTitle = computed(() => {
  const tool = headerTool.value;
  if (!tool) return t("tools.details");
  const config = getToolConfig(tool);
  if (config?.title) {
    return typeof config.title === "function" ? config.title(tool) : config.title;
  }
  return tool.name;
});

const headerSubtitle = computed(() => {
  const tool = headerTool.value;
  if (!tool) return null;
  const config = getToolConfig(tool);
  return config?.subtitle?.(tool) ?? tool.description ?? null;
});

function goBack(): void {
  router.push(`/session/${sessionId.value}`);
}

onMounted(async () => {
  await loadArchivedHistory();
  await refreshNormalized();
  isLoading.value = false;
});

watch([sessionId, messageId], async () => {
  isLoading.value = true;
  await loadArchivedHistory();
  await refreshNormalized();
  isLoading.value = false;
});
</script>

<template>
  <div class="flex h-full flex-col bg-background">
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
        <div class="min-w-0 flex-1">
          <div v-if="headerTool" class="flex flex-col gap-0.5">
            <div class="truncate text-sm font-semibold text-foreground">{{ headerTitle }}</div>
            <div v-if="headerSubtitle" class="truncate text-xs text-muted-foreground">
              {{ headerSubtitle }}
            </div>
          </div>
          <div v-else class="text-sm text-muted-foreground">{{ t("tools.details") }}</div>
        </div>
      </ResponsiveContainer>
    </header>

    <ScrollArea class="flex-1 min-h-0">
      <template v-if="isLoading">
        <ResponsiveContainer size="default" padding="default" class="space-y-4">
          <Skeleton class="h-6 w-1/2" />
          <Skeleton class="h-32 w-full" />
        </ResponsiveContainer>
      </template>

      <template v-else-if="toolMessage">
        <ResponsiveContainer size="default" padding="default">
          <ToolFullView :tool="mergedToolCall ?? toolMessage.tool" :messages="normalizedMessages" />
        </ResponsiveContainer>
      </template>

      <template v-else-if="toolResultMessage">
        <ResponsiveContainer size="default" padding="default">
          <ToolFullView
            :tool="{
              name: t('tools.toolResult'),
              state: toolResultMessage.isError ? 'error' : 'completed',
              input: {},
              createdAt: toolResultMessage.createdAt,
              startedAt: toolResultMessage.createdAt,
              completedAt: toolResultMessage.createdAt,
              description: null,
              result: toolResultMessage.content,
            }"
          />
        </ResponsiveContainer>
      </template>

      <template v-else>
        <div class="flex flex-col items-center justify-center h-full p-8 text-center">
          <h2 class="text-lg font-semibold mb-2">{{ t("tools.detailsUnavailable") }}</h2>
          <p class="text-muted-foreground">{{ t("tools.detailsUnavailableDescription") }}</p>
        </div>
      </template>
    </ScrollArea>
  </div>
</template>
