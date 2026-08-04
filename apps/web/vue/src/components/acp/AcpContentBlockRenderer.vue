<!--
  HAP-1047: ACP Content Block Renderer (Dispatcher)

  Selects and renders the appropriate component for each ACP content
  block type. Handles text, image, resource_link, resource types.
  Unknown content types are rendered with a graceful fallback.

  HAP-1099: Text blocks now render via the AI Elements MessageResponse
  component (vue-stream-markdown) instead of the deprecated
  AcpStreamingText wrapper.
-->
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AcpContentBlock } from "@magic-agent/protocol";
import { MessageResponse } from "@/components/ai-elements/message";

const props = defineProps<{
  content: AcpContentBlock;
}>();

const { t } = useI18n();
</script>

<template>
  <div v-if="props.content.type === 'text' && props.content.text" class="my-1">
    <MessageResponse :content="props.content.text" />
  </div>

  <div v-else-if="props.content.type === 'image'" class="my-1 overflow-hidden rounded-lg">
    <img
      :src="`data:${props.content.mimeType};base64,${props.content.data}`"
      :alt="t('acp.content.image')"
      class="max-h-80 max-w-full object-contain"
      decoding="async"
      loading="lazy"
    />
  </div>

  <div
    v-else-if="props.content.type === 'resource_link'"
    class="my-0.5 rounded-[10px] bg-muted/50 p-2.5"
  >
    <p class="text-sm font-medium text-foreground">
      {{ props.content.name }}
    </p>
    <p v-if="props.content.description" class="mt-0.5 text-xs text-muted-foreground">
      {{ props.content.description }}
    </p>
    <p class="mt-0.5 truncate font-mono text-xs text-muted-foreground">
      {{ props.content.uri }}
    </p>
  </div>

  <div
    v-else-if="props.content.type === 'resource'"
    class="my-0.5 rounded-[10px] bg-muted/50 p-2.5"
  >
    <p class="truncate font-mono text-xs text-muted-foreground">
      {{ props.content.resource.uri }}
    </p>
    <p
      v-if="'text' in props.content.resource"
      class="mt-1 text-sm text-foreground whitespace-pre-wrap"
    >
      {{ props.content.resource.text }}
    </p>
  </div>

  <div v-else-if="props.content.type === 'audio'" class="my-0.5 rounded-[10px] bg-muted/50 p-3">
    <p class="text-[13px] italic text-muted-foreground">
      {{ t("acp.content.audioUnsupported") }}
    </p>
  </div>

  <div v-else class="my-0.5 rounded-[10px] bg-muted/50 p-3">
    <p class="text-[13px] italic text-muted-foreground">
      {{ t("acp.content.unknownType", { type: (props.content as any).type ?? "unknown" }) }}
    </p>
  </div>
</template>
