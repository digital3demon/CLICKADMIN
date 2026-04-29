/**
 * Пост-очистка клиник в БД: те же правила, что refineClinicNameAndAddress при импорте.
 *
 *   node --env-file=.env scripts/cleanup-clinics.cjs
 *   node --env-file=.env scripts/cleanup-clinics.cjs --dry-run
 *
 * npm run db:clinics:cleanup
 */

const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { refineClinicNameAndAddress } = require("./clinic-cleanup-utils.cjs");

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
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function appendNotes(existing, additions) {
  const parts = [];
  const ex = String(existing || "").trim();
  if (ex) parts.push(ex);
  for (const add of additions) {
    const t = String(add || "").trim();
    if (!t) continue;
    if (ex.includes(t)) continue;
    parts.push(t);
  }
  return parts.join("\n\n").trim() || null;
}

async function main() {
  loadEnvFallback();
  const dryRun = process.argv.includes("--dry-run");
  const prisma = new PrismaClient();

  try {
    const clinics = await prisma.clinic.findMany({
      orderBy: { name: "asc" },
    });

    let updated = 0;
    let unchanged = 0;

    for (const c of clinics) {
      const refined = refineClinicNameAndAddress(
        c.name,
        c.address || "",
      );

      const notesNew = appendNotes(c.notes, refined.notesExtra);
      let isActive = c.isActive;
      if (refined.inactiveFromName) isActive = false;

      const addrNew = refined.address || null;
      const nameChanged = refined.name !== c.name;
      const addrChanged = (addrNew || "") !== (c.address || "");
      const notesChanged = (notesNew || "") !== (c.notes || "");
      const activeChanged = isActive !== c.isActive;

      if (!nameChanged && !addrChanged && !notesChanged && !activeChanged) {
        unchanged++;
        continue;
      }

      if (dryRun) {
        console.log("[dry-run]", c.id, {
          былоИмя: c.name,
          станетИмя: refined.name,
          адресМеняется: addrChanged,
          заметкиМеняются: notesChanged,
          активна: isActive,
        });
        updated++;
        continue;
      }

      const data = {
        name: refined.name,
        address: addrNew && addrNew.length ? addrNew : null,
        isActive,
      };
      if (notesNew != null) data.notes = notesNew;

      await prisma.clinic.update({
        where: { id: c.id },
        data,
      });
      updated++;
    }

    console.log("[cleanup-clinics]", {
      всего: clinics.length,
      обновленоИлиКОбновлению: updated,
      безИзменений: unchanged,
      dryRun,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
