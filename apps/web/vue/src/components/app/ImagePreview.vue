<script setup lang="ts">
/**
 * ImagePreview - Image viewer with zoom and pan
 *
 * Displays images with:
 * - Zoom controls (buttons and mouse wheel)
 * - Pan support (drag to move)
 * - Fit to container option
 * - Loading state with skeleton
 * - Error handling
 *
 * @example
 * ```vue
 * <ImagePreview
 *   :src="imageDataUrl"
 *   alt="Generated code diagram"
 * />
 * ```
 */

import { ref, computed, onMounted, onUnmounted } from "vue";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  /** Image source (URL or data URL) */
  src: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Filename for display */
  filename?: string;
}

const props = withDefaults(defineProps<Props>(), {
  alt: "Artifact image",
  filename: "",
});

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

const imageRef = ref<HTMLImageElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

const isLoading = ref(true);
const hasError = ref(false);
const scale = ref(1);
const position = ref({ x: 0, y: 0 });
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });

// ─────────────────────────────────────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────────────────────────────────────

const zoomPercent = computed(() => Math.round(scale.value * 100));

const imageStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px) scale(${scale.value})`,
  cursor: isDragging.value ? "grabbing" : "grab",
}));

// ─────────────────────────────────────────────────────────────────────────────
// Methods
// ─────────────────────────────────────────────────────────────────────────────

function handleLoad() {
  isLoading.value = false;
  hasError.value = false;
}

function handleError() {
  isLoading.value = false;
  hasError.value = true;
}

function zoomIn() {
  scale.value = Math.min(scale.value * 1.25, 5);
}

function zoomOut() {
  scale.value = Math.max(scale.value / 1.25, 0.1);
}

function resetZoom() {
  scale.value = 1;
  position.value = { x: 0, y: 0 };
}

function fitToContainer() {
  if (!imageRef.value || !containerRef.value) return;

  const container = containerRef.value.getBoundingClientRect();
  const image = imageRef.value;
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;

  const scaleX = (container.width - 32) / naturalWidth;
  const scaleY = (container.height - 32) / naturalHeight;
  scale.value = Math.min(scaleX, scaleY, 1);
  position.value = { x: 0, y: 0 };
}

function handleWheel(event: WheelEvent) {
  event.preventDefault();
  const delta = event.deltaY > 0 ? 0.9 : 1.1;
  scale.value = Math.max(0.1, Math.min(5, scale.value * delta));
}

function handleMouseDown(event: MouseEvent) {
  if (event.button !== 0) return; // Only left click
  isDragging.value = true;
  dragStart.value = {
    x: event.clientX - position.value.x,
    y: event.clientY - position.value.y,
  };
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value) return;
  position.value = {
    x: event.clientX - dragStart.value.x,
    y: event.clientY - dragStart.value.y,
  };
}

function handleMouseUp() {
  isDragging.value = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

onMounted(() => {
  globalThis.document.addEventListener("mousemove", handleMouseMove);
  globalThis.document.addEventListener("mouseup", handleMouseUp);
});

onUnmounted(() => {
  globalThis.document.removeEventListener("mousemove", handleMouseMove);
  globalThis.document.removeEventListener("mouseup", handleMouseUp);
});
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
      <span v-if="props.filename" class="text-sm font-medium text-muted-foreground truncate">
        {{ props.filename }}
      </span>
      <span v-else class="text-sm text-muted-foreground">Image Preview</span>

      <div class="flex items-center gap-1">
        <span class="text-xs text-muted-foreground mr-2">{{ zoomPercent }}%</span>

        <Button variant="ghost" size="sm" class="h-7 w-7 p-0" title="Zoom out" @click="zoomOut">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
            />
          </svg>
        </Button>

        <Button variant="ghost" size="sm" class="h-7 w-7 p-0" title="Zoom in" @click="zoomIn">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
            />
          </svg>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          class="h-7 w-7 p-0"
          title="Fit to window"
          @click="fitToContainer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </Button>

        <Button variant="ghost" size="sm" class="h-7 w-7 p-0" title="Reset zoom" @click="resetZoom">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </Button>
      </div>
    </div>

    <!-- Image container -->
    <div
      ref="containerRef"
      class="flex-1 overflow-hidden bg-muted/20 flex items-center justify-center"
      @wheel="handleWheel"
      @mousedown="handleMouseDown"
    >
      <!-- Loading state -->
      <Skeleton v-if="isLoading" class="w-64 h-64 rounded-lg" />

      <!-- Error state -->
      <div v-else-if="hasError" class="text-center text-muted-foreground">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-12 w-12 mx-auto mb-2 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p class="text-sm">Failed to load image</p>
      </div>

      <!-- Image -->
      <img
        v-show="!isLoading && !hasError"
        ref="imageRef"
        :src="props.src"
        :alt="props.alt"
        decoding="async"
        class="max-w-none select-none transition-transform duration-100"
        :style="imageStyle"
        draggable="false"
        @load="handleLoad"
        @error="handleError"
      />
    </div>
  </div>
</template>
