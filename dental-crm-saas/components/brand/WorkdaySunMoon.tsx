"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { SpbSkyKind, SpbSkyPayload } from "@/lib/spb-open-meteo";
import {
  MOON_STREAK,
  SolarSystemEasterOverlay,
  STREAK_MS,
  SUN_STREAK,
  WolfHowlEasterOverlay,
} from "@/components/brand/SkyEasterEggOverlays";

const MSK = "Europe/Moscow";

function moscowDecimalHourWithSeconds(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MSK,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const s = Number(parts.find((p) => p.type === "second")?.value ?? 0);
  return h + m / 60 + s / 3600;
}

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function moonStrengthNow(): number {
  const decimal = moscowDecimalHourWithSeconds();
  const start = 9;
  const end = 18;
  let linear = 0;
  if (decimal <= start) linear = 0;
  else if (decimal >= end) linear = 1;
  else linear = (decimal - start) / (end - start);
  return smoothstep01(linear);
}

const defaultSky: SpbSkyPayload = {
  kind: "clear",
  cloudCoverPercent: 0,
  observationTime: null,
  fallback: true,
};

function skyKindLabel(kind: SpbSkyKind): string {
  switch (kind) {
    case "cloudy":
      return "облачно";
    case "cloudy_heavy":
      return "пасмурно";
    case "rain":
      return "дождь";
    case "snow":
      return "снег";
    default:
      return "ясно";
  }
}

/** Облака за солнцем/луной */
function CloudLayers({ kind }: { kind: SpbSkyKind }) {
  if (kind === "clear") return null;
  const heavy =
    kind === "cloudy_heavy" || kind === "rain" || kind === "snow";

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-lg"
      aria-hidden
    >
      <div
        className={`sky-weather-cloud-a absolute -bottom-1 left-1/2 h-[85%] w-[160%] -translate-x-[48%] rounded-[50%] bg-zinc-400/40 blur-[2.5px] ${heavy ? "opacity-95" : ""}`}
      />
      <div
        className={`sky-weather-cloud-b absolute -bottom-0.5 left-1/2 h-[70%] w-[130%] -translate-x-[52%] rounded-[48%] bg-slate-300/45 blur-[2px] ${heavy ? "opacity-90" : ""}`}
      />
      {heavy ? (
        <div className="sky-weather-cloud-heavy absolute bottom-0 left-1/2 h-[55%] w-[118%] -translate-x-1/2 rounded-[45%] bg-slate-500/35 blur-[3px]" />
      ) : null}
    </div>
  );
}

function RainOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-lg"
      aria-hidden
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <span
          key={i}
          className="absolute top-0 w-px rounded-full bg-sky-500/80"
          style={{
            left: `${8 + i * 10.5}%`,
            height: "7px",
            animation: `sky-rain-streak ${0.62 + (i % 3) * 0.08}s linear infinite`,
            animationDelay: `${i * 0.11}s`,
          }}
        />
      ))}
    </div>
  );
}

function SnowOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-lg"
      aria-hidden
    >
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className="absolute top-0 rounded-full bg-white/90 shadow-[0_0_1px_rgba(148,163,184,0.85)] dark:bg-white/85"
          style={{
            left: `${10 + i * 12}%`,
            width: "2.5px",
            height: "2.5px",
            animation: `sky-snow-flake ${1.35 + (i % 4) * 0.15}s linear infinite`,
            animationDelay: `${i * 0.22}s`,
          }}
        />
      ))}
    </div>
  );
}

const SUN_RAY_COUNT = 16;

