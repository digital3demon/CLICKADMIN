"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { UserRole } from "@prisma/client";
import { isKanbanOnlyUser } from "@/lib/auth/permissions";
import { APP_DISPLAY_NAME } from "@/lib/app-brand";
import { brandDisplayFont } from "@/lib/brand-font";
import { useNewOrderPanel } from "@/components/orders/new-order-panel-context";
import { SidebarAttention } from "./SidebarAttention";
import { SidebarDrafts } from "./SidebarDrafts";
import { SidebarNav } from "./SidebarNav";
import { isWorkdaySkyWidgetEnabled } from "@/lib/ui-flags";
import { ThemeToggle } from "./ThemeToggle";
import { writeClientStorageBucket } from "@/lib/client-storage-bucket";
import { profileAvatarEmoji } from "@/lib/profile-avatar-presets";
import { CRM_PROFILE_AVATAR_CHANGED_EVENT } from "@/lib/crm-client-events";

const WorkdaySunMoon = dynamic(
  () =>
    import("@/components/brand/WorkdaySunMoon").then((m) => ({
      default: m.WorkdaySunMoon,
    })),
  {
    ssr: false,
    loading: () => (
      <span
        className="inline-flex h-[6.75rem] w-[6.75rem] shrink-0"
        aria-hidden
      />
    ),
  },
);

