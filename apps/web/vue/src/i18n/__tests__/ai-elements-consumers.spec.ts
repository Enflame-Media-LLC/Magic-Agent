/**
 * AI Elements Consumer i18n Audit
 *
 * Source-level guard that fails if any of the strings extracted under
 * HAP-1104 reappear as hardcoded English literals in their consumer files.
 *
 * AI Elements components themselves ship without vue-i18n integration, but
 * everything that *consumes* AI Elements (SessionView, SessionMessage,
 * AppVoiceControls, ToolMessageView) must route through `t()`.
 *
 * The matcher checks for the literal wrapped in single or double quotes so
 * that mentions in code comments — e.g. "// Show N more lines" — are
 * ignored. New entries should be added here whenever new render paths
 * introduce user-visible English in AI Elements consumers.
 *
 * @see HAP-1104 — i18n audit: extract hardcoded English in AI Elements consumers
 */

import { describe, it, expect } from "vite-plus/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..", "..");

interface AuditTarget {
  file: string;
  literals: string[];
}

const targets: AuditTarget[] = [
  {
    file: "src/views/SessionView.vue",
    literals: [
      "Loading conversation…",
      "Session Not Found",
      "This session may have been deleted or is no longer available.",
      "Go Back",
      "No Messages Yet",
      "Messages will appear here when the session starts.",
      "Type a message...",
      "CLI Settings",
      "Share session",
      "View-only mode. Use the CLI to send messages.",
      "[Encrypted content]",
      "Session is not active",
      "Failed to send message",
      "Failed to load session history",
      "Not authenticated",
      "Explain the project structure",
      "Run the tests",
      "Show recent changes",
      "Summarize the conversation",
    ],
  },
  {
    file: "src/components/app/SessionMessage.vue",
    literals: ["Running…", "Tool result", "Switched to ", "Usage limit until ", "System event"],
  },
  {
    file: "src/components/app/voice/AppVoiceControls.vue",
    literals: [
      "Connecting voice...",
      "End voice session",
      "Start voice session",
      "Mute microphone",
      "Unmute microphone",
    ],
  },
  {
    file: "src/views/ToolMessageView.vue",
    literals: [
      "Tool details",
      "Tool Details Unavailable",
      "We couldn't find a tool call for this message.",
      "Failed to load session history",
      "Not authenticated",
    ],
  },
  {
    file: "src/lib/ai-elements-adapter.ts",
    // The adapter is now pure: it emits a discriminated AgentEventDescriptor
    // instead of a pre-formatted string. None of these literals must remain.
    literals: ["Switched to ", "Rate limit reached", "Event: "],
  },
];

/**
 * Returns true when `text` contains `literal` wrapped in single or double
 * quotes — i.e. as a string literal in source. Comments mentioning the
 * phrase outside of quotes do not count.
 */
function containsQuotedLiteral(text: string, literal: string): boolean {
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`["']${escaped}["']`);
  return pattern.test(text);
}

describe("AI Elements consumer i18n audit (HAP-1104)", () => {
  for (const target of targets) {
    describe(target.file, () => {
      const filePath = resolve(repoRoot, target.file);
      const contents = readFileSync(filePath, "utf8");

      it("imports useI18n from vue-i18n", () => {
        // The adapter is plain TS and intentionally has no vue-i18n
        // dependency — the helper is exercised purely from Vue components.
        if (target.file.endsWith(".ts")) {
          expect(contents).not.toContain("from 'vue-i18n'");
          expect(contents).not.toContain('from "vue-i18n"');
          return;
        }

        expect(contents).toMatch(/from\s+["']vue-i18n["']/);
        expect(contents).toMatch(/useI18n\s*\(/);
      });

      it.each(target.literals)("does not hardcode the literal %j", (literal) => {
        const found = containsQuotedLiteral(contents, literal);
        if (found) {
          throw new Error(
            `${target.file} still contains the hardcoded literal ${JSON.stringify(literal)}; ` +
              `route it through t('namespace.key') instead.`,
          );
        }
        expect(found).toBe(false);
      });
    });
  }
});
