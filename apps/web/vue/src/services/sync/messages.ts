import type { UserMessageAttachment } from "@magic-agent/protocol";
import { wsService } from "./WebSocketService";
import { uploadSessionAttachments, type OutgoingFileAttachment } from "./attachments";
import { encryptSessionMessage } from "@/services/encryption/sessionDecryption";
import type { Session } from "@/stores/sessions";

type UserMessagePayload = {
  role: "user";
  content: {
    type: "text";
    text: string;
  };
  /** Encrypted-blob references for attached files (MAG-1112) */
  attachments?: UserMessageAttachment[];
  meta?: {
    sentFrom?: string;
    permissionMode?: string;
    displayText?: string;
  };
};

export async function sendSessionMessage(
  session: Session,
  text: string,
  permissionMode: string = "default",
  files?: OutgoingFileAttachment[],
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = text.trim();
  const hasFiles = !!files && files.length > 0;
  if (!trimmed && !hasFiles) {
    return { ok: false, error: "Message is empty" };
  }

  // Preflight the socket before uploading so a dead connection doesn't leave
  // orphaned encrypted blobs on the server (uploads happen before the send).
  if (hasFiles && !wsService.isConnected) {
    return { ok: false, error: "WebSocket not connected" };
  }

  // Upload attachments before sending so the message never references blobs
  // that failed to upload; any failure aborts the send (no silent drops).
  let attachments: UserMessageAttachment[] | undefined;
  if (hasFiles) {
    const uploaded = await uploadSessionAttachments(session, files);
    if (!uploaded.ok) {
      return { ok: false, error: uploaded.error };
    }
    attachments = uploaded.attachments;
  }

  // Summarize attachments so history renders them (and attachment-only
  // messages don't show as empty bubbles).
  const attachmentSummary = attachments?.length
    ? attachments.map((attachment) => `[Attachment: ${attachment.filename}]`).join("\n")
    : undefined;
  const displayText = attachmentSummary
    ? trimmed
      ? `${trimmed}\n${attachmentSummary}`
      : attachmentSummary
    : undefined;

  const payload: UserMessagePayload = {
    role: "user",
    content: {
      type: "text",
      text: trimmed,
    },
    ...(attachments && attachments.length > 0 ? { attachments } : {}),
    meta: {
      sentFrom: "web",
      permissionMode,
      ...(displayText ? { displayText } : {}),
    },
  };

  const encryptedMessage = await encryptSessionMessage(session, payload);
  if (!encryptedMessage) {
    return { ok: false, error: "Failed to encrypt message" };
  }

  const localId = crypto.randomUUID();
  const sent = wsService.send("message", {
    sid: session.id,
    message: encryptedMessage,
    localId,
    sentFrom: "web",
    permissionMode,
  });

  if (!sent) {
    return { ok: false, error: "WebSocket not connected" };
  }

  return { ok: true };
}
