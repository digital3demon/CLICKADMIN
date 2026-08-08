/**
 * Обезличивание сырого crm-dump zip (dump.json внутри).
 *
 * Правила:
 * - пользователи / почты / клиники / клиенты — похожие псевдонимы (Астра→Дспар), не «Клиника 1»
 * - реквизиты — случайные правдоподобные строки
 * - суммы оставляем
 * - прайс: name → «позиция»/«пункт», description → «описание позиции», leadWorkingDays → null
 * - Kaiten ids вычищаем
 * - картинки вложений — сильная пикселизация; PDF/документы не копируем
 *
 * Использование:
 *   node scripts/anonymize-crm-dump.cjs path/to/crm-dump-….zip
 *   node scripts/anonymize-crm-dump.cjs path/to/crm-dump-….zip path/to/out.zip
 *
 * Не трогает прод-БД — только файл.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const JSZip = require("jszip");

let createCanvas;
let loadImage;
try {
  ({ createCanvas, loadImage } = require("@napi-rs/canvas"));
} catch {
  createCanvas = null;
  loadImage = null;
}

const CYR_FROM =
  "абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
const CYR_TO =
  "еаоуиыэяюбвгджзйклмнпрстфхцчшщъьЁЕАОУИЫЭЯЮБВГДЖЗЙКЛМНПРСТФХЦЧШЩЪЬ";

function scrambleWord(word, salt) {
  if (!word) return word;
  const h = crypto.createHash("sha256").update(salt + "|" + word).digest();
  let out = "";
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const idx = CYR_FROM.indexOf(ch);
    if (idx >= 0) {
      const shift = h[i % h.length] % CYR_TO.length;
      const mapped = CYR_TO[(idx + shift) % CYR_TO.length];
      out +=
        ch === ch.toUpperCase() && ch !== ch.toLowerCase()
          ? mapped.toUpperCase()
          : mapped;
    } else if (/[a-zA-Z]/.test(ch)) {
      const base = ch >= "a" ? 97 : 65;
      const shift = (h[i % h.length] % 26) + 1;
      out += String.fromCharCode(
        base + ((ch.charCodeAt(0) - base + shift) % 26),
      );
    } else {
      out += ch;
    }
  }
  return out;
}

function scrambleName(name, salt) {
  const s = String(name || "").trim();
  if (!s) return s;
  return s
    .split(/(\s+)/)
    .map((part) => (/^\s+$/.test(part) ? part : scrambleWord(part, salt)))
    .join("");
}

function randDigits(n) {
  let s = "";
  for (let i = 0; i < n; i++) s += String(crypto.randomInt(0, 10));
  return s;
}

function fakeEmail(seed) {
  const local = scrambleWord("user", seed).toLowerCase().replace(/[^a-z0-9]/g, "") || "user";
  return `${local}${randDigits(3)}@demo.local`;
}

function anonymizeDump(payload) {
  const tables = payload.tables || {};
  const salt = payload.meta?.exportedAt || "demo";

  if (tables.tenant) {
    tables.tenant.name = scrambleName(tables.tenant.name || "Демо", salt + ":t");
    tables.tenant.slug = "demo";
    tables.tenant.aiApiKey = null;
    tables.tenant.tenantDatabaseUrl = null;
    tables.tenant.adminSharedTelegramChatId = null;
    tables.tenant.adminSharedTelegramUsername = null;
    tables.tenant.kaitenIntegrationEnabled = false;
    tables.tenant.kaitenIntegrationDisabledAt = null;
    tables.tenant.kaitenIntegrationDisabledByUserId = null;
  }

  const userMap = new Map();
  if (Array.isArray(tables.users)) {
    tables.users = tables.users.map((u, i) => {
      const id = u.id;
      const displayName = scrambleName(u.displayName || "Пользователь", salt + ":u:" + id);
      const email = fakeEmail(salt + ":e:" + id);
      userMap.set(id, { displayName, email });
      return {
        ...u,
        displayName,
        email,
        phone: null,
        telegramId: null,
        telegramUsername: null,
        telegramKanbanNotifyPrefs: null,
        inviteCodeHash: null,
        kaitenUserId: null,
        mentionHandle: null,
        avatarCustomMime: null,
        avatarCustomUploadedAt: null,
        // пароль будет выставлен при apply; хеш из прода не оставляем
        passwordHash: null,
      };
    });
  }

  if (Array.isArray(tables.clinics)) {
    tables.clinics = tables.clinics.map((c) => ({
      ...c,
      name: scrambleName(c.name || "Клиника", salt + ":c:" + c.id),
      legalFullName: c.legalFullName
        ? scrambleName(c.legalFullName, salt + ":cl:" + c.id)
        : null,
      address: c.address ? scrambleName(c.address, salt + ":ca:" + c.id) : null,
      legalAddress: c.legalAddress
        ? scrambleName(c.legalAddress, salt + ":cla:" + c.id)
        : null,
      inn: c.inn ? randDigits(10) : null,
      kpp: c.kpp ? randDigits(9) : null,
      ogrn: c.ogrn ? randDigits(13) : null,
      bankName: c.bankName
        ? scrambleName(c.bankName, salt + ":cb:" + c.id)
        : null,
      bik: c.bik ? randDigits(9) : null,
      settlementAccount: c.settlementAccount ? randDigits(20) : null,
      correspondentAccount: c.correspondentAccount ? randDigits(20) : null,
      phone: c.phone ? `7${randDigits(10)}` : null,
      phoneAccounting: null,
      phoneManagement: null,
      email: c.email ? fakeEmail(salt + ":ce:" + c.id) : null,
      ceoName: c.ceoName
        ? scrambleName(c.ceoName, salt + ":ceo:" + c.id)
        : null,
      notes: null,
      contractNumber: c.contractNumber ? `Д-${randDigits(4)}` : null,
    }));
  }

  if (Array.isArray(tables.doctors)) {
    tables.doctors = tables.doctors.map((d) => {
      const fullName = scrambleName(d.fullName || "Врач", salt + ":d:" + d.id);
      const parts = fullName.split(/\s+/);
      return {
        ...d,
        fullName,
        lastName: parts[0] || scrambleName("Иванов", salt + ":dl:" + d.id),
        firstName: parts[1] || scrambleName("Иван", salt + ":df:" + d.id),
        patronymic: parts[2] || null,
        formerLastName: null,
        email: d.email ? fakeEmail(salt + ":de:" + d.id) : null,
        clinicWorkEmail: null,
        phone: d.phone ? `7${randDigits(10)}` : null,
        preferredContact: null,
        telegramUsername: null,
        particulars: null,
        aiParticulars: null,
        aiLessons: null,
        city: d.city ? scrambleName(d.city, salt + ":dc:" + d.id) : null,
      };
    });
  }

  if (Array.isArray(tables.priceListItems)) {
    tables.priceListItems = tables.priceListItems.map((item, i) => ({
      ...item,
      name: i % 2 === 0 ? "позиция" : "пункт",
      description: "описание позиции",
      leadWorkingDays: null,
      sectionTitle: item.sectionTitle ? "раздел" : null,
      subsectionTitle: item.subsectionTitle ? "подраздел" : null,
      // priceRub оставляем (суммы)
    }));
  }

  if (Array.isArray(tables.priceLists)) {
    tables.priceLists = tables.priceLists.map((p, i) => ({
      ...p,
      name: `Прайс ${i + 1}`,
    }));
  }

  if (Array.isArray(tables.payrollPriceItemConfigs)) {
    tables.payrollPriceItemConfigs = tables.payrollPriceItemConfigs.map((p) => ({
      ...p,
      description: "описание позиции",
      // amountRub оставляем
    }));
  }

  if (Array.isArray(tables.orders)) {
    tables.orders = tables.orders.map((o) => ({
      ...o,
      patientName: o.patientName
        ? scrambleName(o.patientName, salt + ":p:" + o.id)
        : null,
      notes: o.notes ? "описание позиции" : null,
      clientOrderText: o.clientOrderText ? "описание позиции" : null,
      listAdminMemo: null,
      legalEntity: o.legalEntity
        ? scrambleName(o.legalEntity, salt + ":le:" + o.id)
        : null,
      kaitenCardId: null,
      kaitenSyncError: null,
      kaitenSyncedAt: null,
      kaitenChatSyncedAt: null,
      kaitenColumnTitle: null,
      kaitenCardSortOrder: null,
      kaitenCardTitleMirror: null,
      kaitenCardDescriptionMirror: null,
      kaitenBlocked: false,
      kaitenBlockReason: null,
      kaitenBlockedAt: null,
      kaitenChatHasLabMention: false,
      kaitenLabMentionSignalAt: null,
      kaitenLabMentionWaterlineCommentId: null,
      kaitenLabMentionToastAuthor: null,
      kaitenLabMentionToastText: null,
      kaitenDecideLater: true,
      createKanbanWithoutKaiten: true,
      stickerPublicToken: null,
      invoiceNumber: o.invoiceNumber ? `СЧ-${randDigits(5)}` : null,
      // денежные поля (invoiceParsedTotalRub, paymentPartialRub, unit prices в constructions) — оставляем
    }));
  }

  if (Array.isArray(tables.couriers)) {
    tables.couriers = tables.couriers.map((c) => ({
      ...c,
      name: scrambleName(c.name || "Курьер", salt + ":k:" + c.id),
      phone: c.phone ? `7${randDigits(10)}` : null,
    }));
  }

  payload.meta = {
    ...(payload.meta || {}),
    anonymizedAt: new Date().toISOString(),
    anonymizeRules:
      "names scramble; requisites random; sums kept; price→пункт/позиция; days cleared; images pixelated; pdf/docs dropped",
  };
  return payload;
}

/** Крупные пиксели: downscale → nearest-neighbor upscale. */
async function pixelateImageBuffer(buf) {
  if (!createCanvas || !loadImage) {
    throw new Error("@napi-rs/canvas недоступен — нельзя пикселить картинки");
  }
  const img = await loadImage(buf);
  const w = Math.max(1, img.width);
  const h = Math.max(1, img.height);
  // ~12–24 блока по длинной стороне — лица/текст нечитаемы
  const longSide = Math.max(w, h);
  const targetBlocks = longSide > 2000 ? 16 : longSide > 800 ? 20 : 24;
  const sw = Math.max(1, Math.round(w / (longSide / targetBlocks)));
  const sh = Math.max(1, Math.round(h / (longSide / targetBlocks)));
  const small = createCanvas(sw, sh);
  const sctx = small.getContext("2d");
  sctx.imageSmoothingEnabled = false;
  sctx.drawImage(img, 0, 0, sw, sh);
  const out = createCanvas(w, h);
  const octx = out.getContext("2d");
  octx.imageSmoothingEnabled = false;
  octx.drawImage(small, 0, 0, w, h);
  return Buffer.from(out.toBuffer("image/jpeg", 72));
}

