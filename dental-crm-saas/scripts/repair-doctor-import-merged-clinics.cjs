/**
 * Разовая починка после старого import-doctors-xlsx:
 * в ячейке «Клиника» несколько клиник склеивались в один address + одна связь врача.
 *
 * 1) Обрезает поле address у клиник, куда попал «хвост» из чужих названий (эвристика).
 * 2) Для врача «Соколов Никита Вячеславович» добавляет недостающие связи с клиниками
 *    Мезон, Юнион / UnionGK Dental Clinic, Вайт Вейв / White Wave (если есть в БД).
 *
 * Запуск: node --env-file=.env scripts/repair-doctor-import-merged-clinics.cjs
 * Сухой прогон: ...cjs --dry-run
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

/** Старый импорт склеивал JSON-подобные куски в address */
function looksLikeMergedClinicAddresses(address) {
  const s = String(address || "");
  if (!s.trim()) return false;
  if (s.includes('", "')) return true;
  if (/\n.+ул\.\s*Комиссара/su.test(s)) return true;
  if (/\n.+Куйбышева/su.test(s) && /Адептика|наб\./iu.test(s)) return true;
  return false;
}

function normalizeAddrKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[.,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Оставляем строки адреса одной клиники до появления склейки JSON "...", "другая клиника".
 * Не обрезаем многострочный адрес (г. / ул.) как первая версия скрипта.
 */
function salvageMergedAddress(address) {
  const rawLines = String(address || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const kept = [];
  for (const p of rawLines) {
    if (p.includes('", "')) {
      const head = p
        .split(/"\s*,\s*"/)[0]
        .trim()
        .replace(/^["']+|["']+$/g, "");
      if (head) kept.push(head);
      break;
    }
    kept.push(p);
  }
  const out = [];
  for (const ln of kept) {
    if (
      out.length &&
      normalizeAddrKey(out[out.length - 1]) === normalizeAddrKey(ln)
    ) {
      continue;
    }
    out.push(ln);
  }
  return out.join("\n").trim();
}

const EXTRA_LINKS_BY_DOCTOR = {
  "Соколов Никита Вячеславович": [
    "Мезон",
    "Юнион / UnionGK Dental Clinic",
    "Вайт Вейв / White Wave",
  ],
};

async function main() {
  loadEnvFallback();
  const dry = process.argv.includes("--dry-run");
  const prisma = new PrismaClient();
  try {
    const clinics = await prisma.clinic.findMany({
      where: {},
      select: { id: true, name: true, address: true },
    });
    let addrFixed = 0;
    for (const c of clinics) {
      if (!looksLikeMergedClinicAddresses(c.address)) continue;
      const clean = salvageMergedAddress(c.address);
      if (!clean || clean === c.address) continue;
      console.log(
        `[address] «${c.name}» (${c.id}):\n  было: ${String(c.address).slice(0, 120)}…\n  станет: ${clean}`,
      );
      addrFixed += 1;
      if (!dry) {
        await prisma.clinic.update({
          where: { id: c.id },
          data: { address: clean },
        });
      }
    }
    if (dry && addrFixed === 0) {
      console.log(
        "(dry-run) адресов с признаками склейки не найдено или нечего менять",
      );
    }

    let linksAdded = 0;
    for (const [fullName, clinicNames] of Object.entries(EXTRA_LINKS_BY_DOCTOR)) {
      const doctor = await prisma.doctor.findFirst({
        where: { fullName },
        select: { id: true, fullName: true },
      });
      if (!doctor) {
        console.warn(`[links] врач не найден: ${fullName}`);
        continue;
      }
      for (const nm of clinicNames) {
        const clinic = await prisma.clinic.findFirst({
          where: { name: nm },
          select: { id: true, name: true },
        });
        if (!clinic) {
          console.warn(`[links] клиника не найдена: ${nm}`);
          continue;
        }
        const has = await prisma.doctorOnClinic.findUnique({
          where: {
            doctorId_clinicId: { doctorId: doctor.id, clinicId: clinic.id },
          },
        });
        if (has) continue;
        console.log(
          `[link] ${doctor.fullName} → «${clinic.name}» (${clinic.id})`,
        );
        linksAdded += 1;
        if (!dry) {
          await prisma.doctorOnClinic.create({
            data: { doctorId: doctor.id, clinicId: clinic.id },
          });
        }
      }
    }

    console.log(
      dry
        ? `Сухой прогон: затронули бы адресов: ${addrFixed}, новых связей: ${linksAdded}.`
        : `Готово. Исправлено адресов: ${addrFixed}, добавлено связей: ${linksAdded}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
