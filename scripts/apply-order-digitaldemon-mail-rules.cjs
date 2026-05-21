const { EmailFolderType } = require("@prisma/client");
const { findMailAccountClient } = require("./mail-tenant-prisma.cjs");

const ACCOUNT_EMAIL = "order@digitaldemon.studio";
const BATCH_SIZE = 200;

function stringArray(value, key) {
  if (!value || typeof value !== "object") return [];
  const raw = value[key];
  return Array.isArray(raw) ? raw.filter((item) => typeof item === "string" && item.trim()) : [];
}

function bool(value, key) {
  return Boolean(value && typeof value === "object" && value[key] === true);
}

function nullableString(value, key) {
  if (!value || typeof value !== "object") return null;
  const raw = value[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function conditionsFor(rule) {
  const conditions = rule.conditions;
  if (!conditions || typeof conditions !== "object") return [];
  if (Array.isArray(conditions.any)) {
    return conditions.any
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const field = String(item.field || "").trim();
        const contains = String(item.contains || "").trim();
        return field && contains ? { field, contains } : null;
      })
      .filter(Boolean);
  }
  return ["from", "subject", "body"]
    .map((field) => {
      const contains = typeof conditions[field] === "string" ? conditions[field].trim() : "";
      return contains ? { field, contains } : null;
    })
    .filter(Boolean);
}

function addressJsonText(value) {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      return [item.name, item.address].filter(Boolean).join(" ");
    })
    .join(" ");
}

function matches(rule, message) {
  const conditions = conditionsFor(rule);
  if (conditions.length === 0) return false;
  const values = {
    from: message.from,
    toCc: message.toCc,
    subject: message.subject,
    body: message.body,
    attachmentName: message.attachmentNames.join(" "),
  };
  return conditions.some((condition) =>
    String(values[condition.field] || "")
      .toLowerCase()
      .includes(condition.contains.toLowerCase()),
  );
}

function evaluate(rules, message) {
  const labelIds = new Set();
  const result = {
    isFlagged: false,
    isRead: false,
    shouldDelete: false,
    folderId: null,
    labelIds,
  };
  for (const rule of rules) {
    if (!matches(rule, message)) continue;
    result.isFlagged ||= bool(rule.actions, "markImportant");
    result.isRead ||= bool(rule.actions, "markRead");
    result.shouldDelete ||= bool(rule.actions, "delete");
    for (const labelId of stringArray(rule.actions, "labelIds")) labelIds.add(labelId);
    result.folderId = nullableString(rule.actions, "moveToFolderId") || result.folderId;
    if (bool(rule.actions, "stopProcessing")) break;
  }
  return { ...result, labelIds: [...labelIds] };
}

async function refreshFolderCounters(prisma, tenantId, folderId) {
  const [totalCount, unreadCount] = await Promise.all([
    prisma.email.count({ where: { tenantId, folderId } }),
    prisma.email.count({ where: { tenantId, folderId, isRead: false } }),
  ]);
  await prisma.emailFolder.update({ where: { id: folderId }, data: { totalCount, unreadCount } });
}

async function refreshLabelCounters(prisma, tenantId, labelId) {
  const [totalCount, unreadCount] = await Promise.all([
    prisma.emailLabelAssignment.count({ where: { tenantId, labelId } }),
    prisma.emailLabelAssignment.count({ where: { tenantId, labelId, email: { isRead: false } } }),
  ]);
  await prisma.emailLabel.update({ where: { id: labelId }, data: { totalCount, unreadCount } });
}

async function refreshCountersSequentially(items, refresh) {
  for (const item of items) {
    await refresh(item);
  }
}

function isUniqueConstraintError(error) {
  return Boolean(error && typeof error === "object" && error.code === "P2002");
}

function withoutFolderMove(data) {
  const { folderId, ...rest } = data;
  return rest;
}

