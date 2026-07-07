/**
 * One-time deploy: сброс этапных сроков ТОЛЬКО в JSON канбана.
 * TenantClientState kanbanAppStateV3 + KanbanStandaloneCard.payload.
 * Order.dueDate, Kaiten, заголовки карточек — не трогаем.
 */
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const stageDue = require(path.join(__dirname, "..", "lib", "kanban", "kanban-stage-due.runtime.cjs"));

const APPLY = process.argv.includes("--apply") || process.argv.includes("--auto-once");
const AUTO_ONCE = process.argv.includes("--auto-once");
const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");
const MARKER_KEY = stageDue.KANBAN_CLEAR_ALL_STAGE_DUE_MARKER_KEY;
const KANBAN_STATE_KEY = "kanbanAppStateV3";

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
      const rows = await prisma.tenantClientState.findMany({
        where: { key: KANBAN_STATE_KEY },
        select: { tenantId: true },
        distinct: ["tenantId"],
      });
      return rows.map((r) => r.tenantId).filter(Boolean);
    }
    throw err;
  }
}

async function processTenant(prisma, tenantId, dryRun) {
  let clearedInState = 0;
  let clearedInStandalone = 0;

  const stateRow = await prisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key: KANBAN_STATE_KEY } },
    select: { value: true },
  });
  if (stateRow?.value && typeof stateRow.value === "object") {
    const state = structuredClone(stateRow.value);
    clearedInState = stageDue.applyKanbanStageDueClearToState(state);
    if (!dryRun) {
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
    if (!stageDue.clearKanbanStageDue(payload)) continue;
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
      console.log("[kanban-stage-due] tenants not found, skip.");
      return;
    }

    if (AUTO_ONCE && !FORCE) {
      const marked = [];
      for (const tenantId of tenantIds) {
        if (await hasMarkerForTenant(prisma, tenantId)) marked.push(tenantId);
      }
      if (marked.length === tenantIds.length) {
        console.log("[kanban-stage-due] marker exists; skip. Use --force to rerun.");
        return;
      }
    }

    if (FORCE && !dryRun) {
      console.log("[kanban-stage-due] --force: повторный сброс этапных сроков в канбане.");
    }

    let totalState = 0;
    let totalStandalone = 0;

    for (const tenantId of tenantIds) {
      if (AUTO_ONCE && !FORCE && (await hasMarkerForTenant(prisma, tenantId))) {
        console.log(`[kanban-stage-due] tenant ${tenantId}: marker exists, skip.`);
        continue;
      }

      const { clearedInState, clearedInStandalone } = await processTenant(
        prisma,
        tenantId,
        dryRun,
      );
      totalState += clearedInState;
      totalStandalone += clearedInStandalone;

      console.log(
        `[kanban-stage-due] tenant ${tenantId}: state=${clearedInState}, standalone=${clearedInStandalone}${dryRun ? " (dry-run)" : ""}`,
      );

      if (AUTO_ONCE && APPLY && !dryRun) {
        await writeMarker(prisma, tenantId, {
          clearedInState,
          clearedInStandalone,
          force: FORCE,
        });
      }
    }

    console.log(
      `[kanban-stage-due] done: state=${totalState}, standalone=${totalStandalone}, dryRun=${dryRun}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[kanban-stage-due] failed:", err);
  process.exit(1);
});
