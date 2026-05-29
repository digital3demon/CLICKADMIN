"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface MobileAwareDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  mobileVariant?: "center" | "bottom-sheet";
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  initialFocusRef?: RefObject<HTMLElement>;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  full: "max-w-5xl",
} as const;

export function MobileAwareDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "lg",
  mobileVariant = "bottom-sheet",
  closeOnBackdrop = true,
  closeOnEscape = true,
  initialFocusRef,
}: MobileAwareDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeOnEscape, onClose]);

  useEffect(() => {
    if (!open) return;
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
      return;
    }
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }, [open, initialFocusRef]);

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };
  const desktopPanelVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -8 },
    visible: { opacity: 1, scale: 1, y: 0 },
  };
  const bottomSheetVariants = {
    hidden: { y: "100%" },
    visible: { y: 0 },
  };
  const centerMobileVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[140] flex"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          ref={dialogRef}
        >
          <motion.div
            className="absolute inset-0 bg-zinc-900/50"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.15 }}
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-hidden="true"
          />

          <motion.div
            className={[
              "relative z-10 m-auto hidden w-full shell-desktop:flex flex-col",
              "max-h-[min(96vh,920px)] overflow-hidden",
              "rounded-xl border border-[var(--card-border)]",
              "bg-[var(--card-bg)] shadow-2xl",
              sizeClasses[size],
            ].join(" ")}
            variants={desktopPanelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <DialogInner
              title={title}
              description={description}
              onClose={onClose}
              footer={footer}
            >
              {children}
            </DialogInner>
          </motion.div>

          {mobileVariant === "bottom-sheet" && (
            <motion.div
              className={[
                "absolute bottom-0 left-0 right-0 z-10 shell-desktop:hidden",
                "max-h-[90dvh] flex flex-col",
                "rounded-t-2xl border-x border-t border-[var(--card-border)]",
                "bg-[var(--card-bg)] shadow-2xl",
                "pb-[env(safe-area-inset-bottom)]",
              ].join(" ")}
              variants={bottomSheetVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            >
              <div
                className="flex shrink-0 justify-center pb-1 pt-3"
                aria-hidden="true"
              >
                <div className="h-1 w-10 rounded-full bg-[var(--card-border)]" />
              </div>
              <DialogInner
                title={title}
                description={description}
                onClose={onClose}
                footer={footer}
              >
                {children}
              </DialogInner>
            </motion.div>
          )}

          {mobileVariant === "center" && (
            <motion.div
              className={[
                "relative z-10 m-auto mx-3 w-full shell-desktop:hidden",
                "max-h-[90dvh] flex flex-col",
                "rounded-xl border border-[var(--card-border)]",
                "bg-[var(--card-bg)] shadow-2xl",
              ].join(" ")}
              variants={centerMobileVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <DialogInner
                title={title}
                description={description}
                onClose={onClose}
                footer={footer}
              >
                {children}
              </DialogInner>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}

function DialogInner({
  title,
  description,
  onClose,
  footer,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-strong)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>

      {footer ? (
        <footer className="shrink-0 border-t border-[var(--card-border)] p-3">
          {footer}
        </footer>
      ) : null}
    </>
  );
}
