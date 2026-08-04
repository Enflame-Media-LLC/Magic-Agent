/**
 * AI Elements Adapter Tests
 *
 * Comprehensive unit tests for the NormalizedMessage -> AI Elements adapter.
 * Covers all 6 NormalizedMessage kinds, tool state mapping, and tool approval mapping.
 *
 * @see HAP-1092 - Build adapter layer for NormalizedMessage -> AI Elements types
 */

import { describe, it, expect } from "vite-plus/test";
import {
  adaptMessages,
  adaptToolState,
  adaptToolApproval,
  describeAgentEvent,
  type AgentEventPart,
  type AIElementsMessage,
  type TextPart,
  type ToolInvocationPart,
} from "@/lib/ai-elements-adapter";
import type {
  NormalizedMessage,
  UserTextMessage,
  AgentTextMessage,
  ToolCallMessage,
  ToolResultMessage,
  AgentEventMessage,
  SystemMessage,
  ToolCall,
  ToolPermission,
} from "@/services/messages/types";

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function makeUserText(overrides: Partial<UserTextMessage> = {}): UserTextMessage {
  return {
    kind: "user-text",
    id: "user-1",
    localId: null,
    createdAt: 1000,
    text: "Hello, world",
    ...overrides,
  };
}

function makeAgentText(overrides: Partial<AgentTextMessage> = {}): AgentTextMessage {
  return {
    kind: "agent-text",
    id: "agent-1",
    localId: null,
    createdAt: 2000,
    text: "I can help with that.",
    ...overrides,
  };
}

function makeToolCall(
  toolOverrides: Partial<ToolCall> = {},
  msgOverrides: Partial<ToolCallMessage> = {},
): ToolCallMessage {
  return {
    kind: "tool-call",
    id: "tool-call-1",
    localId: null,
    createdAt: 3000,
    tool: {
      name: "read_file",
      state: "running",
      input: { path: "/src/index.ts" },
      createdAt: 3000,
      startedAt: 3000,
      completedAt: null,
      description: null,
      ...toolOverrides,
    },
    ...msgOverrides,
  };
}

function makeToolResult(overrides: Partial<ToolResultMessage> = {}): ToolResultMessage {
  return {
    kind: "tool-result",
    id: "tool-result-1",
    localId: null,
    createdAt: 4000,
    toolUseId: "tool-call-1",
    content: "file contents here",
    isError: false,
    ...overrides,
  };
}

function makeAgentEvent(overrides: Partial<AgentEventMessage> = {}): AgentEventMessage {
  return {
    kind: "agent-event",
    id: "event-1",
    localId: null,
    createdAt: 5000,
    event: { type: "message", message: "Processing..." },
    ...overrides,
  };
}

