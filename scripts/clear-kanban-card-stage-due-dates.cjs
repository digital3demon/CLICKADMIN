/**
 * One-time deploy: сброс card.dueDate в канбане, если совпадает с Order.dueDate (лаб. срок).
 * Не трогает Order, Kaiten, вручную выставленные этапные сроки (≠ лаб.).
 *
 * Запуск:
 *   node --env-file=.env scripts/clear-kanban-card-stage-due-dates.cjs --auto-once
 *   node --env-file=.env scripts/clear-kanban-card-stage-due-dates.cjs --dry-run
 */
const { PrismaClient } = require("@prisma/client");

const APPLY = process.argv.includes("--apply") || process.argv.includes("--auto-once");
const AUTO_ONCE = process.argv.includes("--auto-once");
const DRY_RUN = process.argv.includes("--dry-run");
const MARKER_KEY = "kanban-clear-stage-due-lab-match-20260707-v1";
const KANBAN_STATE_KEY = "kanbanAppStateV3";

/** Держать в sync с lib/kanban/clear-kanban-lab-matched-due-dates.ts */
function normalizeKanbanDueDate(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.slice(0, 10);
}

function clearLabMatchedDueDateOnCard(card, orderDueById) {
  if (!card || typeof card !== "object") return false;
  const linked = String(card.linkedOrderId ?? "").trim();
  if (!linked) return false;
  const labDue = normalizeKanbanDueDate(orderDueById.get(linked));
  if (!labDue) return false;
  const cardDue = normalizeKanbanDueDate(card.dueDate);
  if (!cardDue || cardDue !== labDue) return false;
  card.dueDate = "";
  return true;
}

function clearLabMatchedDueDatesInKanbanState(state, orderDueById) {
  let clearedCount = 0;
  const touch = (card) => {
    if (clearLabMatchedDueDateOnCard(card, orderDueById)) clearedCount += 1;
  };
  for (const board of state.boards ?? []) {
    for (const col of board.columns ?? []) {
      for (const card of col.cards ?? []) touch(card);
    }
    for (const ac of board.archivedCards ?? []) {
      if (ac?.card) touch(ac.card);
    }
    for (const sc of board.stoppedCards ?? []) {
      if (sc?.card) touch(sc.card);
    }
  }
  return clearedCount;
}

function orderDueMapFromRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const id = String(row.id ?? "").trim();
    if (!id) continue;
    const due = row.dueDate instanceof Date ? row.dueDate.toISOString().slice(0, 10) : "";
    map.set(id, due);
  }
  return map;
}

async function hasMarkerForTenant(prisma, tenantId) {
  const row = await prisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: MARKER_KEY } },
    select: { tenantId: true },
  });
  return row != null;
}

async function allTenantIds(prisma) {
  try {
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    return tenants.map((t) => t.id).filter(Boolean);
  } catch (err) {
    if (err && typeof err === "object" && (err.code === "P2021" || err.code === "P2022")) {
      const rows = await prisma.order.findMany({ select: { tenantId: true }, distinct: ["tenantId"] });
      return rows.map((r) => r.tenantId).filter(Boolean);
    }
    throw err;
  }
}

async function processTenant(prisma, tenantId, orderDueById, dryRun) {
  let clearedInState = 0;
  let clearedInStandalone = 0;

  const stateRow = await prisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: KANBAN_STATE_KEY } },
    select: { value: true },
  });
  if (stateRow?.value && typeof stateRow.value === "object") {
    const state = structuredClone(stateRow.value);
    clearedInState = clearLabMatchedDueDatesInKanbanState(state, orderDueById);
    if (clearedInState > 0 && !dryRun) {
      await prisma.tenantClientState.upsert({
        where: { tenantId_key: { tenantId, key: KANBAN_STATE_KEY } },
        create: { tenantId, key: KANBAN_STATE_KEY, value: state },
        update: { value: state },
      });
    }
  }

  const standaloneRows = await prisma.kanbanStandaloneCard.findMany({
    where: { tenantId },
    select: { id: true, payload: true },
  });
  for (const row of standaloneRows) {
    const payload =
      row.payload && typeof row.payload === "object"
        ? structuredClone(row.payload)
        : null;
    if (!payload) continue;
    if (!clearLabMatchedDueDateOnCard(payload, orderDueById)) continue;
    clearedInStandalone += 1;
    if (!dryRun) {
      await prisma.kanbanStandaloneCard.update({
        where: { id: row.id },
        data: { payload },
      });
    }
  }

  return { clearedInState, clearedInStandalone };
}

async function writeMarker(prisma, tenantId, summary) {
  await prisma.tenantClientState.upsert({
    where: { tenantId_key: { tenantId, key: MARKER_KEY } },
    create: {
      tenantId,
      key: MARKER_KEY,
      value: { ranAt: new Date().toISOString(), ...summary },
    },
    update: {
      value: { ranAt: new Date().toISOString(), ...summary },
    },
  });
}

async function main() {
  const prisma = new PrismaClient();
  const dryRun = DRY_RUN || !APPLY;
  try {
    const tenantIds = await allTenantIds(prisma);
    if (tenantIds.length === 0) {
      console.log("[kanban-due] tenants not found, skip.");
      return;
    }

    if (AUTO_ONCE) {
      const marked = [];
      for (const tenantId of tenantIds) {
        if (await hasMarkerForTenant(prisma, tenantId)) marked.push(tenantId);
      }
      if (marked.length === tenantIds.length) {
        console.log("[kanban-due] already cleared for all tenants; skip.");
        return;
      }
    }

    let totalState = 0;
    let totalStandalone = 0;

    for (const tenantId of tenantIds) {
      if (AUTO_ONCE && (await hasMarkerForTenant(prisma, tenantId))) {
        console.log(`[kanban-due] tenant ${tenantId}: marker exists, skip.`);
        continue;
      }

      const orders = await prisma.order.findMany({
        where: { tenantId },
        select: { id: true, dueDate: true },
      });
      const orderDueById = orderDueMapFromRows(orders);

      const { clearedInState, clearedInStandalone } = await processTenant(
        prisma,
        tenantId,
        orderDueById,
        dryRun,
      );
      totalState += clearedInState;
      totalStandalone += clearedInStandalone;

      console.log(
        `[kanban-due] tenant ${tenantId}: state=${clearedInState}, standalone=${clearedInStandalone}${dryRun ? " (dry-run)" : ""}`,
      );

      if (AUTO_ONCE && APPLY && !dryRun) {
        await writeMarker(prisma, tenantId, { clearedInState, clearedInStandalone });
      }
    }

    console.log(
      `[kanban-due] done: state=${totalState}, standalone=${totalStandalone}, dryRun=${dryRun}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[kanban-due] failed:", err);
  process.exit(1);
});
