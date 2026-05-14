/**
 * Dry-run by default:
 *   node --env-file=.env scripts/repair-clinic-document-workflow-markers.cjs
 *
 * Apply changes:
 *   node --env-file=.env scripts/repair-clinic-document-workflow-markers.cjs --apply
 */

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { extractDocumentWorkflowMarkers } = require("./document-workflow-markers.cjs");

function loadEnvFallback() {
  if (process.env.DATABASE_URL) return;
  const p = path.join(process.cwd(), ".env");
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function appendUniqueNote(existing, note) {
  const prev = String(existing ?? "").trim();
  const next = String(note ?? "").trim();
  if (!next) return prev;
  if (prev.toLowerCase().includes(next.toLowerCase())) return prev;
  return [prev, next].filter(Boolean).join("\n\n");
}

function short(value, max = 80) {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

async function main() {
  loadEnvFallback();
  const apply = process.argv.includes("--apply");
  const prisma = new PrismaClient();
  try {
    const clinics = await prisma.clinic.findMany({
      where: { legalFullName: { not: null } },
      select: {
        id: true,
        name: true,
        legalFullName: true,
        worksWithEdo: true,
        worksWithReconciliation: true,
        notes: true,
      },
      orderBy: { name: "asc" },
    });

    const changes = [];
    for (const clinic of clinics) {
      const parsed = extractDocumentWorkflowMarkers(clinic.legalFullName);
      const hasWorkflowMarker =
        parsed.worksWithEdo || parsed.worksWithReconciliation || parsed.usesPaperDocs;
      if (!hasWorkflowMarker) continue;
      const data = {};
      if (parsed.cleanLegalFullName && parsed.cleanLegalFullName !== clinic.legalFullName) {
        data.legalFullName = parsed.cleanLegalFullName;
      }
      if (parsed.worksWithEdo && !clinic.worksWithEdo) data.worksWithEdo = true;
      if (parsed.worksWithReconciliation && !clinic.worksWithReconciliation) {
        data.worksWithReconciliation = true;
      }
      if (parsed.usesPaperDocs) {
        const notes = appendUniqueNote(clinic.notes, "Документооборот: бумажные документы");
        if (notes !== (clinic.notes ?? "").trim()) data.notes = notes;
      }
      if (Object.keys(data).length > 0) {
        changes.push({ clinic, parsed, data });
      }
    }

    console.log(apply ? "Режим: APPLY" : "Режим: DRY-RUN");
    console.log("Клиник к исправлению:", changes.length);
    for (const item of changes.slice(0, 200)) {
      console.log(
        [
          `- ${short(item.clinic.name, 42)}`,
          `было: ${short(item.clinic.legalFullName)}`,
          `будет: ${short(item.data.legalFullName ?? item.clinic.legalFullName)}`,
          item.data.worksWithEdo ? "ЭДО=true" : null,
          item.data.worksWithReconciliation ? "сверка=true" : null,
          item.parsed.usesPaperDocs ? "бумажные документы -> notes" : null,
        ]
          .filter(Boolean)
          .join(" | "),
      );
    }
    if (changes.length > 200) {
      console.log(`... ещё ${changes.length - 200}`);
    }

    if (!apply) {
      console.log("Для применения запустите с --apply.");
      return;
    }

    for (const item of changes) {
      await prisma.clinic.update({
        where: { id: item.clinic.id },
        data: item.data,
      });
    }
    console.log("Готово. Обновлено клиник:", changes.length);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
