import { describe, expect, it, vi } from "vitest";
import { EmailSyncJobStatus, EmailSyncMode } from "@prisma/client";
import { enqueueMailSyncJob, forceResetMailSyncJobs } from "./mail-queue";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/mail/mail-service", () => ({
  syncAccountNow: vi.fn(),
}));
vi.mock("@/lib/server/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

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

describe("forceResetMailSyncJobs", () => {
  it("marks active jobs failed for the account", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const db = { emailSyncJob: { updateMany } };
    await expect(
      forceResetMailSyncJobs(db as never, { tenantId: "tenant_1", accountId: "account_1" }),
    ).resolves.toBe(2);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant_1",
          accountId: "account_1",
          status: { in: [EmailSyncJobStatus.QUEUED, EmailSyncJobStatus.RUNNING] },
        }),
      }),
    );
  });
});
