import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getPrisma } from "@/lib/get-prisma";
import { isProfileAvatarPresetId } from "@/lib/profile-avatar-presets";
import { clampOrdersPageSize } from "@/lib/orders-list-cursor";
import {
  mergeKanbanTelegramPrefs,
  parseKanbanTelegramPrefsPatch,
  type KanbanTelegramPrefKey,
} from "@/lib/kanban-telegram-prefs";
import { dbRequestUserHint } from "@/lib/db-request-error-hint";

export const dynamic = "force-dynamic";

const ME_PROFILE_SELECT = {
  id: true,
  displayName: true,
  email: true,
  avatarPresetId: true,
  avatarCustomMime: true,
  avatarCustomUploadedAt: true,
  mentionHandle: true,
  ordersListPageSize: true,
  telegramId: true,
  telegramUsername: true,
  telegramKanbanNotifyPrefs: true,
} as const;

type MeProfileUser = Prisma.UserGetPayload<{ select: typeof ME_PROFILE_SELECT }>;

function normalizeMentionHandle(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (!s) return null;
  if (s.startsWith("@")) s = s.slice(1);
  s = s.toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(s)) {
    throw new Error(
      "Ник: 3–32 символа, латиница, цифры и подчёркивание (без пробелов).",
    );
  }
  return s;
}

function profileUserJson(user: MeProfileUser) {
  const {
    telegramId: _tid,
    telegramUsername,
    telegramKanbanNotifyPrefs,
    ...rest
  } = user;
  return {
    ...rest,
    telegramLinked: Boolean(_tid?.trim()),
    telegramUsername,
    telegramKanbanNotifyPrefs: mergeKanbanTelegramPrefs(telegramKanbanNotifyPrefs),
  };
}

function p2002ProfileMessage(meta: unknown): string | null {
  const m = meta as { target?: unknown } | null;
  const tgt = m?.target;
  const parts = Array.isArray(tgt) ? tgt.map(String) : tgt != null ? [String(tgt)] : [];
  const blob = `${parts.join(" ")} ${JSON.stringify(meta ?? {})}`.toLowerCase();
  if (blob.includes("mentionhandle")) {
    return "Этот ник уже занят. Выберите другой.";
  }
  if (blob.includes("phone")) {
    return "Этот номер телефона уже привязан к другому пользователю.";
  }
  if (blob.includes("telegramid")) {
    return "Этот Telegram уже привязан к другому пользователю.";
  }
  if (blob.includes("email") || blob.includes("tenantid")) {
    return "Конфликт уникальности данных (почта или организация).";
  }
  return null;
}

