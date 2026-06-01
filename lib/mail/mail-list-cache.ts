import type { MailAccount, MailEmailRow, MailFilter } from "@/components/mail/types";

const PERSISTENT_CACHE_KEY = "dental-crm:mail-bootstrap:v1";
const PERSISTENT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type MailBootstrapSnapshot = {
  accounts: MailAccount[];
  accountId: string;
  folderId: string;
  filter: MailFilter;
  emails: MailEmailRow[];
  nextCursor: string | null;
  savedAt: number;
};

export function readMailBootstrapSnapshot(): MailBootstrapSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PERSISTENT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MailBootstrapSnapshot;
    if (
      !parsed ||
      !Array.isArray(parsed.accounts) ||
      !Array.isArray(parsed.emails) ||
      Date.now() - parsed.savedAt > PERSISTENT_CACHE_TTL_MS
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeMailBootstrapSnapshot(snapshot: Omit<MailBootstrapSnapshot, "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PERSISTENT_CACHE_KEY,
      JSON.stringify({ ...snapshot, savedAt: Date.now() } satisfies MailBootstrapSnapshot),
    );
  } catch {
    /* quota / private mode */
  }
}
