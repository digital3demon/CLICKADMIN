import { describe, expect, it } from "vitest";
import {
  mergeKanbanTelegramPrefs,
  parseKanbanTelegramPrefKey,
  parseKanbanTelegramPrefsPatch,
  shouldNotifyKanbanOwnActions,
} from "@/lib/kanban-telegram-prefs";

describe("kanban telegram prefs: свои действия", () => {
  it("без сохранённых prefs галочка выключена, события включены", () => {
    const merged = mergeKanbanTelegramPrefs(null);
    expect(merged.tg_notify_own_actions).toBe(false);
    expect(merged.tg_due_changed).toBe(true);
    expect(merged.tg_person_added_to_card).toBe(true);
    expect(shouldNotifyKanbanOwnActions(merged)).toBe(false);
  });

  it("старый JSON без ключа не включает свои действия", () => {
    const merged = mergeKanbanTelegramPrefs({
      tg_due_changed: true,
      tg_person_added_to_card: false,
    });
    expect(merged.tg_notify_own_actions).toBe(false);
    expect(merged.tg_person_added_to_card).toBe(false);
    expect(shouldNotifyKanbanOwnActions(merged)).toBe(false);
  });

  it("явное включение сохраняется, кириллица в соседних ключах не ломает разбор", () => {
    const patch = parseKanbanTelegramPrefsPatch({
      tg_notify_own_actions: true,
    });
    expect(patch).toEqual({ tg_notify_own_actions: true });
    const merged = mergeKanbanTelegramPrefs({
      tg_notify_own_actions: true,
      tg_due_changed: false,
    });
    expect(shouldNotifyKanbanOwnActions(merged)).toBe(true);
    expect(merged.tg_due_changed).toBe(false);
  });

  it("event POST не принимает галочку как тип события", () => {
    expect(parseKanbanTelegramPrefKey("tg_notify_own_actions")).toBeNull();
    expect(parseKanbanTelegramPrefKey("tg_due_changed")).toBe("tg_due_changed");
  });
});