function RealisticSun({
  uid,
  sunOp,
  moon,
  transition,
  svgClassName = "h-8 w-8",
}: {
  uid: string;
  sunOp: number;
  moon: number;
  transition: string;
  svgClassName?: string;
}) {
  const p = `${uid}s`;
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={`absolute ${svgClassName}`}
      style={{
        opacity: sunOp,
        transition,
        transform: `scale(${0.88 + 0.12 * sunOp}) rotate(${moon * 11}deg)`,
      }}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${p}-hot`} cx="40%" cy="38%" r="58%">
          <stop offset="0%" stopColor="#fffef9" />
          <stop offset="18%" stopColor="#fff4c2" />
          <stop offset="42%" stopColor="#ffd54a" />
          <stop offset="72%" stopColor="#ff9800" />
          <stop offset="100%" stopColor="#e65100" />
        </radialGradient>
        <radialGradient id={`${p}-glow`} cx="50%" cy="50%" r="52%">
          <stop offset="0%" stopColor="#fff9c4" stopOpacity="0.75" />
          <stop offset="40%" stopColor="#ffb74d" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ff6f00" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${p}-ray`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffde7" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#ffcc80" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ff9800" stopOpacity="0" />
        </linearGradient>
        <filter
          id={`${p}-bloom`}
          x="-35%"
          y="-35%"
          width="170%"
          height="170%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.45" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${p}-raysh`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.35" />
        </filter>
      </defs>
      <circle cx="24" cy="24" r="17" fill={`url(#${p}-glow)`} opacity={0.92} />
      <g filter={`url(#${p}-raysh)`}>
        {Array.from({ length: SUN_RAY_COUNT }, (_, i) => {
          const deg = (360 / SUN_RAY_COUNT) * i;
          const long = i % 2 === 0;
          const y2 = long ? 5.2 : 6.8;
          return (
            <line
              key={i}
              x1="24"
              y1="9.2"
              x2="24"
              y2={y2}
              stroke={`url(#${p}-ray)`}
              strokeWidth={long ? 1.35 : 1.05}
              strokeLinecap="round"
              transform={`rotate(${deg} 24 24)`}
            />
          );
        })}
      </g>
      <circle
        cx="24"
        cy="24"
        r="8.1"
        fill={`url(#${p}-hot)`}
        filter={`url(#${p}-bloom)`}
      />
      <ellipse
        cx="21.2"
        cy="21"
        rx="2.4"
        ry="2"
        fill="#fffefb"
        opacity={0.42}
      />
    </svg>
  );
}

function RealisticMoon({
  uid,
  moonOp,
  moon,
  transition,
  svgClassName = "h-8 w-8",
}: {
  uid: string;
  moonOp: number;
  moon: number;
  transition: string;
  svgClassName?: string;
}) {
  const p = `${uid}m`;
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={`absolute ${svgClassName}`}
      style={{
        opacity: moonOp,
        transition,
        transform: `scale(${0.84 + 0.16 * moonOp}) rotate(${-5 * (1 - moonOp)}deg)`,
      }}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${p}-body`} cx="36%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#fafbff" />
          <stop offset="28%" stopColor="#e4e9f2" />
          <stop offset="55%" stopColor="#aeb6c8" />
          <stop offset="82%" stopColor="#6b758a" />
          <stop offset="100%" stopColor="#3d4558" />
        </radialGradient>
        <radialGradient id={`${p}-shade`} cx="72%" cy="55%" r="58%">
          <stop offset="0%" stopColor="#1e2433" stopOpacity="0" />
          <stop offset="55%" stopColor="#151a28" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0a0d14" stopOpacity="0.78" />
        </radialGradient>
        <radialGradient id={`${p}-limb`} cx="28%" cy="30%" r="45%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c5ccda" stopOpacity="0" />
        </radialGradient>
        <filter
          id={`${p}-soft`}
          x="-25%"
          y="-25%"
          width="150%"
          height="150%"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.25" result="x" />
          <feMerge>
            <feMergeNode in="x" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="24" cy="24" r="11.2" fill="#1a2030" opacity={0.22} />
      <circle cx="24" cy="24" r="10.6" fill={`url(#${p}-body)`} />
      <circle cx="24" cy="24" r="10.6" fill={`url(#${p}-shade)`} />
      <circle cx="24" cy="24" r="10.6" fill={`url(#${p}-limb)`} />
      <g opacity={0.55}>
        <ellipse
          cx="19.5"
          cy="21.5"
          rx="2.8"
          ry="2"
          fill="#5c6578"
          opacity={0.35}
        />
        <ellipse
          cx="27"
          cy="25.5"
          rx="2.2"
          ry="1.55"
          fill="#4a5366"
          opacity={0.28}
        />
        <ellipse
          cx="22"
          cy="29.5"
          rx="1.85"
          ry="1.25"
          fill="#6a7386"
          opacity={0.22}
        />
        <ellipse
          cx="25.5"
          cy="19"
          rx="1.4"
          ry="1.1"
          fill="#7a8396"
          opacity={0.18}
        />
      </g>
      <circle
        cx="24"
        cy="24"
        r="10.85"
        fill="none"
        stroke="#d8dee9"
        strokeWidth="0.28"
        opacity={0.45}
      />
      <circle
        cx="24"
        cy="24"
        r="10.6"
        fill="none"
        stroke="#f0f3fa"
        strokeWidth="0.15"
        opacity={0.35}
        filter={`url(#${p}-soft)`}
      />
    </svg>
  );
}

/**
 * Солнце → луна по времени суток (МСК) с плавной кривой; погода Санкт-Петербурга
 * (Open-Meteo) — облака / дождь / снег.
 *
 * `corner` — крупнее, для позиции в углу сайдбара за логотипом/названием.
 */
