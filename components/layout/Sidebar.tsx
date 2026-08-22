"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  canAccessSidebarPayments,
  isKanbanOnlyUser,
} from "@/lib/auth/permissions";
import { useSessionUser } from "@/components/providers/SessionUserProvider";
import { APP_DISPLAY_NAME } from "@/lib/app-brand";
import { brandDisplayFont } from "@/lib/brand-font";
import { useNewOrderPanel } from "@/components/orders/new-order-panel-context";
import { SidebarDrafts } from "./SidebarDrafts";
import { SidebarPayments } from "./SidebarPayments";
import { SidebarNav } from "./SidebarNav";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { isWorkdaySkyWidgetEnabled } from "@/lib/ui-flags";
import { ThemeToggle } from "./ThemeToggle";
import { profileAvatarEmoji } from "@/lib/profile-avatar-presets";
import { writeClientStorageBucket } from "@/lib/client-storage-bucket";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import { fontDisplay } from "@/lib/app-fonts";
import { LogOut, Plus } from "lucide-react";
import { useDesktopSidebarCollapseOptional } from "@/components/layout/desktop-sidebar-collapse";

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

function SidebarSessionAvatar({
  uploadedAt,
  presetId,
}: {
  uploadedAt: string | null;
  presetId: string | null;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [uploadedAt]);
  if (uploadedAt && !broken) {
    return (
      <img
        src={`/api/me/avatar?t=${encodeURIComponent(uploadedAt)}`}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setBroken(true)}
      />
    );
  }
  return <span aria-hidden>{profileAvatarEmoji(presetId)}</span>;
}

