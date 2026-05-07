import "server-only";
import { DoctorMessengerItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyDoctorTelegramGroupBindToken } from "@/lib/doctor-telegram-group-bind";
import {
  pickIncomingTextMessage,
  firstCommandToken,
  normalizeBotCommandText,
  startPayload,
} from "@/lib/telegram-bot-process-update";
import {
  splitAroundClicklabAdmin,
  textIncludesClicklabAdminMention,
} from "@/lib/telegram-clicklab-admin-mention";
import { telegramSendMessage } from "@/lib/telegram-send-message";

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

function chatIdString(chat: Record<string, unknown> | undefined): string | null {
  const id = chat ? asTelegramNumericId(chat.id) : null;
  return id != null ? String(id) : null;
}

async function reply(botToken: string, chatId: string, text: string): Promise<void> {
  const r = await telegramSendMessage(botToken, chatId, text);
  if (!r.ok) {
    console.error("[telegram doctor messenger] sendMessage failed", r.error);
  }
}

function bindPayloadFromText(fullText: string, cmd: string): string | null {
  const t = normalizeBotCommandText(fullText);
  if (cmd === "/start") {
    const p = startPayload(t);
    return p.trim().startsWith("dg_") ? p.trim() : null;
  }
  const m = /^\/binddoctor(?:@\S+)?\s+(.+)$/i.exec(t);
  return m ? m[1]!.trim() : null;
}

/**
 * Группы и супергруппы: привязка чата к врачу по токену и захват @clicklab_admin.
 * Личные чаты не обрабатываются — вернуть false.
 * Для групп после попытки обработки вернуть true (не передавать в общий диалог бота).
 */
export async function tryTelegramDoctorGroupsAndMessenger(
  update: Record<string, unknown>,
  botToken: string,
): Promise<boolean> {
  const msg = pickIncomingTextMessage(update);
  if (!msg || typeof msg !== "object") return false;

  const chat = msg.chat as Record<string, unknown> | undefined;
  const chatType =
    chat && typeof chat.type === "string" ? String(chat.type) : "";
  if (chatType !== "group" && chatType !== "supergroup") return false;

  const chatIdStr = chatIdString(chat);
  if (!chatIdStr) return true;

  const textRaw =
    typeof msg.text === "string"
      ? msg.text
      : typeof msg.caption === "string"
        ? msg.caption
        : "";
  if (!textRaw.trim()) return true;

  const text = normalizeBotCommandText(textRaw);
  const cmd = firstCommandToken(text);

  const bindPayload = bindPayloadFromText(textRaw, cmd);
  if (bindPayload) {
    const v = verifyDoctorTelegramGroupBindToken(bindPayload);
    if (!v.ok) {
      await reply(
        botToken,
        chatIdStr,
        "Не удалось привязать группу: ссылка недействительна или истекла. Сгенерируйте команду заново в карточке врача.",
      );
      return true;
    }

    const doctor = await prisma.doctor.findFirst({
      where: {
        id: v.doctorId,
        tenantId: v.tenantId,
        deletedAt: null,
      },
      select: { id: true, fullName: true },
    });
    if (!doctor) {
      await reply(botToken, chatIdStr, "Врач для привязки не найден.");
      return true;
    }

    const existingChat = await prisma.doctorTelegramGroup.findUnique({
      where: {
        tenantId_telegramChatId: {
          tenantId: v.tenantId,
          telegramChatId: chatIdStr,
        },
      },
      select: { id: true, doctorId: true },
    });
    if (existingChat && existingChat.doctorId !== doctor.id) {
      await reply(
        botToken,
        chatIdStr,
        "Эта группа уже привязана к другому врачу в CRM.",
      );
      return true;
    }

    await prisma.doctorTelegramGroup.upsert({
      where: {
        tenantId_telegramChatId: {
          tenantId: v.tenantId,
          telegramChatId: chatIdStr,
        },
      },
      create: {
        tenantId: v.tenantId,
        doctorId: doctor.id,
        telegramChatId: chatIdStr,
      },
      update: { doctorId: doctor.id },
    });

    await reply(
      botToken,
      chatIdStr,
      `Готово. Группа привязана к врачу «${doctor.fullName}» в CRM.`,
    );
    return true;
  }

  if (!textIncludesClicklabAdminMention(textRaw)) return true;

  const resolvedGroup = await prisma.doctorTelegramGroup.findFirst({
    where: { telegramChatId: chatIdStr },
    select: {
      id: true,
      tenantId: true,
      doctorId: true,
      doctor: { select: { fullName: true, deletedAt: true } },
    },
  });

  if (!resolvedGroup || resolvedGroup.doctor.deletedAt) {
    await reply(
      botToken,
      chatIdStr,
      "Эта группа не привязана к врачу в CRM. Откройте карточку врача и выполните команду привязки.",
    );
    return true;
  }

  const split = splitAroundClicklabAdmin(textRaw);
  const before = split?.before ?? "";
  const after = split?.after ?? "";

  const from = msg.from as Record<string, unknown> | undefined;
  const fromId = from ? asTelegramNumericId(from.id) : null;
  const fromUserStr = fromId != null ? String(fromId) : null;
  const un =
    from && typeof from.username === "string"
      ? from.username.trim().replace(/^@+/, "")
      : "";

  const midRaw = msg.message_id;
  const messageIdNum =
    typeof midRaw === "number"
      ? midRaw
      : typeof midRaw === "string"
        ? Number(midRaw)
        : NaN;
  if (!Number.isFinite(messageIdNum)) return true;
  const messageIdStr = String(Math.trunc(messageIdNum));

  try {
    await prisma.doctorMessengerItem.create({
      data: {
        tenantId: resolvedGroup.tenantId,
        doctorId: resolvedGroup.doctorId,
        doctorTelegramGroupId: resolvedGroup.id,
        telegramChatId: chatIdStr,
        telegramMessageId: messageIdStr,
        fromTgUserId: fromUserStr,
        fromTgUsername: un || null,
        textFull: textRaw,
        snippetBefore: before,
        snippetAfter: after,
        status: DoctorMessengerItemStatus.OPEN,
      },
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code?: string }).code : "";
    if (code === "P2002") {
      /* дубликат того же сообщения */
      return true;
    }
    console.error("[telegram doctor messenger] create item", e);
    return true;
  }

  return true;
}