function makeSystemMessage(overrides: Partial<SystemMessage> = {}): SystemMessage {
  return {
    kind: "system",
    id: "system-1",
    localId: null,
    createdAt: 6000,
    text: "Session started",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// adaptMessages Tests
// ---------------------------------------------------------------------------

describe("adaptMessages", () => {
  it("returns an empty array for empty input", () => {
    expect(adaptMessages([])).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const messages: NormalizedMessage[] = [makeUserText()];
    const original = [...messages];
    adaptMessages(messages);
    expect(messages).toEqual(original);
  });

  describe("user-text messages", () => {
    it("maps user-text to role: user with TextPart", () => {
      const result = adaptMessages([makeUserText()]);
      expect(result).toHaveLength(1);
      const msg = result[0] as AIElementsMessage;
      expect(msg.role).toBe("user");
      expect(msg.id).toBe("user-1");
      expect(msg.createdAt).toBe(1000);
      expect(msg.parts).toHaveLength(1);
      const part = msg.parts[0] as TextPart;
      expect(part.type).toBe("text");
      expect(part.text).toBe("Hello, world");
    });

    it("uses displayText when available", () => {
      const result = adaptMessages([makeUserText({ displayText: "Display text" })]);
      const part = result[0]!.parts[0] as TextPart;
      expect(part.text).toBe("Display text");
    });

    it("falls back to text when displayText is undefined", () => {
      const result = adaptMessages([makeUserText({ displayText: undefined })]);
      const part = result[0]!.parts[0] as TextPart;
      expect(part.text).toBe("Hello, world");
    });
  });

  describe("agent-text messages", () => {
    it("maps agent-text to role: assistant with TextPart", () => {
      const result = adaptMessages([makeAgentText()]);
      expect(result).toHaveLength(1);
      const msg = result[0] as AIElementsMessage;
      expect(msg.role).toBe("assistant");
      expect(msg.id).toBe("agent-1");
      expect(msg.createdAt).toBe(2000);
      expect(msg.parts).toHaveLength(1);
      const part = msg.parts[0] as TextPart;
      expect(part.type).toBe("text");
      expect(part.text).toBe("I can help with that.");
    });
  });

  describe("tool-call messages", () => {
    it("maps running tool-call to ToolInvocationPart with state: call", () => {
      const result = adaptMessages([makeToolCall({ state: "running" })]);
      expect(result).toHaveLength(1);
      const msg = result[0] as AIElementsMessage;
      expect(msg.role).toBe("assistant");
      expect(msg.id).toBe("tool-call-1");
      expect(msg.parts).toHaveLength(1);
      const part = msg.parts[0] as ToolInvocationPart;
      expect(part.type).toBe("tool-invocation");
      expect(part.toolInvocationId).toBe("tool-call-1");
      expect(part.toolName).toBe("read_file");
      expect(part.args).toEqual({ path: "/src/index.ts" });
      expect(part.state).toBe("call");
      expect(part.result).toBeUndefined();
    });

    it("maps completed tool-call to ToolInvocationPart with state: result", () => {
      const result = adaptMessages([
        makeToolCall({
          state: "completed",
          completedAt: 3500,
          result: "file contents",
        }),
      ]);
      const part = result[0]!.parts[0] as ToolInvocationPart;
      expect(part.state).toBe("result");
      expect(part.result).toBe("file contents");
    });

    it("maps error tool-call to ToolInvocationPart with state: result", () => {
      const result = adaptMessages([
        makeToolCall({
          state: "error",
          result: "Permission denied",
        }),
      ]);
      const part = result[0]!.parts[0] as ToolInvocationPart;
      expect(part.state).toBe("result");
      expect(part.result).toBe("Permission denied");
    });

    it("preserves tool name and args", () => {
      const result = adaptMessages([
        makeToolCall({
          name: "write_file",
          input: { path: "/out.txt", content: "hello" },
        }),
      ]);
      const part = result[0]!.parts[0] as ToolInvocationPart;
      expect(part.toolName).toBe("write_file");
      expect(part.args).toEqual({ path: "/out.txt", content: "hello" });
    });
  });

  describe("tool-result messages", () => {
    it("maps tool-result to ToolInvocationPart with state: result", () => {
      const result = adaptMessages([makeToolResult()]);
      expect(result).toHaveLength(1);
      const msg = result[0] as AIElementsMessage;
      expect(msg.role).toBe("assistant");
      expect(msg.id).toBe("tool-result-1");
      expect(msg.parts).toHaveLength(1);
      const part = msg.parts[0] as ToolInvocationPart;
      expect(part.type).toBe("tool-invocation");
      expect(part.toolInvocationId).toBe("tool-call-1");
      expect(part.toolName).toBe("tool");
      expect(part.args).toBeUndefined();
      expect(part.state).toBe("result");
      expect(part.result).toBe("file contents here");
    });

    it("maps error tool-result with isError flag", () => {
      const result = adaptMessages([
        makeToolResult({ content: "ENOENT: file not found", isError: true }),
      ]);
      const part = result[0]!.parts[0] as ToolInvocationPart;
      expect(part.state).toBe("result");
      expect(part.result).toBe("ENOENT: file not found");
    });
  });

  describe("agent-event messages", () => {
    // The adapter emits a discriminated descriptor (no English literals) so
    // consumers can route the rendering through vue-i18n's `t()` helper.
    // See HAP-1104 — i18n audit for AI Elements consumers.
    it("maps switch event to AgentEventPart with mode", () => {
      const result = adaptMessages([makeAgentEvent({ event: { type: "switch", mode: "plan" } })]);
      const msg = result[0] as AIElementsMessage;
      expect(msg.role).toBe("assistant");
      const part = msg.parts[0] as AgentEventPart;
      expect(part.type).toBe("agent-event");
      expect(part.event).toEqual({ type: "switch", mode: "plan" });
    });

    it("maps message event to AgentEventPart with message text", () => {
      const result = adaptMessages([
        makeAgentEvent({ event: { type: "message", message: "Thinking..." } }),
      ]);
      const part = result[0]!.parts[0] as AgentEventPart;
      expect(part.event).toEqual({ type: "message", message: "Thinking..." });
    });

    it("maps limit-reached event with endsAt", () => {
      const result = adaptMessages([
        makeAgentEvent({ event: { type: "limit-reached", endsAt: 99999 } }),
      ]);
      const part = result[0]!.parts[0] as AgentEventPart;
      expect(part.event).toEqual({ type: "limit-reached", endsAt: 99999 });
    });

    it("maps limit-reached event without endsAt", () => {
      // Runtime payloads occasionally arrive without endsAt; the discriminated
      // type requires it, so cast through `unknown` to exercise the fallback.
      const result = adaptMessages([
        makeAgentEvent({
          event: { type: "limit-reached" } as unknown as AgentEventMessage["event"],
        }),
      ]);
      const part = result[0]!.parts[0] as AgentEventPart;
      expect(part.event).toEqual({ type: "limit-reached" });
    });

    it("maps unknown event type to AgentEventPart with name", () => {
      const result = adaptMessages([makeAgentEvent({ event: { type: "custom-event" } })]);
      const part = result[0]!.parts[0] as AgentEventPart;
      expect(part.event).toEqual({ type: "unknown", name: "custom-event" });
    });
  });

  describe("describeAgentEvent helper", () => {
    it("describes switch events", () => {
      expect(describeAgentEvent({ type: "switch", mode: "plan" })).toEqual({
        type: "switch",
        mode: "plan",
      });
    });

    it("describes message events", () => {
      expect(describeAgentEvent({ type: "message", message: "Hello" })).toEqual({
        type: "message",
        message: "Hello",
      });
    });

    it("describes limit-reached events with finite endsAt", () => {
      expect(describeAgentEvent({ type: "limit-reached", endsAt: 1234 })).toEqual({
        type: "limit-reached",
        endsAt: 1234,
      });
    });

    it("describes limit-reached events without endsAt", () => {
      // Runtime payloads occasionally omit endsAt; cast to bypass the
      // strict type which requires it.
      expect(
        describeAgentEvent({ type: "limit-reached" } as unknown as AgentEventMessage["event"]),
      ).toEqual({
        type: "limit-reached",
      });
    });

    it("describes unknown events", () => {
      expect(describeAgentEvent({ type: "custom-event" })).toEqual({
        type: "unknown",
        name: "custom-event",
      });
    });
  });

  describe("system messages", () => {
    it("maps system to role: system with TextPart", () => {
      const result = adaptMessages([makeSystemMessage()]);
      expect(result).toHaveLength(1);
      const msg = result[0] as AIElementsMessage;
      expect(msg.role).toBe("system");
      expect(msg.id).toBe("system-1");
      expect(msg.createdAt).toBe(6000);
      expect(msg.parts).toHaveLength(1);
      const part = msg.parts[0] as TextPart;
      expect(part.type).toBe("text");
      expect(part.text).toBe("Session started");
    });
  });

  describe("mixed message arrays", () => {
    it("maps a conversation with all 6 message kinds", () => {
      const messages: NormalizedMessage[] = [
        makeUserText(),
        makeAgentText(),
        makeToolCall(),
        makeToolResult(),
        makeAgentEvent(),
        makeSystemMessage(),
      ];
      const result = adaptMessages(messages);
      expect(result).toHaveLength(6);
      expect(result[0]!.role).toBe("user");
      expect(result[1]!.role).toBe("assistant");
      expect(result[2]!.role).toBe("assistant");
      expect(result[3]!.role).toBe("assistant");
      expect(result[4]!.role).toBe("assistant");
      expect(result[5]!.role).toBe("system");
    });

    it("preserves message order", () => {
      const messages: NormalizedMessage[] = [
        makeUserText({ id: "a", createdAt: 1 }),
        makeAgentText({ id: "b", createdAt: 2 }),
        makeUserText({ id: "c", createdAt: 3 }),
      ];
      const result = adaptMessages(messages);
      expect(result.map((m) => m.id)).toEqual(["a", "b", "c"]);
      expect(result.map((m) => m.createdAt)).toEqual([1, 2, 3]);
    });
  });
});

// ---------------------------------------------------------------------------
// adaptToolState Tests
// ---------------------------------------------------------------------------

describe("adaptToolState", () => {
  describe("running state", () => {
    it("returns input-available when no permission", () => {
      expect(adaptToolState("running")).toBe("input-available");
    });

    it("returns input-available when permission is undefined", () => {
      expect(adaptToolState("running", undefined)).toBe("input-available");
    });

    it("returns approval-requested when permission is pending", () => {
      const perm: ToolPermission = { status: "pending" };
      expect(adaptToolState("running", perm)).toBe("approval-requested");
    });

    it("returns input-available when permission is approved", () => {
      const perm: ToolPermission = { status: "approved" };
      expect(adaptToolState("running", perm)).toBe("input-available");
    });

    it("returns input-available when permission is denied", () => {
      const perm: ToolPermission = { status: "denied" };
      expect(adaptToolState("running", perm)).toBe("input-available");
    });

    it("returns input-available when permission has no status", () => {
      const perm: ToolPermission = {};
      expect(adaptToolState("running", perm)).toBe("input-available");
    });
  });

  describe("completed state", () => {
    it("returns output-available without permission", () => {
      expect(adaptToolState("completed")).toBe("output-available");
    });

    it("returns output-available with permission", () => {
      const perm: ToolPermission = { status: "approved" };
      expect(adaptToolState("completed", perm)).toBe("output-available");
    });
  });

  describe("error state", () => {
    it("returns output-available without permission", () => {
      expect(adaptToolState("error")).toBe("output-available");
    });

    it("returns output-available with permission", () => {
      const perm: ToolPermission = { status: "denied" };
      expect(adaptToolState("error", perm)).toBe("output-available");
    });
  });
});

// ---------------------------------------------------------------------------
// adaptToolApproval Tests
// ---------------------------------------------------------------------------

describe("adaptToolApproval", () => {
  it("returns undefined when permission is undefined", () => {
    expect(adaptToolApproval()).toBeUndefined();
    expect(adaptToolApproval(undefined)).toBeUndefined();
  });

  describe("pending status", () => {
    it("returns approved: undefined for pending", () => {
      const perm: ToolPermission = { id: "perm-1", status: "pending" };
      const result = adaptToolApproval(perm);
      expect(result).toBeDefined();
      expect(result!.id).toBe("perm-1");
      expect(result!.approved).toBeUndefined();
    });

    it("includes reason if provided", () => {
      const perm: ToolPermission = { id: "perm-1", status: "pending", reason: "Needs review" };
      const result = adaptToolApproval(perm);
      expect(result!.reason).toBe("Needs review");
    });
  });

  describe("approved status", () => {
    it("returns approved: true", () => {
      const perm: ToolPermission = { id: "perm-2", status: "approved" };
      const result = adaptToolApproval(perm);
      expect(result).toBeDefined();
      expect(result!.id).toBe("perm-2");
      expect(result!.approved).toBe(true);
    });

    it("includes reason if provided", () => {
      const perm: ToolPermission = { id: "perm-2", status: "approved", reason: "Trusted tool" };
      const result = adaptToolApproval(perm);
      expect(result!.reason).toBe("Trusted tool");
    });
  });

  describe("denied status", () => {
    it("returns approved: false", () => {
      const perm: ToolPermission = { id: "perm-3", status: "denied" };
      const result = adaptToolApproval(perm);
      expect(result).toBeDefined();
      expect(result!.id).toBe("perm-3");
      expect(result!.approved).toBe(false);
    });

    it("includes reason if provided", () => {
      const perm: ToolPermission = { id: "perm-3", status: "denied", reason: "Not allowed" };
      const result = adaptToolApproval(perm);
      expect(result!.reason).toBe("Not allowed");
    });
  });

  describe("canceled status", () => {
    it("returns approved: false with reason", () => {
      const perm: ToolPermission = { id: "perm-4", status: "canceled" };
      const result = adaptToolApproval(perm);
      expect(result).toBeDefined();
      expect(result!.id).toBe("perm-4");
      expect(result!.approved).toBe(false);
      expect(result!.reason).toBe("canceled");
    });

    it("preserves explicit reason over default", () => {
      const perm: ToolPermission = { id: "perm-4", status: "canceled", reason: "User canceled" };
      const result = adaptToolApproval(perm);
      expect(result!.reason).toBe("User canceled");
    });
  });

  describe("edge cases", () => {
    it("handles permission with no status", () => {
      const perm: ToolPermission = { id: "perm-5" };
      const result = adaptToolApproval(perm);
      expect(result).toBeDefined();
      expect(result!.id).toBe("perm-5");
      expect(result!.approved).toBeUndefined();
    });

    it("handles permission with no id", () => {
      const perm: ToolPermission = { status: "approved" };
      const result = adaptToolApproval(perm);
      expect(result).toBeDefined();
      expect(result!.id).toBe("");
      expect(result!.approved).toBe(true);
    });

    it("handles permission with empty object", () => {
      const perm: ToolPermission = {};
      const result = adaptToolApproval(perm);
      expect(result).toBeDefined();
      expect(result!.id).toBe("");
      expect(result!.approved).toBeUndefined();
    });
  });
});
