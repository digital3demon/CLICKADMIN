"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_KANBAN_ADMIN_MENTION_TAG,
  normalizeKanbanAdminMentionTag,
} from "@/lib/kanban-admin-mention";
import { useSessionUser } from "@/components/providers/SessionUserProvider";

/** Один запрос на вкладку — иначе каждая ячейка чата в списке нарядов бьёт /session. */
let cachedTag: string | null = null;
let inflight: Promise<string> | null = null;

function loadAdminMentionTagOnce(): Promise<string> {
  if (cachedTag != null) return Promise.resolve(cachedTag);
  if (!inflight) {
    inflight = fetch("/api/auth/session", {
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => res.json())
      .then(
        (j: {
          user?: unknown;
          tenant?: { kanbanAdminMentionTag?: string | null };
        }) => {
          const tag =
            j?.user != null
              ? normalizeKanbanAdminMentionTag(
                  j.tenant?.kanbanAdminMentionTag ?? null,
                )
              : DEFAULT_KANBAN_ADMIN_MENTION_TAG;
          cachedTag = tag;
          return tag;
        },
      )
      .catch(() => {
        cachedTag = DEFAULT_KANBAN_ADMIN_MENTION_TAG;
        return cachedTag;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Эффективный токен @… для группы ADMINISTRATOR + SENIOR_ADMINISTRATOR. */
export function useKanbanAdminMentionTag(): string {
  const { kanbanAdminMentionTag, ready } = useSessionUser();
  const [tag, setTag] = useState(
    () =>
      cachedTag ??
      normalizeKanbanAdminMentionTag(kanbanAdminMentionTag) ??
      DEFAULT_KANBAN_ADMIN_MENTION_TAG,
  );

  useEffect(() => {
    /* SSR/bootstrap уже дал сессию — тег из контекста, без GET /session на каждую строку. */
    if (ready) {
      const next = normalizeKanbanAdminMentionTag(kanbanAdminMentionTag);
      cachedTag = next;
      setTag(next);
      return;
    }
    if (cachedTag != null) {
      setTag(cachedTag);
      return;
    }
    let cancelled = false;
    void loadAdminMentionTagOnce().then((next) => {
      if (!cancelled) setTag(next);
    });
    return () => {
      cancelled = true;
    };
  }, [kanbanAdminMentionTag, ready]);

  return tag;
}
