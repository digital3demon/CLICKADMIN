import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { telegramIdString } from "@/lib/auth/telegram-widget";
import { telegramSendMessage } from "@/lib/telegram-send-message";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant-constants";

const LINK_TTL_MS = 15 * 60 * 1000;

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function looksLikeEmail(s: string): boolean {
  const t = s.trim().toLowerCase();
  return t.length > 3 && t.length < 254 && EMAIL_RE.test(t);
}

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

/** Текст входящего сообщения: команды, в т.ч. с «косой» не из ASCII-клавиатуры. */
function normalizeBotCommandText(raw: string): string {
  let t = raw.trim().replace(/^\uFEFF/, "");
  /* U+FF0F fullwidth solidus, U+2215 division slash — иногда вместо `/` */
  t = t.replace(/^[\uFF0F\u2215]/, "/");
  return t;
}

function firstCommandToken(text: string): string {
  const t = normalizeBotCommandText(text);
  const first = t.split(/\s+/)[0] ?? "";
  return (first.split("@")[0] ?? "").toLowerCase();
}

function startPayload(text: string): string {
  const t = normalizeBotCommandText(text);
  const parts = t.split(/\s+/);
  if (parts.length < 2) return "";
  return parts.slice(1).join(" ").trim();
}

/** Сообщение с текстом: обычное, правка, бизнес-чат (Telegram Business). */
function pickIncomingTextMessage(
  update: Record<string, unknown>,
): Record<string, unknown> | null {
  const keys = [
    "message",
    "edited_message",
    "business_message",
    "edited_business_message",
  ] as const;
  for (const k of keys) {
    const m = update[k];
    if (m && typeof m === "object") return m as Record<string, unknown>;
  }
  return null;
}

function tenantSlugFromStartOrEnv(payload: string): string {
  const p = payload.trim();
  if (p.length > 0 && p.length <= 64) return p;
  return process.env.CRM_DEFAULT_TENANT_SLUG?.trim() || DEFAULT_TENANT_SLUG;
}

async function reply(botToken: string, chatId: string, text: string): Promise<void> {
  const r = await telegramSendMessage(botToken, chatId, text);
  if (!r.ok) {
    console.error("[telegram-bot] sendMessage failed", { chatId, error: r.error });
  }
}

/** id в JSON — число или строка (после прокси/обвязки). */
function asTelegramNumericId(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (!/^-?\d+$/.test(t)) return null;
    const n = Number(t);
    if (!Number.isFinite(n) || !Number.isSafeInteger(n)) return null;
    return n;
  }
  return null;
}

