import "server-only";
import { randomBytes } from "node:crypto";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { telegramSendMessage } from "@/lib/telegram-send-message";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant-constants";
import {
  resolveTelegramBotListCommand,
  telegramMenuLabelToCommand,
} from "@/lib/telegram-bot-menu-commands";
import {
  telegramReplyKeyboardMarkupForRole,
  tryTelegramBotListCommand,
} from "@/lib/telegram-bot-lists";
import {
  findCrmUserByTelegramIdForBot,
  findTenantAdminSharedTelegramForBot,
} from "@/lib/telegram-bot-resolve-user";
import { verifyAdminSharedMessengerBotStartToken } from "@/lib/admin-shared-messenger-bot-link";
import { verifyDoctorTelegramGroupBindToken } from "@/lib/doctor-telegram-group-bind";
import { telegramPeerIdToString } from "@/lib/telegram-json-ids";

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
export function normalizeBotCommandText(raw: string): string {
  let t = raw.trim().replace(/^\uFEFF/, "");
  /* U+FF0F fullwidth solidus, U+2215 division slash — иногда вместо `/` */
  t = t.replace(/^[\uFF0F\u2215]/, "/");
  return t;
}

export function firstCommandToken(text: string): string {
  const t = normalizeBotCommandText(text);
  const first = t.split(/\s+/)[0] ?? "";
  return (first.split("@")[0] ?? "").toLowerCase();
}

export function startPayload(text: string): string {
  const t = normalizeBotCommandText(text);
  const parts = t.split(/\s+/);
  if (parts.length < 2) return "";
  return parts.slice(1).join(" ").trim();
}

