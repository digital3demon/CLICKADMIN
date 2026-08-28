/**
 * Перед slim persist: живой card.comments уходит в kanbanCommentsV1,
 * иначе tenant JSON обнуляет чат и лента пропадает из канбана.
 */
import { writeClientState } from "@/lib/client-state-client";
import {
  collectLinkedOrderCommentsFromState,
  kanbanOrderCommentsStateKey,
} from "@/lib/kanban/kanban-order-comments";
import { kanbanStateForPersistence } from "@/lib/kanban/model";
import type { KanbanAppState } from "@/lib/kanban/types";

export function flushLinkedOrderCommentsFromState(state: KanbanAppState): void {
  const byOrder = collectLinkedOrderCommentsFromState(state);
  for (const [orderId, comments] of byOrder) {
    const hasText = comments.some((c) => String(c.text || "").trim());
    if (!hasText) continue;
    void writeClientState("tenant", kanbanOrderCommentsStateKey(orderId), {
      comments,
    });
  }
}

export function writePersistedKanbanState(
  state: KanbanAppState,
  isDemo: boolean,
): void {
  if (!isDemo) flushLinkedOrderCommentsFromState(state);
  void writeClientState(
    isDemo ? "user" : "tenant",
    isDemo ? "kanbanAppStateV3Demo" : "kanbanAppStateV3",
    kanbanStateForPersistence(state, isDemo),
  );
}

export async function writePersistedKanbanStateNow(
  state: KanbanAppState,
  isDemo: boolean,
): Promise<boolean> {
  if (!isDemo) {
    const byOrder = collectLinkedOrderCommentsFromState(state);
    await Promise.all(
      [...byOrder].map(([orderId, comments]) => {
        const hasText = comments.some((c) => String(c.text || "").trim());
        if (!hasText) return Promise.resolve(true);
        return writeClientState("tenant", kanbanOrderCommentsStateKey(orderId), {
          comments,
        });
      }),
    );
  }
  return writeClientState(
    isDemo ? "user" : "tenant",
    isDemo ? "kanbanAppStateV3Demo" : "kanbanAppStateV3",
    kanbanStateForPersistence(state, isDemo),
  );
}
