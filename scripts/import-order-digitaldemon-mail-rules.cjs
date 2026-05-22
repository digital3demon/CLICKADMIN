const fs = require("fs");
const path = require("path");
const { EmailFolderType } = require("@prisma/client");
const { findMailAccountClient } = require("./mail-tenant-prisma.cjs");

const ACCOUNT_EMAIL = "order@digitaldemon.studio";
const ROOT = path.join(__dirname, "..");
const RULES_PATH = path.join(ROOT, "data", "order-digitaldemon-mail-rules.json");
const COLORS = [
  "#a78bfa",
  "#5eead4",
  "#fb7185",
  "#facc15",
  "#38bdf8",
  "#86efac",
  "#f97316",
  "#c084fc",
  "#fda4af",
  "#67e8f9",
];

function colorFor(value) {
  let hash = 0;
  for (const ch of value) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

function readRules() {
  const raw = fs.readFileSync(RULES_PATH, "utf8");
  const rules = JSON.parse(raw);
  if (!Array.isArray(rules)) throw new Error("Каталог правил должен быть массивом");
  return rules;
}

function normalizeConditions(rule) {
  const any = Array.isArray(rule.any) ? rule.any : [];
  return {
    any: any
      .map((item) => {
        const field = String(item?.[0] || "").trim();
        const contains = String(item?.[1] || "").trim();
        return field && contains ? { field, contains } : null;
      })
      .filter(Boolean),
  };
}

async function ensureLabel(prisma, account, name) {
  if (!name) return null;
  const existing = await prisma.emailLabel.findUnique({
    where: { accountId_name: { accountId: account.id, name } },
  });
  if (existing) return existing;
  return prisma.emailLabel.create({
    data: {
      tenantId: account.tenantId,
      accountId: account.id,
      name,
      color: colorFor(name),
      sortOrder: 100,
    },
  });
}

async function ensureFolder(prisma, account, name) {
  if (!name) return null;
  const systemType =
    name.toLowerCase() === "корзина" || name.toLowerCase() === "trash"
      ? EmailFolderType.TRASH
      : null;
  if (systemType) {
    const system = await prisma.emailFolder.findFirst({
      where: { tenantId: account.tenantId, accountId: account.id, type: systemType },
    });
    if (system) return system;
  }

  const existing =
    (await prisma.emailFolder.findFirst({
      where: {
        tenantId: account.tenantId,
        accountId: account.id,
        OR: [{ displayName: name }, { imapName: name }],
      },
    })) || null;
  if (existing) return existing;
  return prisma.emailFolder.create({
    data: {
      tenantId: account.tenantId,
      accountId: account.id,
      imapName: name,
      displayName: name,
      color: colorFor(name),
      type: EmailFolderType.CUSTOM,
      sortOrder: 200,
    },
  });
}

async function main() {
  const ctx = await findMailAccountClient(ACCOUNT_EMAIL);
  const { prisma, account } = ctx;
  try {
    const rules = readRules();
    let imported = 0;
    for (const [index, source] of rules.entries()) {
      const name = String(source.name || "").trim();
      if (!name) continue;
      const label = await ensureLabel(prisma, account, source.label ? String(source.label).trim() : "");
      const folder = await ensureFolder(
        prisma,
        account,
        source.folder ? String(source.folder).trim() : source.label ? String(source.label).trim() : "",
      );
      const conditions = normalizeConditions(source);
      if (conditions.any.length === 0) {
        console.warn("Пропускаю правило без условий:", name);
        continue;
      }
      const actions = {
        delete: source.delete === true,
        markRead: source.markRead === true,
        markImportant: source.markImportant === true,
        stopProcessing: source.stopProcessing === true,
        moveToFolderId: folder?.id ?? null,
        labelIds: label ? [label.id] : [],
        forwardTo: Array.isArray(source.forwardTo)
          ? source.forwardTo.filter((item) => typeof item === "string" && item.trim())
          : [],
      };
      const existing = await prisma.emailRule.findFirst({
        where: { tenantId: account.tenantId, accountId: account.id, name },
      });
      const data = {
        tenantId: account.tenantId,
        accountId: account.id,
        name,
        isActive: true,
        sortOrder: (index + 1) * 10,
        conditions,
        actions,
      };
      if (existing) {
        await prisma.emailRule.update({ where: { id: existing.id }, data });
      } else {
        await prisma.emailRule.create({ data });
      }
      imported += 1;
    }
    console.log(`Импортировано/обновлено правил: ${imported} (${ctx.label})`);
  } finally {
    await ctx.disconnect();
  }
}

main().catch((err) => {
  if (
    process.env.MAIL_RULES_ORDER_SKIP_MISSING === "1" &&
    err instanceof Error &&
    err.message.includes("Ящик order@digitaldemon.studio не найден")
  ) {
    console.warn(`[mail-rules] ${err.message}; пропускаю автодеплой правил.`);
    return;
  }
  console.error(err);
  process.exitCode = 1;
});
