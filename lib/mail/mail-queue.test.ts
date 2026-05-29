import { describe, expect, it, vi } from "vitest";
import { EmailSyncJobStatus, EmailSyncMode } from "@prisma/client";
import { enqueueMailSyncJob } from "./mail-queue";

vi.mock("server-only", () => ({}));

describe("enqueueMailSyncJob", () => {
  it("reuses an active sync job without creating another DB job", async () => {
    const existing = {
      id: "job_1",
      tenantId: "tenant_1",
      accountId: "account_1",
      createdByUserId: "user_1",
      mode: EmailSyncMode.RECENT,
      status: EmailSyncJobStatus.QUEUED,
      jobKey: "key",
    };
    const db = {
      emailSyncJob: {
        findFirst: vi.fn().mockResolvedValue(existing),
        create: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };

    await expect(
      enqueueMailSyncJob(
        db as never,
        "tenant_1",
        "user_1",
        "account_1",
        EmailSyncMode.RECENT,
      ),
    ).resolves.toEqual({ syncJob: existing, enqueued: false });
    expect(db.emailSyncJob.create).not.toHaveBeenCalled();
  });
});
