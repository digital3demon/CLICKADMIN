"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNewOrderPanel } from "./new-order-panel-context";

const NewOrderForm = dynamic(
  () =>
    import("./new-order-form/NewOrderForm").then((m) => ({
      default: m.NewOrderForm,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[240px] items-center justify-center px-6 text-sm text-[var(--text-secondary)]">
        Загрузка формы…
      </div>
    ),
  },
);

const easeSnappy = [0.2, 0.85, 0.25, 1] as const;

/** Свернутые кнопки: на телефоне на всю ширину контента, на md — справа от сайдбара. */
const collapsedStripClass =
  "left-[max(0.75rem,env(safe-area-inset-left,0px))] right-[max(0.75rem,env(safe-area-inset-right,0px))] shell-desktop:left-[calc(100%/7+0.75rem)] shell-desktop:right-3";

/** Модалка и затемнение: на мобилке/низком экране на всю ширину, при shell-desktop — только над 6/7. */
const mainStageClass = "left-0 shell-desktop:left-[calc(100%/7)]";

export function NewOrderPanel() {
  const { panels, close, collapse, expand, dismissExpandedPanel } =
    useNewOrderPanel();
  const pathname = usePathname();
  const prevPathnameRef = useRef<string | null>(null);
  const panelsRef = useRef(panels);
  panelsRef.current = panels;

  const collapsedList = useMemo(
    () => panels.filter((p) => p.collapsed),
    [panels],
  );

  const topExpandedId = useMemo(() => {
    for (let i = panels.length - 1; i >= 0; i--) {
      if (!panels[i].collapsed) return panels[i].id;
    }
    return null;
  }, [panels]);

  const hasExpanded = topExpandedId !== null;

  useEffect(() => {
    if (prevPathnameRef.current === null) {
      prevPathnameRef.current = pathname;
      return;
    }
    if (prevPathnameRef.current === pathname) return;
    prevPathnameRef.current = pathname;
    const expandedIds = panelsRef.current
      .filter((p) => !p.collapsed)
      .map((p) => p.id);
    for (const id of expandedIds) {
      dismissExpandedPanel(id);
    }
  }, [pathname, dismissExpandedPanel]);

  return (
    <>
      <AnimatePresence mode="popLayout">
        {collapsedList.map((p, stackIndex) => (
          <motion.button
            key={p.id}
            type="button"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: easeSnappy }}
            className={`fixed z-[85] flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--sidebar-blue)] px-3 text-xs font-semibold uppercase tracking-wide text-white shadow-lg hover:bg-[var(--sidebar-blue-hover)] sm:h-12 sm:text-sm ${collapsedStripClass}`}
            style={{
              bottom: `calc(max(1rem, env(safe-area-inset-bottom, 0px)) + ${stackIndex * 3.35}rem)`,
            }}
            onClick={() => expand(p.id)}
            aria-label={`Развернуть окно нового заказа ${panels.findIndex((x) => x.id === p.id) + 1}`}
          >
            <span>Новый заказ</span>
            <span className="tabular-nums opacity-80">
              {panels.findIndex((x) => x.id === p.id) + 1}
            </span>
            <ChevronUp className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          </motion.button>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {hasExpanded ? (
          <motion.button
            key="backdrop-stack"
            type="button"
            aria-label="Закрыть верхнее окно"
            className={`fixed inset-y-0 right-0 z-[90] bg-zinc-900/35 ${mainStageClass}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => {
              if (topExpandedId) dismissExpandedPanel(topExpandedId);
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {panels
          .filter((p) => !p.collapsed)
          .map((p) => {
            const arrayIndex = panels.findIndex((x) => x.id === p.id);
            const titleId = `new-order-panel-title-${p.id}`;
            const z = 100 + arrayIndex;

            return (
            <motion.div
              key={p.id}
              className={`fixed inset-y-0 right-0 flex pointer-events-none max-md:items-center max-md:justify-center max-md:p-2 md:items-center md:justify-center md:p-2 sm:p-3 ${mainStageClass}`}
              style={{ zIndex: z }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: easeSnappy }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="pointer-events-auto flex w-full max-w-[min(99vw,1320px)] min-h-0 flex-col overflow-y-auto overflow-x-hidden border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl max-h-[100dvh] max-md:max-h-[100dvh] max-md:rounded-none md:max-h-[min(92dvh,1180px)] md:rounded-xl"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.22, ease: easeSnappy }}
                onClick={(e) => e.stopPropagation()}
              >
                <NewOrderForm
                  panelId={p.id}
                  titleId={titleId}
                  initialSnapshot={p.initialSnapshot ?? null}
                  onCollapse={() => collapse(p.id)}
                  onClose={() => close(p.id)}
                  onAfterSuccessfulSave={() =>
                    close(p.id, { skipDraft: true })
                  }
                  onKaitenCancelCollapse={() => collapse(p.id)}
                />
              </motion.div>
            </motion.div>
            );
          })}
      </AnimatePresence>
    </>
  );
}

function ChevronUp(props: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden={props["aria-hidden"]}
    >
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}
