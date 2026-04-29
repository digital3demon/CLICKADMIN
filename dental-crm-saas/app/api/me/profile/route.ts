import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getPrisma } from "@/lib/get-prisma";
import { Prisma } from "@prisma/client";
import { isProfileAvatarPresetId } from "@/lib/profile-avatar-presets";
import { clampOrdersPageSize } from "@/lib/orders-list-cursor";
import {
  mergeKanbanTelegramPrefs,
  parseKanbanTelegramPrefsPatch,
  type KanbanTelegramPrefKey,
} from "@/lib/kanban-telegram-prefs";

export const dynamic = "force-dynamic";

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

function profileUserJson(
  user: {
    id: string;
    displayName: string;
    email: string;
    avatarPresetId: string | null;
    avatarCustomMime: string | null;
    avatarCustomUploadedAt: Date | null;
    mentionHandle: string | null;
    ordersListPageSize: number | null;
    telegramId: string | null;
    telegramUsername: string | null;
    telegramKanbanNotifyPrefs: Prisma.JsonValue | null;
  },
) {
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

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const prisma = await getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
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
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
  return NextResponse.json({ user: profileUserJson(user) });
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
    const db = await getPrisma();
    const cur = await db.user.findUnique({
      where: { id: session.sub },
      select: { telegramKanbanNotifyPrefs: true },
    });
    const merged = mergeKanbanTelegramPrefs(cur?.telegramKanbanNotifyPrefs);
    for (const k of Object.keys(parsed) as KanbanTelegramPrefKey[]) {
      const v = parsed[k];
      if (typeof v === "boolean") merged[k] = v;
    }
    userPatch.telegramKanbanNotifyPrefs = merged;
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
    const db = await getPrisma();
    const user = await db.user.update({
      where: { id: session.sub },
      data: userPatch,
      select: {
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
      },
    });
    return NextResponse.json({ user: profileUserJson(user) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const tgt = e.meta?.target;
      const targetList = Array.isArray(tgt) ? tgt : tgt != null ? [tgt] : [];
      if (targetList.some((x) => String(x) === "mentionHandle")) {
        return NextResponse.json(
          { error: "Этот ник уже занят. Выберите другой." },
          { status: 409 },
        );
      }
    }
    console.error("[me/profile]", e);
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 });
  }
}