function isAttachmentZipPath(name) {
  return /^attachments\//i.test(name) && !name.endsWith("/");
}

function looksLikeNonImageAttachment(name) {
  return /\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|txt|csv|rtf)$/i.test(name);
}

async function main() {
  const inPath = process.argv[2];
  if (!inPath) {
    console.error(
      "Usage: node scripts/anonymize-crm-dump.cjs <in.zip> [out.zip]",
    );
    process.exit(1);
  }
  const absIn = path.resolve(inPath);
  if (!fs.existsSync(absIn)) {
    console.error("Файл не найден:", absIn);
    process.exit(1);
  }
  const outPath = path.resolve(
    process.argv[3] ||
      absIn.replace(/\.zip$/i, "") + ".anonymized.zip",
  );

  const buf = fs.readFileSync(absIn);
  const zip = await JSZip.loadAsync(buf);
  const dumpFile = zip.file("dump.json");
  if (!dumpFile) {
    console.error("В zip нет dump.json");
    process.exit(1);
  }
  const raw = JSON.parse(await dumpFile.async("string"));
  const anon = anonymizeDump(raw);

  const out = new JSZip();
  let pixelated = 0;
  let droppedNonImage = 0;
  let pixelateErrors = 0;
  const keptZipPaths = new Set();

  const names = Object.keys(zip.files);
  for (const name of names) {
    const entry = zip.files[name];
    if (!entry || entry.dir) continue;
    if (!isAttachmentZipPath(name)) continue;
    if (looksLikeNonImageAttachment(name)) {
      droppedNonImage += 1;
      continue;
    }
    try {
      const bytes = Buffer.from(await entry.async("nodebuffer"));
      const pix = await pixelateImageBuffer(bytes);
      const outName = name.replace(/\.[^.]+$/i, ".jpg");
      out.file(outName, pix);
      keptZipPaths.add(outName);
      // также старый путь, если расширение сменилось — обновим meta ниже
      keptZipPaths.add(name);
      pixelated += 1;
    } catch (e) {
      pixelateErrors += 1;
      console.warn("[anonymize] skip attachment", name, e.message || e);
    }
  }

  if (Array.isArray(anon.tables?.orderAttachmentsMeta)) {
    anon.tables.orderAttachmentsMeta = anon.tables.orderAttachmentsMeta
      .filter((a) => {
        const zp = String(a.zipPath || "");
        if (looksLikeNonImageAttachment(zp) || looksLikeNonImageAttachment(a.fileName)) {
          droppedNonImage += 1;
          return false;
        }
        const jpgPath = zp.replace(/\.[^.]+$/i, ".jpg");
        return keptZipPaths.has(zp) || keptZipPaths.has(jpgPath);
      })
      .map((a) => {
        const zp = String(a.zipPath || "").replace(/\.[^.]+$/i, ".jpg");
        return {
          ...a,
          zipPath: zp,
          mimeType: "image/jpeg",
          fileName: String(a.fileName || "image.jpg").replace(/\.[^.]+$/i, ".jpg"),
          pixelated: true,
        };
      });
    anon.meta.imageAttachmentCount = anon.tables.orderAttachmentsMeta.length;
  }

  anon.meta.pixelatedImages = pixelated;
  anon.meta.droppedNonImageAttachments = droppedNonImage;
  anon.meta.pixelateErrors = pixelateErrors;

  out.file("meta.json", JSON.stringify(anon.meta, null, 2));
  out.file("dump.json", JSON.stringify(anon));
  const outBuf = await out.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  fs.writeFileSync(outPath, outBuf);
  console.log(
    JSON.stringify(
      {
        ok: true,
        in: absIn,
        out: outPath,
        orderCount: anon.meta?.orderCount,
        userCount: anon.tables?.users?.length,
        clinicCount: anon.tables?.clinics?.length,
        pixelatedImages: pixelated,
        droppedNonImage,
        pixelateErrors,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
