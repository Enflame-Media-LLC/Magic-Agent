<script setup lang="ts">
/**
 * AppVoiceControls - Voice Assistant UI Wrapper
 *
 * Wraps AI Elements voice primitives (SpeechInput + AudioPlayer) and drives them
 * with the existing 11Labs-backed `useVoice` composable.
 *
 * The AI Elements SpeechInput is designed around the browser Web Speech API /
 * MediaRecorder, while our voice assistant uses the 11Labs realtime SDK for both
 * capture and playback. We therefore reproduce the SpeechInput visual treatment
 * (circular record button with pulse rings, Mic/Square icons, Spinner while
 * connecting) but wire the click handler to `useVoice.startSession` /
 * `useVoice.endSession`. The AudioPlayer chrome is used as a compact status
 * surface when a session is active — the underlying WebRTC stream continues to
 * be handled by `@11labs/client`.
 *
 * Replaces: VoiceButton.vue, VoiceStatusBar.vue, VoiceBars.vue
 *
 * @see HAP-1100 - Replace voice components with AI Elements SpeechInput + AudioPlayer
 * @see HAP-1091 - AI Elements Vue component library installation
 */

import { computed, defineAsyncComponent, type HTMLAttributes } from "vue";
import { useI18n } from "vue-i18n";
import { MicIcon, MicOffIcon, SquareIcon } from "lucide-vue-next";
import { useVoice } from "@/composables/useVoice";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Lazy-load AudioPlayer so media-chrome's ~25 custom elements only ship when a
// user actually starts voice. Otherwise every active session would pay the
// bundle cost even if voice is never used.
const AudioPlayer = defineAsyncComponent(() =>
  import("@/components/ai-elements/audio-player").then((m) => m.AudioPlayer),
);

interface Props {
  /** Session ID to start voice for */
  sessionId: string;
  /** Initial context for voice session */
  initialContext?: string;
  /** Whether to show the mute button when a session is active */
  showMuteButton?: boolean;
  /** Whether to render the AudioPlayer status surface when active */
  showStatus?: boolean;
  /** Additional classes */
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), {
  showMuteButton: true,
  showStatus: true,
});

const { isActive, isConnecting, isMuted, statusMessage, startSession, endSession, toggleMute } =
  useVoice();
const { t } = useI18n();

const isBusy = computed(() => isConnecting.value);

const buttonLabel = computed(() => {
  if (isBusy.value) return t("voice.connecting");
  if (isActive.value) return t("voice.endSession");
  return t("voice.startSession");
});

const muteLabel = computed(() =>
  isMuted.value ? t("voice.unmuteMicrophone") : t("voice.muteMicrophone"),
);

async function handleToggleVoice() {
  if (isBusy.value) return;

  if (isActive.value) {
    await endSession();
  } else {
    await startSession(props.sessionId, props.initialContext);
  }
}

function handleToggleMute() {
  toggleMute();
}
</script>

<template>
  <div :class="cn('inline-flex items-center gap-2', props.class)" data-slot="app-voice-controls">
    <!-- SpeechInput-style record trigger (driven by 11Labs via useVoice) -->
    <div class="relative inline-flex items-center justify-center">
      <!-- Animated pulse rings (match AI Elements SpeechInput) -->
      <template v-if="isActive">
        <div
          v-for="index in [0, 1, 2]"
          :key="index"
          class="absolute inset-0 animate-ping rounded-full border-2 border-red-400/30"
          :style="{
            animationDelay: `${index * 0.3}s`,
            animationDuration: '2s',
          }"
        />
      </template>

      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            :class="
              cn(
                'relative z-10 rounded-full transition-all duration-300',
                isActive
                  ? 'bg-destructive text-white hover:bg-destructive/80 hover:text-white'
                  : 'bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground',
              )
            "
            size="icon"
            :disabled="isBusy"
            :aria-label="buttonLabel"
            :aria-pressed="isActive"
            @click="handleToggleVoice"
          >
            <Spinner v-if="isBusy" />
            <SquareIcon v-else-if="isActive" class="size-4" />
            <MicIcon v-else class="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ statusMessage }}</p>
        </TooltipContent>
      </Tooltip>
    </div>

    <!-- Mute toggle (only visible while a session is active) -->
    <Tooltip v-if="showMuteButton && isActive">
      <TooltipTrigger as-child>
        <Button
          :variant="isMuted ? 'secondary' : 'ghost'"
          size="icon"
          class="rounded-full"
          :aria-label="muteLabel"
          :aria-pressed="isMuted"
          @click="handleToggleMute"
        >
          <component :is="isMuted ? MicOffIcon : MicIcon" class="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{{ muteLabel }}</p>
      </TooltipContent>
    </Tooltip>

    <!-- AudioPlayer status surface (replaces VoiceStatusBar + VoiceBars) -->
    <AudioPlayer
      v-if="showStatus && isActive"
      class="flex items-center gap-2 rounded-full border bg-muted/60 px-3 py-1 text-xs"
    >
      <span class="size-2 rounded-full bg-green-500" :class="{ 'animate-pulse': isConnecting }" />
      <span class="text-foreground">{{ statusMessage }}</span>
    </AudioPlayer>
  </div>
</template>
