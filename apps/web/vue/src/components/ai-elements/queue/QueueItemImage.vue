<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <img
    alt=""
    :class="cn('h-8 w-8 rounded border object-cover', props.class)"
    decoding="async"
    height="32"
    loading="lazy"
    width="32"
    v-bind="$attrs"
  />
</template>