async function updateUserOnceWithRetry(
  db: PrismaClient,
  userId: string,
  data: Prisma.UserUpdateInput,
): Promise<MeProfileUser> {
  const transient = (msg: string) =>
    /database is locked|SQLITE_BUSY|timed out during query execution/i.test(msg);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await db.user.update({
        where: { id: userId },
        data,
        select: ME_PROFILE_SELECT,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === 0 && transient(msg)) {
        await new Promise((r) => setTimeout(r, 120));
        continue;
      }
      throw err;
    }
  }
  throw new Error("updateUserOnceWithRetry: unreachable");
}

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  try {
    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: ME_PROFILE_SELECT,
    });
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }
    return NextResponse.json({ user: profileUserJson(user) });
  } catch (e) {
    console.error("[me/profile] GET", e);
    return NextResponse.json(
      {
        error: dbRequestUserHint(
          e,
          "Не удалось загрузить профиль. Проверьте DATABASE_URL и логи сервера.",
        ),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (session.demo) {
    return NextResponse.json(
      { error: "В демо-режиме профиль не сохраняется" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const db = await getPrisma();
  const userPatch: Prisma.UserUpdateInput = {};

  if (body.displayName !== undefined) {
    const dn = String(body.displayName ?? "").trim();
    if (dn.length < 1 || dn.length > 120) {
      return NextResponse.json(
        { error: "Имя для отображения: от 1 до 120 символов." },
        { status: 400 },
      );
    }
    userPatch.displayName = dn;
  }

  if (body.avatarPresetId !== undefined) {
    const v = body.avatarPresetId;
    if (v === null || v === "") {
      userPatch.avatarPresetId = null;
    } else if (typeof v === "string" && isProfileAvatarPresetId(v)) {
      userPatch.avatarPresetId = v;
    } else {
      return NextResponse.json({ error: "Некорректный пресет аватара" }, { status: 400 });
    }
  }

  if (body.ordersListPageSize !== undefined) {
    const v = body.ordersListPageSize;
    if (v === null) {
      userPatch.ordersListPageSize = null;
    } else if (typeof v === "number" && Number.isFinite(v)) {
      userPatch.ordersListPageSize = clampOrdersPageSize(String(Math.trunc(v)));
    } else if (typeof v === "string" && String(v).trim()) {
      userPatch.ordersListPageSize = clampOrdersPageSize(String(v).trim());
    } else {
      return NextResponse.json(
        { error: "Размер страницы списка заказов: целое число или null." },
        { status: 400 },
      );
    }
  }

  if (body.mentionHandle !== undefined) {
    const raw = body.mentionHandle;
    if (raw === null || raw === "") {
      userPatch.mentionHandle = null;
    } else {
      try {
        userPatch.mentionHandle = normalizeMentionHandle(raw);
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Некорректный ник" },
          { status: 400 },
        );
      }
    }
  }

  if (body.telegramKanbanNotifyPrefs !== undefined) {
    const parsed = parseKanbanTelegramPrefsPatch(body.telegramKanbanNotifyPrefs);
    if (parsed === null) {
      return NextResponse.json(
        { error: "Некорректные настройки уведомлений Telegram" },
        { status: 400 },
      );
    }
    const cur = await db.user.findUnique({
      where: { id: session.sub },
      select: { telegramKanbanNotifyPrefs: true },
    });
    const merged = mergeKanbanTelegramPrefs(cur?.telegramKanbanNotifyPrefs);
    for (const k of Object.keys(parsed) as KanbanTelegramPrefKey[]) {
      const v = parsed[k];
      if (typeof v === "boolean") merged[k] = v;
    }
    userPatch.telegramKanbanNotifyPrefs = merged as Prisma.InputJsonValue;
  }

  if (body.telegramUnlink === true) {
    userPatch.telegramId = null;
    userPatch.telegramUsername = null;
    userPatch.telegramKanbanNotifyPrefs = Prisma.JsonNull;
  }

  if (Object.keys(userPatch).length === 0) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
  }

  try {
    const user = await updateUserOnceWithRetry(db, session.sub, userPatch);
    try {
      return NextResponse.json({ user: profileUserJson(user) });
    } catch (e) {
      console.error("[me/profile] profileUserJson", e);
      return NextResponse.json(
        {
          error:
            "Профиль сохранён, но ответ не сформирован. Обновите страницу.",
        },
        { status: 500 },
      );
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025") {
        return NextResponse.json(
          {
            error:
              "Учётная запись не найдена в базе. Выйдите и войдите снова.",
          },
          { status: 401 },
        );
      }
      if (e.code === "P2002") {
        const msg = p2002ProfileMessage(e.meta);
        if (msg) {
          return NextResponse.json({ error: msg }, { status: 409 });
        }
      }
    }
    if (e instanceof Prisma.PrismaClientValidationError) {
      console.error("[me/profile] validation", e.message);
      return NextResponse.json(
        {
          error:
            "Некорректные данные для сохранения. Проверьте ник (@латиница), имя и аватар.",
        },
        { status: 400 },
      );
    }
    if (e instanceof Prisma.PrismaClientUnknownRequestError) {
      if (/database is locked|SQLITE_BUSY|timed out/i.test(e.message)) {
        return NextResponse.json(
          {
            error:
              "База данных временно занята. Закройте другие вкладки с CRM или Prisma Studio и повторите.",
          },
          { status: 503 },
        );
      }
    }
    console.error("[me/profile] PATCH", e);
    return NextResponse.json(
      {
        error: dbRequestUserHint(e, "Не удалось сохранить профиль. Проверьте логи сервера."),
      },
      { status: 500 },
    );
  }
}