/** Сообщение с текстом: обычное, правка, бизнес-чат (Telegram Business). */
export function pickIncomingTextMessage(
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

const TELEGRAM_REPLY_KEYBOARD_REMOVE: Record<string, unknown> = {
  remove_keyboard: true,
};

async function reply(
  botToken: string,
  chatId: string,
  text: string,
  opts?: {
    parseMode?: "HTML";
    replyMarkup?: Record<string, unknown>;
  },
): Promise<boolean> {
  let r = await telegramSendMessage(botToken, chatId, text, opts);
  if (!r.ok && opts?.parseMode === "HTML") {
    const err = r.error.toLowerCase();
    if (err.includes("parse") || err.includes("entity") || err.includes("html")) {
      const plain = text
        .replace(/<a href="[^"]*">([^<]*)<\/a>/gi, "$1")
        .replace(/<\/?b>/gi, "")
        .replace(/<[^>]+>/g, "");
      r = await telegramSendMessage(botToken, chatId, plain, {
        replyMarkup: opts.replyMarkup,
      });
    }
  }
  if (!r.ok) {
    console.error("[telegram-bot] sendMessage failed", { chatId, error: r.error });
    return false;
  }
  return true;
}

async function replyRemoveKeyboard(
  botToken: string,
  chatId: string,
  text: string,
  opts?: { parseMode?: "HTML" },
): Promise<void> {
  await reply(botToken, chatId, text, {
    ...opts,
    replyMarkup: TELEGRAM_REPLY_KEYBOARD_REMOVE,
  });
}

async function replyWithRoleKeyboard(
  botToken: string,
  chatId: string,
  text: string,
  role: UserRole,
  allowGroupKeyboard: boolean,
  opts?: { parseMode?: "HTML" },
): Promise<void> {
  const kb = allowGroupKeyboard ? telegramReplyKeyboardMarkupForRole(role) : null;
  await reply(botToken, chatId, text, {
    ...opts,
    ...(kb ? { replyMarkup: kb } : {}),
  });
}

export async function processTelegramBotUpdate(
  update: Record<string, unknown>,
  botToken: string,
): Promise<void> {
  const msg = pickIncomingTextMessage(update);
  if (!msg) {
    const keys = Object.keys(update);
    const benignNonMessage =
      keys.includes("my_chat_member") ||
      keys.includes("chat_member") ||
      keys.includes("callback_query") ||
      keys.includes("pre_checkout_query") ||
      keys.includes("shipping_query");
    if (!benignNonMessage && typeof update.update_id === "number") {
      console.warn(
        "[telegram-bot] пропуск update: нет message/edited_message/business_message —",
        keys.join(", "),
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

  const chatId =
    chat != null ? telegramPeerIdToString(chat.id) : null;
  const chatType =
    chat && typeof chat.type === "string" ? String(chat.type) : "";
  const isPrivateChat = chatType === "private";
  let fromIdStr = from ? telegramPeerIdToString(from.id) : null;
  /* В приватном чате с ботом chat.id совпадает с пользователем; from иногда отсутствует в edge-case API. */
  if (fromIdStr == null && chatType === "private" && chatId != null) {
    fromIdStr = chatId;
  }
  if (!chatId || fromIdStr == null) {
    console.warn("[telegram-bot] пропуск: не удалось определить chatId или user id", {
      chatId,
      fromIdStr,
      chatType,
    });
    return;
  }

  const tgUserId = fromIdStr;
  const un = from && typeof from.username === "string" ? from.username.trim() : "";
  const tgUsername = un ? un.replace(/^@+/, "") : null;

  const menuAsCmd = telegramMenuLabelToCommand(textRaw);
  const text = menuAsCmd ?? normalizeBotCommandText(textRaw);
  const cmd = firstCommandToken(text);
  const listCmd = resolveTelegramBotListCommand(textRaw);

  if (isPrivateChat) {
    if (cmd === "/start") {
    const payload = startPayload(text);
    const shared = verifyAdminSharedMessengerBotStartToken(payload);
    if (payload.startsWith("sa_") && !shared.ok) {
      await replyRemoveKeyboard(
        botToken,
        chatId,
        "Ссылка привязки общего чата недействительна или истекла. Сгенерируйте новую в CRM.",
      );
      return;
    }
    if (shared.ok) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: shared.tenantId },
        select: { id: true, name: true },
      });
      if (!tenant) {
        await replyRemoveKeyboard(
          botToken,
          chatId,
          "Организация для привязки не найдена. Сгенерируйте ссылку заново в CRM.",
        );
        return;
      }
      const userUsing = await prisma.user.findFirst({
        where: { telegramId: tgUserId },
        select: { id: true },
      });
      if (userUsing) {
        await replyRemoveKeyboard(
          botToken,
          chatId,
          "Этот Telegram уже привязан к пользователю CRM. Для общего чата используйте отдельный Telegram-аккаунт.",
        );
        return;
      }
      const otherTenant = await prisma.tenant.findFirst({
        where: {
          adminSharedTelegramChatId: tgUserId,
          NOT: { id: tenant.id },
        },
        select: { id: true },
      });
      if (otherTenant) {
        await replyRemoveKeyboard(
          botToken,
          chatId,
          "Этот Telegram уже используется как общий админский чат в другой организации.",
        );
        return;
      }
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          adminSharedTelegramChatId: tgUserId,
          adminSharedTelegramUsername: tgUsername,
        },
      });
      await prisma.telegramBotLinkPending.deleteMany({
        where: { telegramUserId: tgUserId },
      });
      await replyRemoveKeyboard(
        botToken,
        chatId,
        `Готово. Этот Telegram подключён как общий админский чат CRM${tenant.name?.trim() ? ` («${tenant.name.trim()}»)` : ""}.`,
      );
      return;
    }
    const payloadTrim = payload.trim();
    if (payloadTrim.startsWith("dg_")) {
      const dg = verifyDoctorTelegramGroupBindToken(payloadTrim);
      if (!dg.ok) {
        await replyRemoveKeyboard(
          botToken,
          chatId,
          "Ссылка привязки группы недействительна или истекла. Сгенерируйте команду в карточке врача заново.",
        );
        return;
      }
      await replyRemoveKeyboard(
        botToken,
        chatId,
        "Привязка группы к врачу в CRM:\n\n1) Добавьте этого бота в нужную группу Telegram.\n2) В этой группе отправьте команду из карточки врача целиком (начинается с /start и содержит dg_…).\n\nКоманда действует ограниченное время — при необходимости сгенерируйте новую.",
      );
      return;
    }
    const slug = tenantSlugFromStartOrEnv(payload);
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!tenant) {
      await replyRemoveKeyboard(
        botToken,
        chatId,
        `Не найдена организация «${slug}». Откройте ссылку из профиля CRM или уточните /start у администратора.`,
      );
      return;
    }
    await replyRemoveKeyboard(
      botToken,
      chatId,
      "Привязка к CRM.\n\nОтправьте одним сообщением адрес электронной почты, который вы используете для входа в CRM (как при логине).",
    );
    await prisma.telegramBotLinkPending.upsert({
      where: { telegramUserId: tgUserId },
      create: { telegramUserId: tgUserId, tenantSlug: slug },
      update: { tenantSlug: slug },
    });
    return;
  }

    if (cmd === "/cancel") {
      await prisma.telegramBotLinkPending.deleteMany({
        where: { telegramUserId: tgUserId },
      });
      await replyRemoveKeyboard(botToken, chatId, "Ок, привязка отменена. Снова: /start");
      return;
    }
  }

  const linkedUser = await findCrmUserByTelegramIdForBot(tgUserId);
  const sharedTenant = linkedUser
    ? null
    : await findTenantAdminSharedTelegramForBot(tgUserId);

  const effectiveTenantId = linkedUser?.tenantId ?? sharedTenant?.tenantId ?? null;
  const effectiveRole: UserRole | null = linkedUser
    ? linkedUser.role
    : sharedTenant
      ? UserRole.MANAGER
      : null;

  if (listCmd) {
    if (!effectiveTenantId || !effectiveRole) {
      await reply(
        botToken,
        chatId,
        isPrivateChat
          ? "Сначала привяжите Telegram к CRM: /start и email из профиля."
          : "Команды отгрузок и сроков — в личном чате с ботом после привязки (/start).",
      );
      return;
    }
    try {
      const listReply = await tryTelegramBotListCommand({
        command: listCmd,
        tenantId: effectiveTenantId,
        role: effectiveRole,
      });
      if (listReply) {
        let sent = false;
        if (isPrivateChat) {
          const kb = telegramReplyKeyboardMarkupForRole(effectiveRole);
          sent = await reply(botToken, chatId, listReply.text, {
            parseMode: listReply.parseMode,
            ...(kb ? { replyMarkup: kb } : {}),
          });
        } else {
          sent = await reply(botToken, chatId, listReply.text, {
            parseMode: listReply.parseMode,
          });
        }
        if (!sent) {
          await reply(
            botToken,
            chatId,
            "Не удалось отправить ответ (ошибка Telegram API). Проверьте логи сервера.",
          );
        }
        return;
      }
    } catch (e) {
      console.error("[telegram-bot] list command failed", e);
      await reply(
        botToken,
        chatId,
        "Не удалось загрузить список. Попробуйте позже или обратитесь к администратору.",
      );
      return;
    }
  }

  /* Остальное — только личный чат (привязка, подсказки). */
  if (!isPrivateChat) {
    return;
  }

  if (effectiveTenantId && effectiveRole) {
    if (text.trim().startsWith("/")) {
      await replyWithRoleKeyboard(
        botToken,
        chatId,
        "Неизвестная команда. Отгрузки: /shiptd /shiptm /shipw. Сроки канбана: /dlinetd /dlinetm /dlinew. Или кнопки ниже.",
        effectiveRole,
        true,
      );
      return;
    }
  }

  const pending = await prisma.telegramBotLinkPending.findUnique({
    where: { telegramUserId: tgUserId },
  });
  if (!pending) {
    if (effectiveTenantId && effectiveRole) {
      await replyWithRoleKeyboard(
        botToken,
        chatId,
        "Выберите действие кнопкой ниже или команды: /shiptd /shiptm /shipw /dlinetd /dlinetm /dlinew. Привязка почты: /start.",
        effectiveRole,
        true,
      );
      return;
    }
    await reply(
      botToken,
      chatId,
      "Нажмите /start, чтобы привязать этот Telegram к учётной записи в CRM.",
    );
    return;
  }

  if (!looksLikeEmail(text)) {
    await replyRemoveKeyboard(
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
    await replyRemoveKeyboard(
      botToken,
      chatId,
      "Ошибка: организация не найдена. Начните с /start.",
    );
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
    await replyRemoveKeyboard(
      botToken,
      chatId,
      `Учётная запись с почтой ${email} не найдена в этой организации. Проверьте адрес или откройте ссылку из профиля на нужном поддомене.`,
    );
    return;
  }

  if (user.telegramId?.trim() === tgUserId) {
    await replyRemoveKeyboard(
      botToken,
      chatId,
      "Этот Telegram уже привязан к вашему профилю в CRM.",
    );
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
    await replyRemoveKeyboard(
      botToken,
      chatId,
      "Этот Telegram уже привязан к другой учётной записи. Сначала отвяжите его в CRM: профиль → Отвязать Telegram.",
    );
    return;
  }

  const reservedShared = await prisma.tenant.findFirst({
    where: { adminSharedTelegramChatId: tgUserId },
    select: { id: true },
  });
  if (reservedShared) {
    await replyRemoveKeyboard(
      botToken,
      chatId,
      "Этот Telegram используется как общий админский чат организации. Отвяжите его в конфигурации канбана или используйте другой аккаунт для личной привязки.",
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
  await replyRemoveKeyboard(
    botToken,
    chatId,
    `Найдена учётная запись: ${user.displayName}\n\nОткройте ссылку в браузере (желательно там, где вы уже вошли в CRM), чтобы подтвердить привязку:\n${url}\n\nСсылка действует ~15 минут. Если это не вы — не открывайте и напишите /cancel.`,
  );
}
