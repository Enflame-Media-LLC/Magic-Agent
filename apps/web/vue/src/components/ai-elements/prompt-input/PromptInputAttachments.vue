<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { FileIcon, XIcon } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import { usePromptInput } from "./context";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();

const { files, removeFile } = usePromptInput();

function isImage(mediaType?: string): boolean {
  return !!mediaType?.startsWith("image/");
}
</script>

<template>
  <div
    v-if="files.length > 0"
    :class="cn('flex flex-wrap items-center gap-2 px-3 pt-3', props.class)"
    data-testid="prompt-input-attachments"
  >
    <div
      v-for="file in files"
      :key="file.id"
      class="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-2 py-1.5 text-xs"
    >
      <img
        v-if="isImage(file.mediaType) && file.url"
        :src="file.url"
        :alt="file.filename || 'attachment'"
        class="size-8 rounded object-cover"
      />
      <FileIcon v-else class="size-4 shrink-0 text-muted-foreground" />
      <span class="max-w-32 truncate">{{ file.filename || "attachment" }}</span>
      <button
        type="button"
        class="text-muted-foreground transition-colors hover:text-foreground"
        :aria-label="`Remove ${file.filename || 'attachment'}`"
        @click="removeFile(file.id)"
      >
        <XIcon class="size-3.5" />
      </button>
    </div>
  </div>
</template>