export function Sidebar() {
  const uiDesign = useUiDesign();
  const isHarmony = uiDesign === "harmony";
  const railCollapsed = useDesktopSidebarCollapseOptional()?.collapsed ?? false;
  const { open: openNewOrder, canOpen, canCreate, createAccessReady } =
    useNewOrderPanel();
  const { user: sessionUser, isDemo, singleUser: singleUserMode } =
    useSessionUser();
  const isActualOwner = sessionUser?.actualRole === "OWNER";
  const isEffectiveKanbanOnly =
    sessionUser != null &&
    !isActualOwner &&
    isKanbanOnlyUser(sessionUser.role, sessionUser.moduleAccess ?? undefined);

  const logout = useCallback(() => {
    writeClientStorageBucket("live");
    // Сразу уходим на логин — не ждём сеть/API (раньше exit ждал reseed БД).
    const exitUrl = isDemo ? "/api/demo/exit" : "/api/auth/logout";
    void fetch(exitUrl, { method: "POST", credentials: "include" }).catch(
      () => {
        void fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        }).catch(() => {});
      },
    );
    window.location.assign("/login");
  }, [isDemo]);

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col text-[var(--sidebar-text-strong)]">
      <div
        className={
          railCollapsed
            ? "relative min-w-0 shrink-0 px-1.5 pb-3 pt-4"
            : isHarmony
              ? "relative min-w-0 shrink-0 px-5 pb-5 pt-6 shell-short:px-4 shell-short:pb-2 shell-short:pt-4"
              : "relative min-w-0 shrink-0 px-5 pb-5 pt-6 shell-short:px-4 shell-short:pb-2 shell-short:pt-3"
        }
      >
        {isWorkdaySkyWidgetEnabled() && !railCollapsed ? (
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

        <Link prefetch={false}
          href="/"
          className={
            railCollapsed
              ? "relative z-10 mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--sidebar-blue)] text-white outline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sidebar-blue)]"
              : isHarmony
                ? "relative z-10 mb-8 flex min-w-0 items-center gap-3 outline-offset-2 transition-opacity hover:opacity-80 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sidebar-blue)]"
                : "relative z-10 mx-auto block w-full min-w-0 max-w-full text-center outline-offset-2 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sidebar-blue)]"
          }
          title={`На стартовый экран · ${APP_DISPLAY_NAME}`}
        >
          {railCollapsed ? (
            <img
              src="/favicons/favicon-blue-48.png"
              alt=""
              className="h-5 w-5"
              width={20}
              height={20}
            />
          ) : isHarmony ? (
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
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span
                  className={`${fontDisplay.className} shrink-0 text-[17px] font-semibold tracking-tight text-[var(--sidebar-text-strong)]`}
                >
                  Клик
                </span>
                {sessionUser?.displayName ? (
                  <span
                    className={`${fontDisplay.className} min-w-0 truncate text-[17px] font-bold tracking-tight text-[var(--sidebar-text-strong)]`}
                    title={sessionUser.displayName}
                  >
                    {sessionUser.displayName}
                  </span>
                ) : null}
              </span>
            </>
          ) : (
            <span
              className={`relative z-20 flex w-full min-w-0 max-w-full items-baseline justify-center gap-1.5 overflow-hidden text-[1.35rem] leading-snug tracking-[0.04em] text-[var(--sidebar-text-strong)] shell-short:text-[1.05rem] shell-short:leading-tight shell-short:tracking-[0.02em] [@media(min-width:1024px)_and_(min-height:560px)]:text-[clamp(0.62rem,calc(((100vw/8)-2.75rem)/9),1.12rem)] [@media(min-width:1024px)_and_(min-height:560px)]:leading-tight [@media(min-width:1024px)_and_(min-height:560px)]:tracking-[0.05em] ${brandDisplayFont.className}`}
              style={{ textShadow: "var(--sidebar-title-shadow)" }}
              title={
                sessionUser?.displayName
                  ? `Клик · ${sessionUser.displayName}`
                  : APP_DISPLAY_NAME
              }
            >
              <span className="shrink-0 font-semibold">Клик</span>
              {sessionUser?.displayName ? (
                <span className="min-w-0 truncate font-bold">
                  {sessionUser.displayName}
                </span>
              ) : null}
            </span>
          )}
        </Link>

        {isEffectiveKanbanOnly ? null : (
          <button
            type="button"
            disabled={createAccessReady && !canOpen}
            title={
              !createAccessReady
                ? "Новый заказ"
                : !canCreate
                ? "Нет доступа к созданию нового заказа"
                : canOpen
                ? "Новый заказ"
                : "Уже 5 окон нового заказа (включая свёрнутые полоски внизу экрана). Закройте лишние или разверните и очистите черновик."
            }
            aria-label="Новый заказ"
            className={`${isHarmony ? "pressable" : "pressable-tap"} ${
              railCollapsed
                ? "mx-auto mt-1 flex h-9 w-9 items-center justify-center rounded-xl text-white"
                : `${isHarmony ? "mt-3" : "mt-5"} flex w-full items-center justify-between text-white shell-short:mt-2 ${
                    isHarmony
                      ? "rounded-xl px-4 py-3.5 text-xs font-bold uppercase tracking-wider card-shadow"
                      : "rounded-md px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide shell-short:px-2 shell-short:py-2 shell-short:text-[9px] shell-short:tracking-[0.06em]"
                  }`
            } transition-colors ${
              !createAccessReady || canOpen
                ? "cursor-pointer bg-[var(--sidebar-blue)] hover:bg-[var(--sidebar-blue-hover)]"
                : "cursor-not-allowed bg-zinc-400 dark:bg-zinc-600"
            }`}
            onClick={() => {
              if (!createAccessReady || canOpen) openNewOrder();
            }}
          >
            {railCollapsed ? (
              <Plus className="h-5 w-5" aria-hidden />
            ) : (
              <span className={isHarmony ? "" : "flex-1 text-center"}>Новый заказ</span>
            )}
          </button>
        )}
      </div>

      <div
        className={railCollapsed ? "mx-2 h-px bg-[var(--sidebar-border)]" : "mx-3.5 h-px bg-[var(--sidebar-border)]"}
        aria-hidden
      />

      <div
        id="sidebar-main-stack"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        {isEffectiveKanbanOnly || railCollapsed ? null : (
          <div className="shrink-0 px-4 pb-2 pt-1 shell-short:px-3 shell-short:pb-1">
            <CommandPalette />
          </div>
        )}
        {/* useSearchParams в SidebarNav — иначе падает prerender /_not-found */}
        <Suspense fallback={<nav className="min-h-0 flex-1 overflow-y-auto px-2" aria-hidden />}>
          <SidebarNav />
        </Suspense>

        {isEffectiveKanbanOnly || railCollapsed ? null : (
          <>
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
        className={`mt-auto shrink-0 border-t border-[var(--sidebar-border)] ${
          railCollapsed ? "px-1.5 py-2" : "px-3 py-2"
        } ${isHarmony ? "" : "dark:bg-black/25"}`}
      >
        <div
          className={
            railCollapsed
              ? "flex flex-col items-center gap-1.5"
              : "flex items-center gap-1.5"
          }
        >
          {sessionUser ? (
            <>
              <Link prefetch={false}
                href="/directory/profile"
                className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--sidebar-border)] bg-black/10 text-base outline-offset-2 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sidebar-blue)] dark:bg-white/10"
                title={
                  singleUserMode
                    ? "Настройка профиля · одна рабочая станция, без входа"
                    : isDemo
                      ? "Настройка профиля · демо-режим"
                      : "Настройка профиля"
                }
                aria-label="Настройка профиля"
              >
                <SidebarSessionAvatar
                  uploadedAt={sessionUser.avatarCustomUploadedAt}
                  presetId={sessionUser.avatarPresetId}
                />
              </Link>
              {railCollapsed ? null : (
                <div className="min-w-0 flex-1 leading-tight">
                  <div
                    className="truncate text-xs font-medium text-[var(--sidebar-text-strong)]"
                    title={sessionUser.displayName}
                  >
                    {sessionUser.displayName}
                  </div>
                  <div
                    className="truncate text-[10px] text-[var(--text-muted)]"
                    title={sessionUser.email}
                  >
                    {sessionUser.email}
                  </div>
                </div>
              )}
            </>
          ) : (
            railCollapsed ? null : <div className="min-w-0 flex-1" />
          )}
          <div
            className={
              railCollapsed
                ? "flex flex-col items-center gap-0.5"
                : "flex shrink-0 items-center gap-0.5"
            }
          >
            <ThemeToggle compact />
            {singleUserMode ? null : (
              <button
                type="button"
                title={isDemo ? "Выйти из демо" : "Выйти"}
                aria-label={isDemo ? "Выйти из демо" : "Выйти"}
                onClick={logout}                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--sidebar-text-strong)] dark:hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
