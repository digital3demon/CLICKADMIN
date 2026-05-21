import "server-only";
import { EmailFolderType, type EmailAccount, type PrismaClient } from "@prisma/client";
import rules from "@/data/order-digitaldemon-mail-rules.json";

const ACCOUNT_EMAIL = "order@digitaldemon.studio";
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

type SourceRule = {
  name?: string;
  label?: string;
  folder?: string;
  any?: Array<[string, string]>;
  delete?: boolean;
  markRead?: boolean;
  markImportant?: boolean;
  stopProcessing?: boolean;
  forwardTo?: string[];
};

function colorFor(value: string): string {
  const hash = [...value].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return COLORS[hash % COLORS.length] ?? "#a78bfa";
}

function conditionsFor(rule: SourceRule) {
  return {
    any: (Array.isArray(rule.any) ? rule.any : [])
      .map(([field, contains]) => ({
        field: String(field || "").trim(),
        contains: String(contains || "").trim(),
      }))
      .filter((item) => item.field && item.contains),
  };
}

async function ensureLabel(
  db: PrismaClient,
  account: Pick<EmailAccount, "id" | "tenantId">,
  name: string,
) {
  if (!name) return null;
  const existing = await db.emailLabel.findUnique({
    where: { accountId_name: { accountId: account.id, name } },
  });
  if (existing) return existing;
  return db.emailLabel.create({
    data: {
      tenantId: account.tenantId,
      accountId: account.id,
      name,
      color: colorFor(name),
      sortOrder: 100,
    },
  });
}

async function ensureFolder(
  db: PrismaClient,
  account: Pick<EmailAccount, "id" | "tenantId">,
  name: string,
) {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower === "корзина" || lower === "trash") {
    const trash = await db.emailFolder.findFirst({
      where: { tenantId: account.tenantId, accountId: account.id, type: EmailFolderType.TRASH },
    });
    if (trash) return trash;
  }

  const existing = await db.emailFolder.findFirst({
    where: {
      tenantId: account.tenantId,
      accountId: account.id,
      OR: [{ displayName: name }, { imapName: name }],
    },
  });
  if (existing) return existing;
  return db.emailFolder.create({
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

export async function ensureOrderDigitaldemonRules(
  db: PrismaClient,
  account: Pick<EmailAccount, "id" | "tenantId" | "email">,
): Promise<{ ensured: number }> {
  if (account.email.toLowerCase() !== ACCOUNT_EMAIL) return { ensured: 0 };

  let ensured = 0;
  for (const [index, source] of (rules as SourceRule[]).entries()) {
    const name = String(source.name || "").trim();
    if (!name) continue;
    const conditions = conditionsFor(source);
    if (conditions.any.length === 0) continue;

    const labelName = String(source.label || "").trim();
    const folderName = String(source.folder || source.label || "").trim();
    const label = await ensureLabel(db, account, labelName);
    const folder = await ensureFolder(db, account, folderName);
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

    const existing = await db.emailRule.findFirst({
      where: { tenantId: account.tenantId, accountId: account.id, name },
      select: { id: true },
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
      await db.emailRule.update({ where: { id: existing.id }, data });
    } else {
      await db.emailRule.create({ data });
    }
    ensured += 1;
  }
  return { ensured };
}
