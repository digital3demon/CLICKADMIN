import { describe, expect, it, vi } from "vitest";
import { planRecentFolderSync, RECENT_CUSTOM_FOLDERS_PER_JOB } from "./mail-sync-rotation";

vi.mock("server-only", () => ({}));

describe("planRecentFolderSync", () => {
  const folders = [
    { path: "INBOX", delimiter: "/", flags: new Set<string>() },
    { path: "Sent", delimiter: "/", flags: new Set<string>() },
    ...Array.from({ length: 25 }, (_, index) => ({
      path: `_Папка${index + 1}`,
      delimiter: "/",
      flags: new Set<string>(),
    })),
  ];

  it("always includes INBOX and Sent and batches custom folders", () => {
    const plan = planRecentFolderSync(folders, 0);
    expect(plan.messageSyncPaths.has("INBOX")).toBe(true);
    expect(plan.messageSyncPaths.has("Sent")).toBe(true);
    expect(plan.customFoldersThisRun).toBe(RECENT_CUSTOM_FOLDERS_PER_JOB);
    expect(plan.hasMoreCustomFolders).toBe(true);
    expect(plan.nextCustomOffset).toBe(RECENT_CUSTOM_FOLDERS_PER_JOB);
  });

  it("finishes a full custom rotation without chaining", () => {
    const plan = planRecentFolderSync(folders, 24);
    expect(plan.customFoldersThisRun).toBe(1);
    expect(plan.nextCustomOffset).toBe(0);
    expect(plan.hasMoreCustomFolders).toBe(false);
  });
});
