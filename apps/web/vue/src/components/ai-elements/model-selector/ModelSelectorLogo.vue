<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface Props {
  provider: string;
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();
</script>

<template>
  <img
    :alt="`${props.provider} logo`"
    :class="cn('size-3 dark:invert', props.class)"
    decoding="async"
    height="12"
    loading="lazy"
    :src="`https://models.dev/logos/${props.provider}.svg`"
    width="12"
    v-bind="$attrs"
  />
</template>
