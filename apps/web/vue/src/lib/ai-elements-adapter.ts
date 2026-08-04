/**
 * AI Elements Adapter
 *
 * Transforms NormalizedMessage[] into AIElementsMessage[] for use with
 * AI Elements Vue components (Message, ToolHeader, Confirmation).
 *
 * This is the ONLY file that imports both NormalizedMessage and AI Elements types.
 * AI Elements types are defined locally to avoid tight coupling to @ai-sdk/vue.
 *
 * All functions are pure with no side effects or Vue reactivity.
 *
 * @see HAP-1092 - Build adapter layer for NormalizedMessage -> AI Elements types
 */

import type {
  NormalizedMessage,
  ToolCall,
  ToolPermission,
  AgentEvent,
} from "@/services/messages/types";

// ---------------------------------------------------------------------------
// AI Elements Types (locally defined, compatible with @ai-sdk/vue)
// ---------------------------------------------------------------------------

export type AIElementsRole = "user" | "assistant" | "system";

export type TextPart = {
  type: "text";
  text: string;
};

export type ToolInvocationPart = {
  type: "tool-invocation";
  toolInvocationId: string;
  toolName: string;
  args: unknown;
  state: "call" | "result" | "partial-call";
  result?: unknown;
};

export type ReasoningPart = {
  type: "reasoning";
  reasoning: string;
};

export type SourcePart = {
  type: "source";
  source: {
    sourceType: string;
    id: string;
    url?: string;
    title?: string;
  };
};

/**
 * Discriminated descriptor for an AgentEvent.
 *
 * The adapter emits this structured form instead of a pre-formatted English
 * string so that consumers (Vue components) can route the description through
 * `vue-i18n`'s `t()` helper. Each variant maps 1:1 to a translation key in the
 * `message.*` namespace (see HAP-1104).
 */
export type AgentEventDescriptor =
  | { type: "switch"; mode: string }
  | { type: "message"; message: string }
  | { type: "limit-reached"; endsAt?: number }
  | { type: "unknown"; name: string };

export type AgentEventPart = {
  type: "agent-event";
  event: AgentEventDescriptor;
};

export type AIElementsPart =
  | TextPart
  | ToolInvocationPart
  | ReasoningPart
  | SourcePart
  | AgentEventPart;

export type AIElementsMessage = {
  id: string;
  role: AIElementsRole;
  parts: AIElementsPart[];
  createdAt: number;
};

export type AIToolState =
  | "input-streaming"
  | "input-available"
  | "approval-requested"
  | "output-streaming"
  | "output-available";

export type AIToolApproval =
  | {
      id: string;
      approved?: boolean;
      reason?: string;
    }
  | undefined;

// ---------------------------------------------------------------------------
// Formatting Helpers
// ---------------------------------------------------------------------------

/**
 * Describe an AgentEvent as a discriminated descriptor.
 *
 * This pure helper replaces the previous `formatAgentEvent` (which returned a
 * pre-formatted English string). Consumers in the Vue layer call this and then
 * resolve the descriptor through `vue-i18n` so the rendered text honors the
 * user's locale (HAP-1104).
 */
export function describeAgentEvent(event: AgentEvent): AgentEventDescriptor {
  switch (event.type) {
    case "switch":
      return { type: "switch", mode: String(event.mode) };
    case "message":
      return { type: "message", message: String(event.message) };
    case "limit-reached": {
      const endsAt = Number(event.endsAt);
      return Number.isFinite(endsAt)
        ? { type: "limit-reached", endsAt }
        : { type: "limit-reached" };
    }
    default:
      return { type: "unknown", name: String(event.type) };
  }
}

/**
 * Map a ToolCall state to a ToolInvocationPart state.
 *
 * Two distinct mapping schemes exist:
 * 1. Parts-based mapping (this function): for the Message component
 *    - running -> 'call' (tool is being invoked)
 *    - completed -> 'result' (tool returned output)
 *    - error -> 'result' (tool returned an error)
 * 2. Tool component state mapping: see adaptToolState()
 */
