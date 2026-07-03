import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd());
const ALLOWLIST_PREFIXES = ["lib/kaiten-integration/", "lib/kaiten-rest.ts", "lib/kaiten-config.ts"];

const FORBIDDEN_IMPORTS = [
  '@/lib/kaiten-rest"',
  "@/lib/kaiten-rest'",
  'from "@/lib/kaiten-rest"',
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "dist") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function isAllowlisted(rel: string): boolean {
  return ALLOWLIST_PREFIXES.some((p) => rel.startsWith(p) || rel === p);
}

describe("kaiten direct import guard", () => {
  it("новые файлы вне facade не импортируют kaiten-rest напрямую (allowlist для legacy)", () => {
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      if (isAllowlisted(rel)) continue;
      const text = readFileSync(file, "utf8");
      if (FORBIDDEN_IMPORTS.some((needle) => text.includes(needle))) {
        offenders.push(rel);
      }
    }
    // Legacy: постепенная миграция — список известных файлов до полного перевода на facade.
    const legacyAllow = new Set([
      "lib/kaiten-inbound-active-sync.ts",
      "lib/kaiten-order-sync.ts",
      "lib/kaiten-push-order-title.ts",
      "lib/kaiten-sync.ts",
      "lib/kaiten-sync-order-column-titles.ts",
      "lib/order-chat-correction-kaiten-sync.ts",
      "lib/kaiten-chat-background-sync.ts",
      "lib/kaiten-resolve-boards.ts",
      "lib/kaiten-card-types-sync.ts",
      "lib/apply-kaiten-block-from-list-tag.ts",
      "lib/apply-kaiten-unblock-from-list-tag.ts",
      "lib/order-notification-toasts.server.ts",
      "app/api/cron/kaiten-chat-sync/route.ts",
      "app/api/kanban/linked-orders/route.ts",
      "app/api/kaiten-card-types/route.ts",
      "app/api/kaiten/board/route.ts",
      "app/api/orders/kaiten-titles-sync/route.ts",
      "app/api/orders/kanban-chat-retry/route.ts",
      "app/api/orders/[id]/kanban-chat/route.ts",
      "app/api/orders/[id]/kaiten/route.ts",
      "app/api/orders/[id]/archive/route.ts",
      "app/api/orders/[id]/kaiten/chat/route.ts",
      "app/api/orders/[id]/kaiten/comments/route.ts",
      "app/api/orders/[id]/kaiten/files/[fileId]/route.ts",
      "app/api/orders/[id]/chat-corrections/[correctionId]/accept/route.ts",
      "app/api/orders/[id]/chat-corrections/[correctionId]/reject/route.ts",
      "app/api/orders/[id]/prosthetics-requests/[requestId]/accept/route.ts",
      "app/api/orders/[id]/prosthetics-requests/[requestId]/reject/route.ts",
    ]);
    const unexpected = offenders.filter((f) => !legacyAllow.has(f));
    expect(unexpected).toEqual([]);
  });
});
