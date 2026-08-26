"use client";

import { useEffect, useState } from "react";

type Phase = "backup" | "restore";

const LABEL: Record<Phase, string> = {
  backup: "Идет бекап CRM, подождите",
  restore: "Идет восстановление CRM, подождите",
};

export function CrmMaintenanceOverlay() {
  const [phase, setPhase] = useState<Phase | null>(null);

  useEffect(() => {
    let cancelled = false;
    const apply = (next: Phase | null) => {
      if (!cancelled) setPhase(next);
    };

    const poll = async () => {
      try {
        const res = await fetch("/api/crm-backup/progress", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const j = (await res.json()) as { phase?: Phase | null };
        if (j.phase === "backup" || j.phase === "restore") apply(j.phase);
        else apply(null);
      } catch {
        /* сеть — оставим прошлый кадр */
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), 800);

    const onLocal = (e: Event) => {
      const ce = e as CustomEvent<{ phase?: Phase | null }>;
      if (ce.detail?.phase === "backup" || ce.detail?.phase === "restore") {
        apply(ce.detail.phase);
      } else if (ce.detail && "phase" in ce.detail && ce.detail.phase == null) {
        apply(null);
      }
    };
    window.addEventListener("crm-maintenance", onLocal);

    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel("crm-maintenance");
      ch.onmessage = (ev: MessageEvent<{ phase?: Phase | null }>) => {
        if (ev.data?.phase === "backup" || ev.data?.phase === "restore") {
          apply(ev.data.phase);
        } else if (ev.data && ev.data.phase == null) {
          apply(null);
        }
      };
    } catch {
      /* нет BroadcastChannel */
    }

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("crm-maintenance", onLocal);
      ch?.close();
    };
  }, []);

  useEffect(() => {
    if (!phase) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const block = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const blockKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", blockKey, true);
    window.addEventListener("wheel", block, { capture: true, passive: false });
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", blockKey, true);
      window.removeEventListener("wheel", block, true);
    };
  }, [phase]);

  if (!phase) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={LABEL[phase]}
    >
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <span className="crm-backup-live-dot" aria-hidden />
        <p className="text-lg font-semibold text-white drop-shadow">{LABEL[phase]}</p>
      </div>
    </div>
  );
}

export function announceCrmMaintenance(phase: Phase | null): void {
  window.dispatchEvent(
    new CustomEvent("crm-maintenance", { detail: { phase } }),
  );
  try {
    const ch = new BroadcastChannel("crm-maintenance");
    ch.postMessage({ phase });
    ch.close();
  } catch {
    /* ignore */
  }
}
