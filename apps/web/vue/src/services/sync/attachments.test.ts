/**
 * Unit tests for the session attachment upload pipeline (MAG-1112)
 *
 * Verifies data-URL parsing, per-session encryption of attachment bytes,
 * the encrypted upload envelope, and failure paths (auth, size, count,
 * encryption, upload errors).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vite-plus/test";
import { uploadSessionAttachments } from "./attachments";
import { encryptSessionMessage } from "@/services/encryption/sessionDecryption";
import { secureStorage } from "@/services/storage";
import { ATTACHMENT_LIMITS } from "@magic-agent/protocol";
import type { Session } from "@/stores/sessions";

vi.mock("@/services/storage", () => ({
  secureStorage: {
    getCredentials: vi.fn(),
  },
}));

vi.mock("@/services/encryption/sessionDecryption", () => ({
  encryptSessionMessage: vi.fn(),
}));

vi.mock("@/services/apiBase", () => ({
  getApiBaseUrl: () => "https://api.test",
}));

const session = { id: "session-1" } as Session;

const mockGetCredentials = vi.mocked(secureStorage.getCredentials);
const mockEncrypt = vi.mocked(encryptSessionMessage);
const mockFetch = vi.fn();

// "hello world" as a base64 data URL
const helloDataUrl = "data:text/plain;base64,aGVsbG8gd29ybGQ=";

describe("uploadSessionAttachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    mockGetCredentials.mockResolvedValue({ token: "token-1", secret: "secret-1" });
    mockEncrypt.mockResolvedValue("ciphertext-b64");
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, file: { id: "blob-1" } }), {
        status: 200,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty attachments for no files", async () => {
    const result = await uploadSessionAttachments(session, []);
    expect(result).toEqual({ ok: true, attachments: [] });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("encrypts and uploads a data-URL file, returning a blob reference", async () => {
    const result = await uploadSessionAttachments(session, [
      { url: helloDataUrl, mediaType: "text/plain", filename: "notes.txt" },
    ]);

    expect(result).toEqual({
      ok: true,
      attachments: [
        { blobId: "blob-1", filename: "notes.txt", mimeType: "text/plain", size: 11 },
      ],
    });

    // Attachment bytes go through the session E2E encryption path
    expect(mockEncrypt).toHaveBeenCalledWith(session, {
      v: 1,
      filename: "notes.txt",
      mimeType: "text/plain",
      data: "aGVsbG8gd29ybGQ=",
    });

    // Uploaded as an opaque encrypted JSON envelope with auth
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test/v1/uploads");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer token-1");
    const form = init.body as FormData;
    const uploaded = form.get("file") as File;
    expect(form.get("category")).toBe("files");
    expect(uploaded.type).toBe("application/json");
    expect(JSON.parse(await uploaded.text())).toEqual({
      t: "encrypted",
      c: "ciphertext-b64",
    });
  });

  it("derives filename and mime type from the data URL when missing", async () => {
    const result = await uploadSessionAttachments(session, [
      { url: "data:image/png;base64,AAAA" },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.attachments[0]).toMatchObject({
        filename: "attachment.png",
        mimeType: "image/png",
      });
    }
  });

  it("fails when not authenticated", async () => {
    mockGetCredentials.mockResolvedValue(null);
    const result = await uploadSessionAttachments(session, [{ url: helloDataUrl }]);
    expect(result).toEqual({ ok: false, error: "Not authenticated" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fails when there are too many attachments", async () => {
    const files = Array.from({ length: ATTACHMENT_LIMITS.MAX_COUNT + 1 }, () => ({
      url: helloDataUrl,
    }));
    const result = await uploadSessionAttachments(session, files);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Too many attachments");
    }
  });

  it("fails when a file cannot be read", async () => {
    const result = await uploadSessionAttachments(session, [
      { url: undefined, filename: "ghost.bin" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Failed to read attachment "ghost.bin"');
    }
  });

  it("fails when encryption fails", async () => {
    mockEncrypt.mockResolvedValue(null);
    const result = await uploadSessionAttachments(session, [
      { url: helloDataUrl, filename: "notes.txt" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Failed to encrypt attachment "notes.txt"');
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fails when the upload response is not ok", async () => {
    mockFetch.mockResolvedValue(new Response("{}", { status: 400 }));
    const result = await uploadSessionAttachments(session, [
      { url: helloDataUrl, filename: "notes.txt" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Failed to upload attachment "notes.txt"');
    }
  });

  it("fails when the upload succeeds without a file id", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, file: {} }), { status: 200 }),
    );
    const result = await uploadSessionAttachments(session, [
      { url: helloDataUrl, filename: "notes.txt" },
    ]);
    expect(result.ok).toBe(false);
  });

  it("aborts on the first failed upload of a batch", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, file: { id: "blob-1" } }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 500 }));

    const result = await uploadSessionAttachments(session, [
      { url: helloDataUrl, filename: "a.txt" },
      { url: helloDataUrl, filename: "b.txt" },
    ]);

    expect(result.ok).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