function mapToolCallState(state: ToolCall["state"]): ToolInvocationPart["state"] {
  switch (state) {
    case "running":
      return "call";
    case "completed":
    case "error":
      return "result";
  }
}

// ---------------------------------------------------------------------------
// Single Message Adapters
// ---------------------------------------------------------------------------

function adaptSingleMessage(msg: NormalizedMessage): AIElementsMessage {
  switch (msg.kind) {
    case "user-text":
      return {
        id: msg.id,
        role: "user",
        parts: [{ type: "text", text: msg.displayText ?? msg.text }],
        createdAt: msg.createdAt,
      };

    case "agent-text":
      return {
        id: msg.id,
        role: "assistant",
        parts: [{ type: "text", text: msg.text }],
        createdAt: msg.createdAt,
      };

    case "tool-call": {
      const part: ToolInvocationPart = {
        type: "tool-invocation",
        toolInvocationId: msg.id,
        toolName: msg.tool.name,
        args: msg.tool.input,
        state: mapToolCallState(msg.tool.state),
      };
      if (msg.tool.state === "completed" || msg.tool.state === "error") {
        part.result = msg.tool.result;
      }
      return {
        id: msg.id,
        role: "assistant",
        parts: [part],
        createdAt: msg.createdAt,
      };
    }

    case "tool-result":
      return {
        id: msg.id,
        role: "assistant",
        parts: [
          {
            type: "tool-invocation",
            toolInvocationId: msg.toolUseId,
            toolName: "tool",
            args: undefined,
            state: "result",
            result: msg.content,
          },
        ],
        createdAt: msg.createdAt,
      };

    case "agent-event":
      return {
        id: msg.id,
        role: "assistant",
        parts: [{ type: "agent-event", event: describeAgentEvent(msg.event) }],
        createdAt: msg.createdAt,
      };

    case "system":
      return {
        id: msg.id,
        role: "system",
        parts: [{ type: "text", text: msg.text }],
        createdAt: msg.createdAt,
      };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Transform an array of NormalizedMessages into AIElementsMessages.
 *
 * Does NOT mutate the input array. Returns a new array of adapted messages.
 */
export function adaptMessages(messages: NormalizedMessage[]): AIElementsMessage[] {
  return messages.map(adaptSingleMessage);
}

/**
 * Map a ToolCall state (+ optional ToolPermission) to an AIToolState
 * for the Tool / ToolHeader component.
 *
 * This is a separate mapping scheme from the parts-based mapping:
 * - running + no permission  -> 'input-available'  (tool executing, input known)
 * - running + pending perm   -> 'approval-requested'
 * - completed                -> 'output-available'
 * - error                    -> 'output-available'  (error shown as output)
 */
export function adaptToolState(state: ToolCall["state"], permission?: ToolPermission): AIToolState {
  if (state === "running") {
    if (permission?.status === "pending") {
      return "approval-requested";
    }
    return "input-available";
  }
  // completed or error
  return "output-available";
}

/**
 * Map a ToolPermission to an AIToolApproval for the Confirmation component.
 *
 * - undefined permission       -> undefined
 * - pending                    -> { id, approved: undefined }
 * - approved                   -> { id, approved: true, reason }
 * - denied                     -> { id, approved: false, reason }
 * - canceled                   -> { id, approved: false, reason: 'canceled' }
 */
export function adaptToolApproval(permission?: ToolPermission): AIToolApproval {
  if (!permission) {
    return undefined;
  }

  const id = permission.id ?? "";

  switch (permission.status) {
    case "pending":
      return { id, approved: undefined, reason: permission.reason };
    case "approved":
      return { id, approved: true, reason: permission.reason };
    case "denied":
      return { id, approved: false, reason: permission.reason };
    case "canceled":
      return { id, approved: false, reason: permission.reason ?? "canceled" };
    default:
      return { id, approved: undefined, reason: permission.reason };
  }
}
