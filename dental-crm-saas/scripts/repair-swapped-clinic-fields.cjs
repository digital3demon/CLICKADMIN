/**
 * Починка клиник, у которых в name оказалась улица/город, а название — в кавычках в address
 * (импорт: `…", "Альфа Дент`, `…, , \"Пушкинская стоматология"` и т.п.).
 *
 * Запуск: node --env-file=.env scripts/repair-swapped-clinic-fields.cjs
 * Сухой прогон: ...cjs --dry-run
 * Не сливать дубликаты по имени: ...cjs --no-merge-duplicates
 * Подсказка по строкам без срабатывания правила: ...cjs --verbose
 */

const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

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

function addressOnlyLeftPart(left) {
  const s = String(left || "").trim();
  if (!s) return true;
  if (/^г\.?\s+/iu.test(s)) return true;
  if (/^\d{1,2}-[Яяю]\s/u.test(s)) return true;
  if (
    /^(?:ул\.|улица|пр\.|просп\.|проспект|наб\.|набережная|пер\.|переулок|ш\.|шоссе|б-р|бульвар|пл\.|площадь|линия|аллея)\b/iu.test(
      s,
    )
  ) {
    return true;
  }
  if (/^к\.\s*\d/iu.test(s)) return true;
  return false;
}

function clinicNameLooksMisplaced(name) {
  return (
    addressOnlyLeftPart(name) ||
    /^\d{1,2}-[Яяю]\s/u.test(String(name || "").trim())
  );
}

/** В адресе есть признаки «название в кавычках» — иначе verbose шумит (г. Сочи + ул. …). */
function addressHintsEmbeddedClinicName(address) {
  const s = String(address || "");
  return /\\"/.test(s) || /"\s*,\s*"/.test(s) || /,\s*,\s*\\?"/.test(s);
}

/**
 * Та же логика, что splitSwapQuotedClinicTail в import-doctors-xlsx.cjs
 */
function splitSwapQuotedClinicTail(pair) {
  const clinicName = pair.clinicName;
  const addrRaw = String(pair.clinicAddress || "").trim();
  if (!addrRaw) return [pair];
  const addr = addrRaw
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\\"/g, '"')
    .trim();

  const nameBad =
    addressOnlyLeftPart(clinicName) ||
    /^\d{1,2}-[Яяю]\s/u.test(String(clinicName || "").trim());

  function trySwap(headAddr, quotedName) {
    const q = String(quotedName || "").trim();
    if (!q) return null;
    if (!nameBad) return null;
    if (addressOnlyLeftPart(q)) return null;
    if (/^к\.\s*\d/iu.test(q)) return null;
    const newAddress = [clinicName.trim(), String(headAddr || "").trim()]
      .filter(Boolean)
      .join("\n")
      .trim();
    return {
      clinicName: q.slice(0, 200),
      clinicAddress: newAddress.slice(0, 2000),
    };
  }

  let splitAt = -1;
  let nameStart = -1;
  const re = /"\s*,\s*"/g;
  let m;
  while ((m = re.exec(addr)) !== null) {
    splitAt = m.index;
    nameStart = m.index + m[0].length;
  }
  if (splitAt >= 0 && nameStart >= 0) {
    const headAddr = addr.slice(0, splitAt).replace(/^"+|"+$/g, "").trim();
    const quotedName = addr
      .slice(nameStart)
      .trim()
      .replace(/^"+|"+$/g, "")
      .trim();
    const r = trySwap(headAddr, quotedName);
    if (r) return [r];
  }

  const tm = addr.match(/,\s*(?:,\s*)?"([^"]+)"?\s*$/u);
  if (tm) {
    const headAddr = addr.slice(0, tm.index).trim();
    const r = trySwap(headAddr, tm[1]);
    if (r) return [r];
  }

  return [pair];
}

