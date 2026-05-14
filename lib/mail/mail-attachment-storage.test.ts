import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readMailAttachmentBytes,
  sha256Hex,
  writeMailAttachmentBytes,
} from "./mail-attachment-storage";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/s3-client", () => ({
  deleteS3Object: vi.fn(),
  getS3ObjectBytes: vi.fn(),
  isS3StorageEnabled: () => false,
  putS3ObjectBytes: vi.fn(),
}));

let root = "";

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "mail-attachments-"));
  process.env.MAIL_ATTACHMENT_STORAGE_DIR = root;
});

afterEach(async () => {
  delete process.env.MAIL_ATTACHMENT_STORAGE_DIR;
  await fs.rm(root, { recursive: true, force: true });
});

describe("mail attachment storage", () => {
  it("writes attachment bytes outside DB and reads them back", async () => {
    const body = Buffer.from("hello attachment", "utf8");
    const stored = await writeMailAttachmentBytes({
      tenantId: "tenant_1",
      emailId: "email_1",
      attachmentId: "attachment_1",
      body,
      contentType: "text/plain",
    });

    expect(stored.checksumSha256).toBe(sha256Hex(body));
    expect(stored.diskRelPath).toContain("tenant_1");
    await expect(readMailAttachmentBytes({ data: null, diskRelPath: stored.diskRelPath })).resolves.toEqual(body);
  });
});