export function WorkdaySunMoon({
  className,
  variant = "inline",
}: {
  className?: string;
  variant?: "inline" | "corner";
}) {
  const rawId = useId().replace(/:/g, "");
  const [moon, setMoon] = useState(0);
  const [sky, setSky] = useState<SpbSkyPayload>(defaultSky);
  const [easterSolar, setEasterSolar] = useState(false);
  const [easterWolf, setEasterWolf] = useState(false);
  const sunStreakRef = useRef(0);
  const moonStreakRef = useRef(0);
  const sunResetRef = useRef<number | null>(null);
  const moonResetRef = useRef<number | null>(null);

  const handleSunTap = useCallback((e: ReactPointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (sunResetRef.current) window.clearTimeout(sunResetRef.current);
    sunStreakRef.current += 1;
    if (sunStreakRef.current >= SUN_STREAK) {
      sunStreakRef.current = 0;
      setEasterSolar(true);
      return;
    }
    sunResetRef.current = window.setTimeout(() => {
      sunStreakRef.current = 0;
    }, STREAK_MS);
  }, []);

  const handleMoonTap = useCallback((e: ReactPointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (moonResetRef.current) window.clearTimeout(moonResetRef.current);
    moonStreakRef.current += 1;
    if (moonStreakRef.current >= MOON_STREAK) {
      moonStreakRef.current = 0;
      setEasterWolf(true);
      return;
    }
    moonResetRef.current = window.setTimeout(() => {
      moonStreakRef.current = 0;
    }, STREAK_MS);
  }, []);

  useEffect(() => {
    const tick = () => setMoon(moonStrengthNow());
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/weather/spb");
        if (!res.ok) return;
        const j = (await res.json()) as SpbSkyPayload;
        if (!cancelled && j && typeof j.kind === "string") setSky(j);
      } catch {
        /* сеть */
      }
    }
    void load();
    const interval = window.setInterval(load, 15 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const sunOp = 1 - moon;
  const moonOp = moon;

  const title = useMemo(() => {
    const w = skyKindLabel(sky.kind);
    const city = "Санкт-Петербург";
    const base =
      "Время МСК: утром солнце, к вечеру рабочего дня (9–18) плавно сменяется луной.";
    const wx = `Погода ${city}: ${w}${sky.fallback ? " (данные временно недоступны)" : ""}.`;
    return `${base} ${wx}`;
  }, [sky.fallback, sky.kind]);

  const transition =
    "opacity 3.4s cubic-bezier(0.42, 0, 0.18, 1), transform 3.4s cubic-bezier(0.42, 0, 0.18, 1)";

  const isCorner = variant === "corner";
  const svgClass = isCorner ? "h-[3.35rem] w-[3.35rem]" : "h-8 w-8";
  const outerClass = isCorner
    ? "inline-flex h-[6.75rem] w-[6.75rem] shrink-0 items-start justify-start pt-0.5 pl-0"
    : "inline-flex h-10 w-[2.85rem] shrink-0 items-center justify-center";

  const sunHits = sunOp > 0.38;
  const moonHits = moonOp > 0.38;
  const sunOnTop = sunOp >= moonOp;

  return (
    <span
      className={`relative ${outerClass} ${className ?? ""}`}
      aria-hidden
      title={title}
    >
      <SolarSystemEasterOverlay
        open={easterSolar}
        onClose={() => setEasterSolar(false)}
      />
      <WolfHowlEasterOverlay
        open={easterWolf}
        onClose={() => setEasterWolf(false)}
      />

      <CloudLayers kind={sky.kind} />

      <span
        className={
          isCorner
            ? "relative z-[1] flex h-[3.35rem] w-[3.35rem] items-center justify-center"
            : "relative z-[1] flex h-8 w-8 items-center justify-center"
        }
      >
        <span
          className="absolute inset-0 flex cursor-pointer items-center justify-center"
          style={{
            zIndex: sunOnTop ? 5 : 3,
            pointerEvents: sunHits ? "auto" : "none",
          }}
          onPointerDown={handleSunTap}
        >
          <RealisticSun
            uid={rawId}
            sunOp={sunOp}
            moon={moon}
            transition={transition}
            svgClassName={svgClass}
          />
        </span>
        <span
          className="absolute inset-0 flex cursor-pointer items-center justify-center"
          style={{
            zIndex: sunOnTop ? 3 : 5,
            pointerEvents: moonHits ? "auto" : "none",
          }}
          onPointerDown={handleMoonTap}
        >
          <RealisticMoon
            uid={rawId}
            moonOp={moonOp}
            moon={moon}
            transition={transition}
            svgClassName={svgClass}
          />
        </span>
      </span>

      {sky.kind === "rain" ? <RainOverlay /> : null}
      {sky.kind === "snow" ? <SnowOverlay /> : null}
    </span>
  );
}