export async function processTelegramBotUpdate(
  update: Record<string, unknown>,
  botToken: string,
): Promise<void> {
  const msg = pickIncomingTextMessage(update);
  if (!msg) {
    if (typeof update.update_id === "number") {
      console.warn(
        "[telegram-bot] пропуск update: нет message/edited_message/business_message —",
        Object.keys(update).join(", "),
      );
    }
    return;
  }

  const chat = msg.chat as Record<string, unknown> | undefined;
  const from = msg.from as Record<string, unknown> | undefined;
  const textRaw = msg.text;
  if (typeof textRaw !== "string") {
    console.warn(
      "[telegram-bot] пропуск: нет msg.text, поля сообщения:",
      Object.keys(msg).join(", "),
    );
    return;
  }

  const chatIdNum = chat ? asTelegramNumericId(chat.id) : null;
  const chatId = chatIdNum != null ? String(chatIdNum) : null;
  let fromId = from ? asTelegramNumericId(from.id) : null;
  const chatType =
    chat && typeof chat.type === "string" ? String(chat.type) : "";
  /* В приватном чате с ботом chat.id совпадает с пользователем; from иногда отсутствует в edge-case API. */
  if (fromId == null && chatType === "private" && chatIdNum != null) {
    fromId = chatIdNum;
  }
  if (!chatId || fromId == null) {
    console.warn("[telegram-bot] пропуск: не удалось определить chatId или user id", {
      chatId,
      fromId,
      chatType,
    });
    return;
  }

  const tgUserId = telegramIdString(fromId);
  const un = from && typeof from.username === "string" ? from.username.trim() : "";
  const tgUsername = un ? un.replace(/^@+/, "") : null;

  const text = normalizeBotCommandText(textRaw);
  const cmd = firstCommandToken(text);

  if (cmd === "/start") {
    const slug = tenantSlugFromStartOrEnv(startPayload(text));
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tenant) {
      await reply(
        botToken,
        chatId,
        `Не найдена организация «${slug}». Откройте ссылку из профиля CRM или уточните /start у администратора.`,
      );
      return;
    }
    await prisma.telegramBotLinkPending.upsert({
      where: { telegramUserId: tgUserId },
      create: { telegramUserId: tgUserId, tenantSlug: slug },
      update: { tenantSlug: slug },
    });
    await reply(
      botToken,
      chatId,
      "Привязка к CRM.\n\nОтправьте одним сообщением адрес электронной почты, который вы используете для входа в CRM (как при логине).",
    );
    return;
  }

  if (cmd === "/cancel") {
    await prisma.telegramBotLinkPending.deleteMany({
      where: { telegramUserId: tgUserId },
    });
    await reply(botToken, chatId, "Ок, привязка отменена. Снова: /start");
    return;
  }

  const pending = await prisma.telegramBotLinkPending.findUnique({
    where: { telegramUserId: tgUserId },
  });
  if (!pending) {
    await reply(
      botToken,
      chatId,
      "Нажмите /start, чтобы привязать этот Telegram к учётной записи в CRM.",
    );
    return;
  }

  if (!looksLikeEmail(text)) {
    await reply(
      botToken,
      chatId,
      "Похоже, это не email. Отправьте адрес вида name@company.ru или /cancel.",
    );
    return;
  }

  const email = normalizeEmail(text);
  const tenant = await prisma.tenant.findUnique({
    where: { slug: pending.tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    await reply(botToken, chatId, "Ошибка: организация не найдена. Начните с /start.");
    return;
  }

  const user = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email },
    select: {
      id: true,
      telegramId: true,
      displayName: true,
    },
  });
  if (!user) {
    await reply(
      botToken,
      chatId,
      `Учётная запись с почтой ${email} не найдена в этой организации. Проверьте адрес или откройте ссылку из профиля на нужном поддомене.`,
    );
    return;
  }

  if (user.telegramId?.trim() === tgUserId) {
    await reply(botToken, chatId, "Этот Telegram уже привязан к вашему профилю в CRM.");
    await prisma.telegramBotLinkPending.deleteMany({
      where: { telegramUserId: tgUserId },
    });
    return;
  }

  const taken = await prisma.user.findFirst({
    where: { telegramId: tgUserId, NOT: { id: user.id } },
    select: { id: true },
  });
  if (taken) {
    await reply(
      botToken,
      chatId,
      "Этот Telegram уже привязан к другой учётной записи. Сначала отвяжите его в CRM: профиль → Отвязать Telegram.",
    );
    return;
  }

  const base = crmPublicBaseUrl();
  if (!base || base === "http://localhost:3000") {
    console.warn("[telegram-bot] CRM_PUBLIC_BASE_URL не задан — ссылка может быть неверной.");
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + LINK_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.telegramLinkToken.deleteMany({
      where: { telegramUserId: tgUserId, consumedAt: null },
    });
    await tx.telegramLinkToken.create({
      data: {
        token,
        userId: user.id,
        tenantId: tenant.id,
        telegramUserId: tgUserId,
        telegramUsername: tgUsername,
        expiresAt,
      },
    });
  });

  await prisma.telegramBotLinkPending.deleteMany({
    where: { telegramUserId: tgUserId },
  });

  const url = `${base}/login/telegram-link/confirm?token=${encodeURIComponent(token)}`;
  await reply(
    botToken,
    chatId,
    `Найдена учётная запись: ${user.displayName}\n\nОткройте ссылку в браузере (желательно там, где вы уже вошли в CRM), чтобы подтвердить привязку:\n${url}\n\nСсылка действует ~15 минут. Если это не вы — не открывайте и напишите /cancel.`,
  );
}
