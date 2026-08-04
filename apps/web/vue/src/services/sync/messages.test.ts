/**
 * Unit tests for sendSessionMessage
 *
 * Covers text-only sends, attachment uploads (MAG-1112), and failure paths
 * (empty message, upload failure, encryption failure, disconnected socket).
 */

import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import { sendSessionMessage } from "./messages";
import { uploadSessionAttachments } from "./attachments";
import { wsService } from "./WebSocketService";
import { encryptSessionMessage } from "@/services/encryption/sessionDecryption";
import type { Session } from "@/stores/sessions";

vi.mock("./WebSocketService", () => ({
  wsService: {
    send: vi.fn(),
  },
}));

vi.mock("./attachments", () => ({
  uploadSessionAttachments: vi.fn(),
}));

vi.mock("@/services/encryption/sessionDecryption", () => ({
  encryptSessionMessage: vi.fn(),
}));

const session = { id: "session-1" } as Session;

const mockSend = vi.mocked(wsService.send);
const mockEncrypt = vi.mocked(encryptSessionMessage);
const mockUpload = vi.mocked(uploadSessionAttachments);

describe("sendSessionMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockReturnValue(true);
    mockEncrypt.mockResolvedValue("encrypted-payload");
  });

  it("rejects an empty message with no attachments", async () => {
    const result = await sendSessionMessage(session, "   ");
    expect(result).toEqual({ ok: false, error: "Message is empty" });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends a text-only message without touching the upload pipeline", async () => {
    const result = await sendSessionMessage(session, "hello", "default");

    expect(result).toEqual({ ok: true });
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockEncrypt).toHaveBeenCalledWith(
      session,
      expect.objectContaining({
        role: "user",
        content: { type: "text", text: "hello" },
      }),
    );
    const payload = mockEncrypt.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("attachments");
    expect(mockSend).toHaveBeenCalledWith(
      "message",
      expect.objectContaining({ sid: "session-1", message: "encrypted-payload" }),
    );
  });

  it("uploads attachments and embeds blob references in the payload", async () => {
    const attachments = [
      { blobId: "blob-1", filename: "a.png", mimeType: "image/png", size: 10 },
    ];
    mockUpload.mockResolvedValue({ ok: true, attachments });

    const files = [{ url: "data:image/png;base64,AAAA", filename: "a.png" }];
    const result = await sendSessionMessage(session, "look", "default", files);

    expect(result).toEqual({ ok: true });
    expect(mockUpload).toHaveBeenCalledWith(session, files);
    expect(mockEncrypt).toHaveBeenCalledWith(
      session,
      expect.objectContaining({
        content: { type: "text", text: "look" },
        attachments,
        meta: expect.objectContaining({
          displayText: "look\n[Attachment: a.png]",
        }),
      }),
    );
  });

  it("allows attachment-only messages with empty text", async () => {
    const attachments = [
      { blobId: "blob-1", filename: "a.png", mimeType: "image/png", size: 10 },
    ];
    mockUpload.mockResolvedValue({ ok: true, attachments });

    const result = await sendSessionMessage(session, "", "default", [
      { url: "data:image/png;base64,AAAA" },
    ]);

    expect(result).toEqual({ ok: true });
    expect(mockEncrypt).toHaveBeenCalledWith(
      session,
      expect.objectContaining({
        content: { type: "text", text: "" },
        attachments,
        meta: expect.objectContaining({
          displayText: "[Attachment: a.png]",
        }),
      }),
    );
  });

  it("aborts the send when an attachment upload fails", async () => {
    mockUpload.mockResolvedValue({ ok: false, error: "Upload failed" });

    const result = await sendSessionMessage(session, "look", "default", [
      { url: "data:image/png;base64,AAAA" },
    ]);

    expect(result).toEqual({ ok: false, error: "Upload failed" });
    expect(mockEncrypt).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("fails when encryption returns null", async () => {
    mockEncrypt.mockResolvedValue(null);

    const result = await sendSessionMessage(session, "hello");

    expect(result).toEqual({ ok: false, error: "Failed to encrypt message" });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("fails when the WebSocket is disconnected", async () => {
    mockSend.mockReturnValue(false);

    const result = await sendSessionMessage(session, "hello");

    expect(result).toEqual({ ok: false, error: "WebSocket not connected" });
  });
});
