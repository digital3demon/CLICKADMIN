"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const SUN_STREAK = 6;
const MOON_STREAK = 8;
const STREAK_MS = 2400;
const SOLAR_MS = 2800;
const WOLF_MS = 4200;

export { SUN_STREAK, MOON_STREAK, STREAK_MS };

function playWolfHowlSound() {
  try {
    const AC =
      typeof window !== "undefined"
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        : null;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    const t0 = ctx.currentTime;
    osc.frequency.setValueAtTime(155, t0);
    osc.frequency.exponentialRampToValueAtTime(340, t0 + 0.12);
    osc.frequency.exponentialRampToValueAtTime(260, t0 + 0.28);
    osc.frequency.exponentialRampToValueAtTime(200, t0 + 0.52);
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.72);
    osc.start(t0);
    osc.stop(t0 + 0.75);
  } catch {
    /* нет звука */
  }
}

/** 6 кликов по солнцу — «отъезд» камеры: солнечная система */
export function SolarSystemEasterOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(onClose, SOLAR_MS);
    return () => window.clearTimeout(id);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const orbits = [
    { r: 22, dot: 2.2, dur: 2.8, color: "#b0bec5" },
    { r: 32, dot: 2.8, dur: 4.6, color: "#90caf9" },
    { r: 42, dot: 3, dur: 7.2, color: "#81c784" },
    { r: 54, dot: 3.4, dur: 11.5, color: "#ffab91" },
    { r: 68, dot: 4, dur: 18, color: "#ce93d8" },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[600] flex cursor-pointer items-center justify-center bg-slate-950/88 backdrop-blur-[3px]"
      style={{ animation: "sky-easter-solar-pop 0.45s ease-out both" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="pointer-events-none flex max-h-[min(72vh,420px)] max-w-[min(88vw,420px)] flex-col items-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-widest text-amber-100/90">
          Солнечная система
        </p>
        <svg
          viewBox="0 0 160 160"
          className="h-[min(58vh,360px)] w-[min(58vh,360px)] drop-shadow-[0_0_24px_rgba(251,191,36,0.25)]"
          aria-hidden
        >
          <defs>
            <radialGradient id="easter-sun-core" cx="40%" cy="38%" r="55%">
              <stop offset="0%" stopColor="#fffef5" />
              <stop offset="45%" stopColor="#ffd54f" />
              <stop offset="100%" stopColor="#f57c00" />
            </radialGradient>
            <radialGradient id="easter-sun-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff9c4" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#ff6f00" stopOpacity="0" />
            </radialGradient>
          </defs>
          {Array.from({ length: 48 }, (_, i) => (
            <circle
              key={i}
              cx={(i * 37) % 155}
              cy={(i * 53) % 150}
              r={0.35 + (i % 3) * 0.2}
              fill="#e2e8f0"
              opacity={0.15 + (i % 5) * 0.06}
            />
          ))}
          {orbits.map((o) => (
            <circle
              key={o.r}
              cx="80"
              cy="80"
              r={o.r}
              fill="none"
              stroke="#94a3b8"
              strokeOpacity={0.22}
              strokeWidth="0.45"
            />
          ))}
          <circle cx="80" cy="80" r="36" fill="url(#easter-sun-halo)" />
          <circle cx="80" cy="80" r="14" fill="url(#easter-sun-core)" />
          {orbits.map((o) => (
            <g
              key={`p-${o.r}`}
              style={{
                transformOrigin: "80px 80px",
                animation: `sky-solar-orbit ${o.dur}s linear infinite`,
              }}
            >
              <circle
                cx={80}
                cy={80 - o.r}
                r={o.dot}
                fill={o.color}
                opacity={0.92}
              />
            </g>
          ))}
        </svg>
        <p className="mt-3 text-center text-[11px] text-slate-400">
          Клик или Esc — закрыть
        </p>
      </div>
    </div>,
    document.body,
  );
}

/** 8 кликов по луне — волк и «awoooo» */
export function WolfHowlEasterOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const played = useRef(false);

  useEffect(() => {
    if (!open) {
      played.current = false;
      return;
    }
    if (!played.current) {
      played.current = true;
      playWolfHowlSound();
    }
    const id = window.setTimeout(onClose, WOLF_MS);
    return () => window.clearTimeout(id);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed bottom-0 right-0 z-[550] flex flex-col items-end gap-2 p-4 pr-5 pb-6"
      style={{ animation: "sky-wolf-enter 0.85s cubic-bezier(0.25, 0.9, 0.35, 1) both" }}
      aria-hidden
    >
      <div className="rounded-2xl rounded-br-sm border border-slate-600/80 bg-slate-900/95 px-4 py-2.5 shadow-xl shadow-black/40">
        <p className="text-lg font-semibold italic tracking-wide text-amber-100">
          awoooo
        </p>
      </div>
      <svg
        viewBox="0 0 120 100"
        className="h-24 w-28 text-slate-800 drop-shadow-lg"
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M78 18c8 2 14 10 16 20l4-2 6 8-3 6c4 8 6 18 4 28-2 14-12 26-26 30-6 2-14 1-20-2L38 92c-6-8-8-18-6-28 2-8 8-15 16-18 2-10 10-18 20-22 4-2 8-3 10-6z"
        />
        <path
          fill="#1e293b"
          d="M44 38c-4 6-6 14-4 22l-8 4c-6-2-10-8-10-15 0-8 6-14 14-14 3 0 6 1 8 3z"
        />
        <ellipse cx="58" cy="48" rx="3" ry="4" fill="#f8fafc" />
        <ellipse cx="72" cy="44" rx="2.5" ry="3.2" fill="#f8fafc" />
        <path
          fill="#0f172a"
          d="M88 22c6 4 10 12 10 20 0 6-2 12-6 16l-4-10c2-4 3-8 2-12-1-6-5-10-10-12l8-2z"
        />
      </svg>
    </div>,
    document.body,
  );
}