async function main() {
  const ctx = await findMailAccountClient(ACCOUNT_EMAIL);
  const { prisma, account } = ctx;
  try {
    const rules = await prisma.emailRule.findMany({
      where: { tenantId: account.tenantId, accountId: account.id, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    const trash = await prisma.emailFolder.findFirst({
      where: { tenantId: account.tenantId, accountId: account.id, type: EmailFolderType.TRASH },
      select: { id: true },
    });
    const validLabelIds = new Set(
      (
        await prisma.emailLabel.findMany({
          where: { tenantId: account.tenantId, accountId: account.id },
          select: { id: true },
        })
      ).map((label) => label.id),
    );
    const validFolderIds = new Set(
      (
        await prisma.emailFolder.findMany({
          where: { tenantId: account.tenantId, accountId: account.id },
          select: { id: true },
        })
      ).map((folder) => folder.id),
    );

    let cursor = null;
    let processed = 0;
    let updated = 0;
    const touchedFolders = new Set();
    const touchedLabels = new Set();
    for (;;) {
      const emails = await prisma.email.findMany({
        where: {
          tenantId: account.tenantId,
          accountId: account.id,
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        include: { attachments: { select: { fileName: true } } },
      });
      if (emails.length === 0) break;
      for (const email of emails) {
        const result = evaluate(rules, {
          from: [email.fromName, email.fromAddress].filter(Boolean).join(" "),
          toCc: [addressJsonText(email.to), addressJsonText(email.cc)].filter(Boolean).join(" "),
          subject: email.subject || "",
          body: [email.textBody, email.preview].filter(Boolean).join(" "),
          attachmentNames: email.attachments.map((attachment) => attachment.fileName || "attachment"),
        });
        const labelIds = result.labelIds.filter((id) => validLabelIds.has(id));
        const nextFolderId = result.shouldDelete
          ? trash?.id || result.folderId
          : result.folderId && validFolderIds.has(result.folderId)
            ? result.folderId
            : null;
        if (labelIds.length === 0 && !nextFolderId && !result.isRead && !result.isFlagged) {
          processed += 1;
          continue;
        }
        for (const labelId of labelIds) {
          await prisma.emailLabelAssignment.upsert({
            where: { emailId_labelId: { emailId: email.id, labelId } },
            create: { tenantId: account.tenantId, emailId: email.id, labelId },
            update: {},
          });
          touchedLabels.add(labelId);
        }
        const data = {};
        if (nextFolderId && nextFolderId !== email.folderId) {
          data.folderId = nextFolderId;
        }
        if (result.isRead && !email.isRead) {
          data.isRead = true;
          data.readAt = new Date();
        }
        if (result.isFlagged && !email.isFlagged) data.isFlagged = true;
        if (Object.keys(data).length > 0) {
          let updateData = data;
          let skippedFolderMove = false;
          const requestedFolderId = typeof data.folderId === "string" ? data.folderId : null;
          if (requestedFolderId && email.uid != null) {
            const duplicateInTargetFolder = await prisma.email.findFirst({
              where: {
                tenantId: account.tenantId,
                accountId: account.id,
                folderId: requestedFolderId,
                uid: email.uid,
                NOT: { id: email.id },
              },
              select: { id: true },
            });
            if (duplicateInTargetFolder) {
              updateData = withoutFolderMove(updateData);
              skippedFolderMove = true;
              console.warn(
                `[mail-rules] письмо ${email.id} не перенесено: в целевой папке уже есть uid ${email.uid}`,
              );
            }
          }
          if (Object.keys(updateData).length > 0) {
            try {
              await prisma.email.update({ where: { id: email.id }, data: updateData });
            } catch (err) {
              if (!requestedFolderId || !isUniqueConstraintError(err)) throw err;
              updateData = withoutFolderMove(updateData);
              skippedFolderMove = true;
              if (Object.keys(updateData).length === 0) {
                console.warn(
                  `[mail-rules] письмо ${email.id} не обновлено: конфликт uid ${email.uid} при переносе`,
                );
              } else {
                await prisma.email.update({ where: { id: email.id }, data: updateData });
                console.warn(
                  `[mail-rules] письмо ${email.id} обновлено без переноса: конфликт uid ${email.uid} в целевой папке`,
                );
              }
            }
          }
          if (Object.keys(updateData).length > 0) updated += 1;
          if (requestedFolderId && !skippedFolderMove) {
            if (email.folderId) touchedFolders.add(email.folderId);
            touchedFolders.add(requestedFolderId);
          } else if (result.isRead && !email.isRead && email.folderId) {
            touchedFolders.add(email.folderId);
          }
        }
        processed += 1;
      }
      cursor = emails.at(-1).id;
    }
    await refreshCountersSequentially([...touchedFolders], (folderId) =>
      refreshFolderCounters(prisma, account.tenantId, folderId),
    );
    await refreshCountersSequentially([...touchedLabels], (labelId) =>
      refreshLabelCounters(prisma, account.tenantId, labelId),
    );
    console.log(
      `Проверено писем: ${processed}, обновлено писем: ${updated}, меток затронуто: ${touchedLabels.size} (${ctx.label})`,
    );
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
    console.warn(`[mail-rules] ${err.message}; пропускаю обратное применение правил.`);
    return;
  }
  console.error(err);
  process.exitCode = 1;
});