export function Sidebar() {
  const router = useRouter();
  const { open: openNewOrder, canOpen } = useNewOrderPanel();
  const [sessionUser, setSessionUser] = useState<{
    email: string;
    displayName: string;
    role: UserRole;
    avatarPresetId: string | null;
    avatarCustomUploadedAt: string | null;
  } | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [singleUserMode, setSingleUserMode] = useState(false);
  const [shellShort, setShellShort] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-height: 560px)");
    const apply = () => setShellShort(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const loadSessionUser = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch("/api/auth/session", {
      cache: "no-store",
      ...(signal ? { signal } : {}),
    });
    const j = (await res.json()) as {
      singleUser?: boolean;
      demo?: boolean;
      user?: {
        email?: string;
        displayName?: string;
        role?: UserRole;
        avatarPresetId?: string | null;
        avatarCustomUploadedAt?: string | null;
      } | null;
    };
    setSingleUserMode(Boolean(j.singleUser));
    setIsDemo(Boolean(j.demo));
    writeClientStorageBucket(j.demo ? "demo" : "live");
    const u = j.user;
    if (u?.email && u.displayName != null && u.role) {
      setSessionUser({
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        avatarPresetId: u.avatarPresetId ?? null,
        avatarCustomUploadedAt: u.avatarCustomUploadedAt ?? null,
      });
    } else {
      setSessionUser(null);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        await loadSessionUser(ac.signal);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setSessionUser(null);
        setSingleUserMode(false);
        setIsDemo(false);
        writeClientStorageBucket("live");
      }
    })();
    return () => ac.abort();
  }, [loadSessionUser]);

  useEffect(() => {
    const onAvatar = () => {
      void loadSessionUser();
    };
    window.addEventListener(CRM_PROFILE_AVATAR_CHANGED_EVENT, onAvatar);
    return () => window.removeEventListener(CRM_PROFILE_AVATAR_CHANGED_EVENT, onAvatar);
  }, [loadSessionUser]);

  const logout = useCallback(async () => {
    try {
      if (isDemo) {
        await fetch("/api/demo/exit", {
          method: "POST",
          credentials: "include",
        });
      } else {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      }
    } catch {
      /* ignore */
    }
    writeClientStorageBucket("live");
    router.replace("/login");
    router.refresh();
  }, [router, isDemo]);

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col text-[var(--sidebar-text-strong)]">
      <div className="relative min-w-0 shrink-0 px-5 pb-5 pt-6 shell-short:px-4 shell-short:pb-2 shell-short:pt-3">
        {isWorkdaySkyWidgetEnabled() ? (
          <div
            className="pointer-events-none absolute -left-1 -top-1 z-0 h-[7.5rem] w-[7.75rem] overflow-hidden rounded-br-[2.75rem] shell-short:h-[4.25rem] shell-short:w-[4.5rem] shell-short:rounded-br-[1.25rem]"
            aria-hidden
          >
            <div className="-ml-2 -mt-2 pointer-events-auto shell-short:-ml-1 shell-short:-mt-1">
              <WorkdaySunMoon
                variant="corner"
                className="text-[var(--sidebar-blue)] opacity-[0.94] shell-short:scale-[0.55] shell-short:origin-top-left"
              />
            </div>
          </div>
        ) : null}

        <Link
          href={
            sessionUser && isKanbanOnlyUser(sessionUser.role)
              ? "/kanban"
              : "/"
          }
          className="relative z-10 mx-auto block w-full min-w-0 max-w-full text-center outline-offset-2 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sidebar-blue)]"
          title={
            sessionUser && isKanbanOnlyUser(sessionUser.role)
              ? "На канбан"
              : `На стартовый экран · ${APP_DISPLAY_NAME}`
          }
        >
          <span
            className={`relative z-20 block w-full min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[1.35rem] font-light leading-snug tracking-[0.04em] text-[var(--sidebar-text-strong)] shell-short:text-[1.05rem] shell-short:leading-tight shell-short:tracking-[0.02em] [@media(min-width:1024px)_and_(min-height:560px)]:text-[clamp(0.62rem,calc(((100vw/7)-2.75rem)/9),1.12rem)] [@media(min-width:1024px)_and_(min-height:560px)]:leading-tight [@media(min-width:1024px)_and_(min-height:560px)]:tracking-[0.05em] ${brandDisplayFont.className}`}
            style={{ textShadow: "var(--sidebar-title-shadow)" }}
          >
            {APP_DISPLAY_NAME}
          </span>
        </Link>

        {sessionUser && isKanbanOnlyUser(sessionUser.role) ? null : (
          <button
            type="button"
            disabled={!canOpen}
            title={
              canOpen
                ? "Новый заказ"
                : "Открыто максимум окон нового заказа (5). Закройте или сверните одно."
            }
            className={`pressable-tap mt-5 flex w-full items-center justify-center rounded-md px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-white transition-colors shell-short:mt-2 shell-short:px-2 shell-short:py-2 shell-short:text-[9px] shell-short:tracking-[0.06em] ${
              canOpen
                ? "cursor-pointer bg-[var(--sidebar-blue)] hover:bg-[var(--sidebar-blue-hover)]"
                : "cursor-not-allowed bg-zinc-400 dark:bg-zinc-600"
            }`}
            onClick={() => {
              if (canOpen) openNewOrder();
            }}
          >
            Новый заказ
          </button>
        )}
      </div>

      <div className="mx-5 h-px bg-[var(--sidebar-border)]" aria-hidden />

      <div
        id="sidebar-main-stack"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <SidebarNav />

        {sessionUser && isKanbanOnlyUser(sessionUser.role) ? null : (
          <>
            <SidebarAttention />
            <SidebarDrafts />
          </>
        )}
      </div>

      <div className="mt-auto shrink-0 border-t border-[var(--sidebar-border)] px-4 py-3 dark:bg-black/25 shell-short:px-3 shell-short:py-2">
        <div className="flex items-start gap-2 shell-short:gap-1.5">
          {sessionUser ? (
            <>
              <div
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--sidebar-border)] bg-black/10 text-xl dark:bg-white/10"
                aria-hidden
              >
                {sessionUser.avatarCustomUploadedAt ? (
                  <img
                    src={`/api/me/avatar?t=${encodeURIComponent(sessionUser.avatarCustomUploadedAt)}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{profileAvatarEmoji(sessionUser.avatarPresetId)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1 px-1 text-xs leading-snug text-[var(--sidebar-text)] shell-short:text-[10px]">
              <div className="font-medium text-[var(--sidebar-text-strong)]">
                {sessionUser.displayName}
              </div>
              <div className="truncate opacity-90" title={sessionUser.email}>
                {sessionUser.email}
              </div>
              {singleUserMode ? (
                <div className="mt-1 text-[10px] text-[var(--sidebar-text)] opacity-80">
                  Одна рабочая станция, без входа
                </div>
              ) : null}
              {isDemo ? (
                <div className="mt-1 rounded-md border border-amber-400/50 bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-950 dark:text-amber-100">
                  Демо: отдельная база. «Выйти» — сброс демо к исходным данным.
                </div>
              ) : null}
            </div>
            </>
          ) : (
            <div className="min-w-0 flex-1" />
          )}
          <ThemeToggle compact={shellShort} />
        </div>
        {singleUserMode ? null : (
          <button
            type="button"
            title={isDemo ? "Выйти из демо и сбросить демо-базу" : "Выйти"}
            aria-label={isDemo ? "Выйти из демо" : "Выйти"}
            onClick={() => void logout()}
            className="mt-2 w-full rounded-md px-2 py-2.5 text-left text-sm font-medium text-[var(--sidebar-text-strong)] transition-colors hover:bg-black/[0.06] dark:hover:bg-white/10"
          >
            {isDemo ? "Выйти из демо" : "Выйти"}
          </button>
        )}
      </div>
    </div>
  );
}
