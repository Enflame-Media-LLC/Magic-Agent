import type { AgentEvent, MessageMeta, NormalizedMessage, ToolCall, ToolPermission } from "./types";

type NormalizeParams = {
  id: string;
  localId: string | null;
  createdAt: number;
  decrypted: unknown;
};

type RawRecord = {
  role?: "user" | "agent";
  content?: {
    type?: string;
    data?: Record<string, unknown>;
  };
  meta?: MessageMeta;
};

type AssistantContent = {
  type?: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
};

type ToolResultContent = {
  type?: string;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
  permissions?: ToolPermission;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function safeParseJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toText(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  return null;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function extractToolDescription(input: unknown): string | null {
  const record = asRecord(input);
  const description = record?.description;
  return typeof description === "string" ? description : null;
}

function buildToolCall(
  name: string,
  input: unknown,
  createdAt: number,
  state: ToolCall["state"] = "running",
): ToolCall {
  return {
    name,
    state,
    input,
    createdAt,
    startedAt: createdAt,
    completedAt: null,
    description: extractToolDescription(input),
  };
}

function buildUserText(
  params: NormalizeParams,
  text: string,
  meta?: MessageMeta,
  displayText?: string,
): NormalizedMessage {
  return {
    kind: "user-text",
    id: params.id,
    sourceMessageId: params.id,
    localId: params.localId,
    createdAt: params.createdAt,
    text,
    displayText,
    meta,
  };
}

function buildAgentText(
  params: NormalizeParams,
  text: string,
  meta?: MessageMeta,
): NormalizedMessage {
  return {
    kind: "agent-text",
    id: params.id,
    sourceMessageId: params.id,
    localId: params.localId,
    createdAt: params.createdAt,
    text,
    meta,
  };
}

function buildToolResult(
  params: NormalizeParams,
  toolUseId: string,
  content: unknown,
  isError: boolean,
  permission?: ToolPermission,
  meta?: MessageMeta,
): NormalizedMessage {
  return {
    kind: "tool-result",
    id: toolUseId,
    sourceMessageId: params.id,
    localId: params.localId,
    createdAt: params.createdAt,
    toolUseId,
    content,
    isError,
    permission,
    meta,
  };
}

function buildEventMessage(
  params: NormalizeParams,
  event: AgentEvent,
  meta?: MessageMeta,
): NormalizedMessage {
  return {
    kind: "agent-event",
    id: params.id,
    sourceMessageId: params.id,
    localId: params.localId,
    createdAt: params.createdAt,
    event,
    meta,
  };
}

function normalizeAssistantOutput(
  params: NormalizeParams,
  data: Record<string, unknown>,
  meta?: MessageMeta,
): NormalizedMessage[] {
  const outputType = data.type;
  const messages: NormalizedMessage[] = [];

  if (outputType === "assistant") {
    const message = asRecord(data.message);
    const content = toArray(message?.content);
    for (const item of content) {
      const contentRecord = asRecord(item) as AssistantContent | null;
      if (!contentRecord) continue;

      if (contentRecord.type === "text") {
        const text = toText(contentRecord.text);
        if (text) {
          messages.push(buildAgentText(params, text, meta));
        }
      }

      if (contentRecord.type === "tool_use") {
        const toolName = toText(contentRecord.name) ?? "tool";
        const toolCall = buildToolCall(toolName, contentRecord.input, params.createdAt);
        toolCall.state = "running";
        messages.push({
          kind: "tool-call",
          id: toText(contentRecord.id) ?? params.id,
          sourceMessageId: params.id,
          localId: params.localId,
          createdAt: params.createdAt,
          tool: toolCall,
          meta,
        });
      }
    }
    return messages;
  }

  if (outputType === "user") {
    const message = asRecord(data.message);
    const content = message?.content;
    if (typeof content === "string") {
      return [buildUserText(params, content, meta, meta?.displayText)];
    }

    const parts = toArray(content);
    for (const item of parts) {
      const contentRecord = asRecord(item) as ToolResultContent | null;
      if (!contentRecord || contentRecord.type !== "tool_result") {
        continue;
      }
      const toolUseId = toText(contentRecord.tool_use_id);
      if (!toolUseId) continue;
      const resultContent = contentRecord.content ?? data.toolUseResult;
      messages.push(
        buildToolResult(
          params,
          toolUseId,
          resultContent,
          Boolean(contentRecord.is_error),
          contentRecord.permissions,
          meta,
        ),
      );
    }
    return messages;
  }

  if (outputType === "system") {
    const text = toText(data.message) ?? toText(data.text);
    if (text) {
      return [
        {
          kind: "system",
          id: params.id,
          sourceMessageId: params.id,
          localId: params.localId,
          createdAt: params.createdAt,
          text,
          meta,
        },
      ];
    }
  }

  return messages;
}

function normalizeCodexOutput(
  params: NormalizeParams,
  data: Record<string, unknown>,
  meta?: MessageMeta,
): NormalizedMessage[] {
  const outputType = data.type;

  if (outputType === "message" || outputType === "reasoning") {
    const text = toText(data.message);
    if (text) {
      return [buildAgentText(params, text, meta)];
    }
  }

  if (outputType === "tool-call") {
    const toolName = toText(data.name) ?? "tool";
    const toolCall = buildToolCall(toolName, data.input, params.createdAt);
    return [
      {
        kind: "tool-call",
        id: toText(data.callId) ?? params.id,
        sourceMessageId: params.id,
        localId: params.localId,
        createdAt: params.createdAt,
        tool: toolCall,
        meta,
      },
    ];
  }

  if (outputType === "tool-call-result") {
    const toolUseId = toText(data.callId);
    if (toolUseId) {
      return [buildToolResult(params, toolUseId, data.output, false, undefined, meta)];
    }
  }

  return [];
}

export function normalizeDecryptedMessage(params: NormalizeParams): NormalizedMessage[] {
  const raw = safeParseJson(params.decrypted);
  if (typeof raw === "string") {
    return [buildAgentText(params, raw)];
  }

  const record = asRecord(raw) as RawRecord | null;
  if (!record) {
    return [];
  }

  if (record.role === "user") {
    const contentRecord = asRecord(record.content) ?? {};
    const text = toText(contentRecord.text) ?? toText(contentRecord.content);
    const displayText = record.meta?.displayText;
    // Attachment-only messages (MAG-1112) have empty text but carry a
    // displayText summary; still render those.
    if (text || displayText) {
      return [buildUserText(params, text ?? "", record.meta, displayText)];
    }
    return [];
  }

  if (record.role === "agent") {
    const content = asRecord(record.content);
    if (!content) {
      return [];
    }

    if (content.type === "output") {
      const data = asRecord(content.data);
      if (!data) {
        return [];
      }
      return normalizeAssistantOutput(params, data, record.meta);
    }

    if (content.type === "event") {
      const eventData = asRecord(content.data) as AgentEvent | null;
      if (eventData) {
        return [buildEventMessage(params, eventData, record.meta)];
      }
    }

    if (content.type === "codex") {
      const data = asRecord(content.data);
      if (!data) {
        return [];
      }
      return normalizeCodexOutput(params, data, record.meta);
    }
  }

  return [];
}