async function mergeClinicInto(prisma, sourceId, targetId, dryRun) {
  const [nOrders, nRev, links] = await Promise.all([
    prisma.order.count({ where: { clinicId: sourceId } }),
    prisma.contractorRevision.count({ where: { clinicId: sourceId } }),
    prisma.doctorOnClinic.findMany({ where: { clinicId: sourceId } }),
  ]);
  if (dryRun) {
    console.log(
      `[merge-dry] ${sourceId} → ${targetId}: заказов=${nOrders}, ревизий=${nRev}, врачей=${links.length}`,
    );
    return;
  }
  await prisma.order.updateMany({
    where: { clinicId: sourceId },
    data: { clinicId: targetId },
  });
  await prisma.contractorRevision.updateMany({
    where: { clinicId: sourceId },
    data: { clinicId: targetId },
  });
  for (const l of links) {
    const existing = await prisma.doctorOnClinic.findUnique({
      where: {
        doctorId_clinicId: { doctorId: l.doctorId, clinicId: targetId },
      },
    });
    await prisma.doctorOnClinic.delete({
      where: {
        doctorId_clinicId: { doctorId: l.doctorId, clinicId: sourceId },
      },
    });
    if (!existing) {
      await prisma.doctorOnClinic.create({
        data: { doctorId: l.doctorId, clinicId: targetId },
      });
    }
  }
  await prisma.clinic.delete({ where: { id: sourceId } });
}

async function main() {
  loadEnvFallback();
  const dryRun = process.argv.includes("--dry-run");
  const verbose = process.argv.includes("--verbose");
  const noMerge = process.argv.includes("--no-merge-duplicates");
  const prisma = new PrismaClient();
  try {
    const clinics = await prisma.clinic.findMany({
      select: { id: true, name: true, address: true },
    });
    let updated = 0;
    let merged = 0;
    let skipped = 0;
    const mergedAwayIds = new Set();
    for (const c of clinics) {
      if (mergedAwayIds.has(c.id)) continue;
      const [fixed] = splitSwapQuotedClinicTail({
        clinicName: c.name,
        clinicAddress: c.address || "",
      });
      const newName = fixed.clinicName;
      const newAddr = fixed.clinicAddress || null;
      if (newName === c.name && (newAddr || "") === (c.address || "")) {
        if (
          verbose &&
          clinicNameLooksMisplaced(c.name) &&
          String(c.address || "").trim() &&
          addressHintsEmbeddedClinicName(c.address)
        ) {
          const a = String(c.address);
          console.log(
            `[verbose] не сработало правило id=${c.id} name=${JSON.stringify(c.name)} address=${JSON.stringify(a.length > 220 ? `${a.slice(0, 220)}…` : a)}`,
          );
        }
        continue;
      }
      const conflict = await prisma.clinic.findFirst({
        where: { name: newName, id: { not: c.id } },
      });
      if (conflict) {
        if (!noMerge) {
          console.log(
            `[merge] "${newName}": запись ${c.id} объединяется с ${conflict.id}`,
          );
          if (!dryRun) {
            if (newAddr && !(conflict.address || "").trim()) {
              await prisma.clinic.update({
                where: { id: conflict.id },
                data: { address: newAddr },
              });
            }
            await mergeClinicInto(prisma, c.id, conflict.id, false);
          } else {
            await mergeClinicInto(prisma, c.id, conflict.id, true);
          }
          mergedAwayIds.add(c.id);
          merged++;
          continue;
        }
        console.warn(
          `[skip] id=${c.id} — имя "${newName}" уже у другой клиники (${conflict.id}). Запустите без --no-merge-duplicates, чтобы объединить.`,
        );
        skipped++;
        continue;
      }
      console.log(
        `[fix] ${c.id}\n  name: ${JSON.stringify(c.name)} → ${JSON.stringify(newName)}\n  address: ${JSON.stringify(c.address)} → ${JSON.stringify(newAddr)}`,
      );
      if (!dryRun) {
        await prisma.clinic.update({
          where: { id: c.id },
          data: { name: newName, address: newAddr },
        });
      }
      updated++;
    }
    const parts = [];
    if (dryRun) {
      parts.push(`сухой прогон: обновлений было бы ${updated}`);
      parts.push(`объединений ${merged}`);
    } else {
      parts.push(`обновлено ${updated}`);
      parts.push(`объединено ${merged}`);
    }
    parts.push(`пропущено ${skipped}`);
    console.log(`Готово: ${parts.join(", ")}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
