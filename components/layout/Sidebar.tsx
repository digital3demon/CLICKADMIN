"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { AppModule, UserRole } from "@prisma/client";
import {
  canAccessSidebarPayments,
  isKanbanOnlyUser,
} from "@/lib/auth/permissions";
import { APP_DISPLAY_NAME } from "@/lib/app-brand";
import { brandDisplayFont } from "@/lib/brand-font";
import { useNewOrderPanel } from "@/components/orders/new-order-panel-context";
import { SidebarDrafts } from "./SidebarDrafts";
import { SidebarMessengers } from "./SidebarMessengers";
import { SidebarPayments } from "./SidebarPayments";
import { SidebarNav } from "./SidebarNav";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { isWorkdaySkyWidgetEnabled } from "@/lib/ui-flags";
import { ThemeToggle } from "./ThemeToggle";
import { writeClientStorageBucket } from "@/lib/client-storage-bucket";
import { profileAvatarEmoji } from "@/lib/profile-avatar-presets";
import { CRM_PROFILE_UPDATED_EVENT } from "@/lib/crm-client-events";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import { fontDisplay } from "@/lib/app-fonts";
import { LogOut } from "lucide-react";

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
  const uiDesign = useUiDesign();
  const isHarmony = uiDesign === "harmony";
  const router = useRouter();
  const { open: openNewOrder, canOpen, canCreate } = useNewOrderPanel();
  const [sessionUser, setSessionUser] = useState<{
    email: string;
    displayName: string;
    role: UserRole;
    actualRole: UserRole;
    avatarPresetId: string | null;
    avatarCustomUploadedAt: string | null;
    moduleAccess: Partial<Record<AppModule, boolean>> | null;
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
        actualRole?: UserRole;
        avatarPresetId?: string | null;
        avatarCustomUploadedAt?: string | null;
        moduleAccess?: Record<string, boolean> | null;
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
        actualRole: u.actualRole ?? u.role,
        avatarPresetId: u.avatarPresetId ?? null,
        avatarCustomUploadedAt: u.avatarCustomUploadedAt ?? null,
        moduleAccess: (u.moduleAccess as Partial<Record<AppModule, boolean>> | null) ?? null,
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
    const onProfileUpdated = () => {
      void loadSessionUser();
    };
    window.addEventListener(CRM_PROFILE_UPDATED_EVENT, onProfileUpdated);
    return () =>
      window.removeEventListener(CRM_PROFILE_UPDATED_EVENT, onProfileUpdated);
  }, [loadSessionUser]);
  const isActualOwner = sessionUser?.actualRole === "OWNER";
  const isEffectiveKanbanOnly =
    sessionUser != null &&
    !isActualOwner &&
    isKanbanOnlyUser(sessionUser.role, sessionUser.moduleAccess ?? undefined);

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
      <div
        className={
          isHarmony
            ? "relative min-w-0 shrink-0 px-5 pb-5 pt-6 shell-short:px-4 shell-short:pb-2 shell-short:pt-4"
            : "relative min-w-0 shrink-0 px-5 pb-5 pt-6 shell-short:px-4 shell-short:pb-2 shell-short:pt-3"
        }
      >
        {isWorkdaySkyWidgetEnabled() ? (
          <div
            className={
              isHarmony
                ? "pointer-events-none absolute -left-2 -top-2 z-0 h-[4.5rem] w-[4.75rem] overflow-hidden rounded-br-[1.5rem] opacity-80"
                : "pointer-events-none absolute -left-1 -top-1 z-0 h-[7.5rem] w-[7.75rem] overflow-hidden rounded-br-[2.75rem] shell-short:h-[4.25rem] shell-short:w-[4.5rem] shell-short:rounded-br-[1.25rem]"
            }
            aria-hidden
          >
            <div
              className={
                isHarmony
                  ? "-ml-1 -mt-1 pointer-events-auto scale-[0.45] origin-top-left"
                  : "-ml-2 -mt-2 pointer-events-auto shell-short:-ml-1 shell-short:-mt-1"
              }
            >
              <WorkdaySunMoon
                variant="corner"
                className={`text-[var(--sidebar-blue)] opacity-[0.94] ${isHarmony ? "" : "shell-short:scale-[0.55] shell-short:origin-top-left"}`}
              />
            </div>
          </div>
        ) : null}

        <Link
          href="/"
          className={
            isHarmony
              ? "relative z-10 mb-8 flex items-center gap-3 outline-offset-2 transition-opacity hover:opacity-80 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sidebar-blue)]"
              : "relative z-10 mx-auto block w-full min-w-0 max-w-full text-center outline-offset-2 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sidebar-blue)]"
          }
          title={`На стартовый экран · ${APP_DISPLAY_NAME}`}
        >
          {isHarmony ? (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--sidebar-blue)] text-white card-shadow">
                <img
                  src="/favicons/favicon-blue-48.png"
                  alt=""
                  className="h-5 w-5"
                  width={20}
                  height={20}
                />
              </span>
              <span
                className={`${fontDisplay.className} text-[17px] font-semibold tracking-tight text-[var(--sidebar-text-strong)]`}
              >
                {APP_DISPLAY_NAME}
              </span>
            </>
          ) : (
            <span
              className={`relative z-20 block w-full min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[1.35rem] font-light leading-snug tracking-[0.04em] text-[var(--sidebar-text-strong)] shell-short:text-[1.05rem] shell-short:leading-tight shell-short:tracking-[0.02em] [@media(min-width:1024px)_and_(min-height:560px)]:text-[clamp(0.62rem,calc(((100vw/7)-2.75rem)/9),1.12rem)] [@media(min-width:1024px)_and_(min-height:560px)]:leading-tight [@media(min-width:1024px)_and_(min-height:560px)]:tracking-[0.05em] ${brandDisplayFont.className}`}
              style={{ textShadow: "var(--sidebar-title-shadow)" }}
            >
              {APP_DISPLAY_NAME}
            </span>
          )}
        </Link>

        {isEffectiveKanbanOnly ? null : (
          <button
            type="button"
            disabled={!canOpen}
            title={
              !canCreate
                ? "Нет доступа к созданию нового заказа"
                : canOpen
                ? "Новый заказ"
                : "Уже 5 окон нового заказа (включая свёрнутые полоски внизу экрана). Закройте лишние или разверните и очистите черновик."
            }
            className={`${isHarmony ? "pressable" : "pressable-tap"} ${isHarmony ? "mt-0" : "mt-5"} flex w-full items-center justify-between text-white shell-short:mt-2 ${
              isHarmony
                ? "rounded-xl px-4 py-3.5 text-xs font-bold uppercase tracking-wider card-shadow"
                : "rounded-md px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide shell-short:px-2 shell-short:py-2 shell-short:text-[9px] shell-short:tracking-[0.06em]"
            } transition-colors ${
              canOpen
                ? "cursor-pointer bg-[var(--sidebar-blue)] hover:bg-[var(--sidebar-blue-hover)]"
                : "cursor-not-allowed bg-zinc-400 dark:bg-zinc-600"
            }`}
            onClick={() => {
              if (canOpen) openNewOrder();
            }}
          >
            <span className={isHarmony ? "" : "flex-1 text-center"}>Новый заказ</span>
            <kbd
              className={`hidden shrink-0 items-center gap-0.5 text-[10px] font-sans font-medium tracking-normal lg:inline-flex ${
                isHarmony
                  ? "rounded-md bg-white/20 px-1.5 py-0.5 text-white/90"
                  : "ml-auto font-mono normal-case text-white/70 opacity-60"
              }`}
              aria-hidden
            >
              <span>⌘</span>
              <span>N</span>
            </kbd>
          </button>
        )}
      </div>

      <div className="mx-5 h-px bg-[var(--sidebar-border)]" aria-hidden />

      <div
        id="sidebar-main-stack"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        {isEffectiveKanbanOnly ? null : (
          <div className="shrink-0 px-4 pb-2 pt-1 shell-short:px-3 shell-short:pb-1">
            <CommandPalette />
          </div>
        )}
        <SidebarNav />

        {isEffectiveKanbanOnly ? null : (
          <>
            <SidebarMessengers />
            {sessionUser &&
            canAccessSidebarPayments(
              sessionUser.role,
              sessionUser.moduleAccess ?? undefined,
            ) ? (
              <SidebarPayments
                sessionRole={sessionUser.role}
                moduleAccess={sessionUser.moduleAccess}
              />
            ) : null}
            <SidebarDrafts />
          </>
        )}
      </div>

      <div
        className={`mt-auto shrink-0 border-t border-[var(--sidebar-border)] px-4 py-3 shell-short:px-3 shell-short:py-2 ${
          isHarmony ? "" : "dark:bg-black/25"
        }`}
      >
        <div
          className={
            isHarmony
              ? "flex items-center justify-between gap-2 p-2"
              : "flex items-start gap-2 shell-short:gap-1.5"
          }
        >
          {sessionUser ? (
            <>
              <Link
                href="/directory/profile"
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--sidebar-border)] bg-black/10 text-xl outline-offset-2 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sidebar-blue)] dark:bg-white/10"
                title="Настройка профиля"
                aria-label="Настройка профиля"
              >
                {sessionUser.avatarCustomUploadedAt ? (
                  <img
                    src={`/api/me/avatar?t=${encodeURIComponent(sessionUser.avatarCustomUploadedAt)}`}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => {
                      setSessionUser((prev) =>
                        prev ? { ...prev, avatarCustomUploadedAt: null } : null,
                      );
                    }}
                  />
                ) : (
                  <span aria-hidden>{profileAvatarEmoji(sessionUser.avatarPresetId)}</span>
                )}
              </Link>
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
          {isHarmony ? (
            <button
              type="button"
              title={isDemo ? "Выйти из демо и сбросить демо-базу" : "Выйти"}
              aria-label={isDemo ? "Выйти из демо" : "Выйти"}
              onClick={() => void logout()}
              className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--sidebar-text-strong)]"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <ThemeToggle compact={shellShort} />
          )}
        </div>
        {isHarmony ? (
          <div className="mt-2 flex justify-center">
            <ThemeToggle compact={shellShort} />
          </div>
        ) : null}
        {singleUserMode ? null : isHarmony ? null : (
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
