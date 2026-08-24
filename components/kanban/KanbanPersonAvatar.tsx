"use client";

import { useId, useState, type ReactNode } from "react";
import type { KanbanBoard, KanbanUser } from "@/lib/kanban/types";
import {
  initialsFromDisplayName,
  kanbanFallbackAccentFromId,
  shortArcLabelFromDisplayName,
} from "@/lib/kanban/kanban-person-display";
import { profileAvatarEmoji } from "@/lib/profile-avatar-presets";
import type { KanbanCrmUserRow } from "./kanban-crm-users-context";
import { useKanbanCrmUsers } from "./kanban-crm-users-context";
import { useSessionUser } from "@/components/providers/SessionUserProvider";

const sizeClass = {
  xs: "h-[18px] w-[18px] text-[0.5rem]",
  /** Список mobile: компактный круг (ниже строка) */
  list: "h-6 w-6 text-[0.62rem]",
  sm: "h-6 w-6 text-[0.55rem]",
  card: "h-[22px] w-[22px] text-[0.58rem] max-md:h-[18px] max-md:w-[18px] max-md:text-[0.5rem]",
  /** Список desktop: чуть меньше md, под кружком подпись */
  listSm: "h-7 w-7 text-[0.6rem]",
  /** Модалка карточки на телефоне: круг чуть ниже, чтобы блок ОТВ./УЧАСТН. не раздувал шапку */
  modal: "h-8 w-8 text-[0.68rem]",
  md: "h-9 w-9 text-[0.65rem]",
  picker: "h-7 w-7 text-[0.6rem]",
} as const;

type SizeKey = keyof typeof sizeClass;

type KanbanPersonAvatarProps = {
  userId: string;
  homeBoard: KanbanBoard;
  variant: "assignee" | "participant";
  size: SizeKey;
  className?: string;
  titleSuffix?: string;
  /** Имя полукругом над кружком (mobile list). */
  nameArc?: boolean;
  /** Короткое имя под кружком (desktop list). */
  nameCaption?: boolean;
  /** Перекрыть размер подписи (напр. карточка доски). */
  captionClassName?: string;
};

function polarOnCircle(
  cx: number,
  cy: number,
  r: number,
  degFrom3oclockCcw: number,
): { x: number; y: number } {
  const rad = (degFrom3oclockCcw * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function AvatarNameArc({
  label,
  pathId,
  compact = true,
}: {
  label: string;
  pathId: string;
  /** list / listSm: дуга у обода с ~10:00 */
  compact?: boolean;
}) {
  if (!label) return null;
  // Центр совпадает с аватаром; дуга у обода, старт ~10:00 → ~1:30 (завал против часовой).
  const cx = 20;
  const cy = 20;
  const r = compact ? 14.4 : 15.6;
  const start = polarOnCircle(cx, cy, r, 128);
  const end = polarOnCircle(cx, cy, r, 38);
  const box = compact ? "h-8 w-8" : "h-10 w-10";
  return (
    <svg
      className={`pointer-events-none absolute left-1/2 top-1/2 z-[1] ${box} -translate-x-1/2 -translate-y-1/2 overflow-visible text-[var(--kanban-text)]`}
      viewBox="0 0 40 40"
      aria-hidden
    >
      <defs>
        <path
          id={pathId}
          d={`M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`}
          fill="none"
        />
      </defs>
      <text
        fill="currentColor"
        fontSize={compact ? "9.5" : "10.5"}
        fontWeight="700"
        letterSpacing="0.01em"
      >
        <textPath href={`#${pathId}`} startOffset="0%" textAnchor="start">
          {label}
        </textPath>
      </text>
    </svg>
  );
}

export function KanbanPersonAvatar({
  userId,
  homeBoard,
  variant,
  size,
  className = "",
  titleSuffix,
  nameArc = false,
  nameCaption = false,
  captionClassName,
}: KanbanPersonAvatarProps) {
  const reactId = useId();
  const pathId = `kanban-name-arc-${reactId.replace(/:/g, "")}`;
  const [customPhotoFailed, setCustomPhotoFailed] = useState(false);
  const { byId } = useKanbanCrmUsers();
  const { isDemo } = useSessionUser();
  const crm = byId.get(userId);
  const legacy = homeBoard.users.find((x) => x.id === userId);

  const forceDemoPersonLabel =
    isDemo ||
    Boolean(
      typeof process !== "undefined" &&
        (process.env.NEXT_PUBLIC_CRM_STANDALONE_DEMO ?? "")
          .trim()
          .match(/^(1|true|yes|on)$/i),
    );

  const displayName = forceDemoPersonLabel
    ? "Пользователь"
    : (crm?.displayName ?? legacy?.name ?? "Пользователь");
  const initials = forceDemoPersonLabel
    ? "П"
    : (legacy?.initials ??
      initialsFromDisplayName(crm?.displayName ?? crm?.email ?? displayName));
  const shortLabel =
    nameArc || nameCaption
      ? forceDemoPersonLabel
        ? "Пользоват"
        : shortArcLabelFromDisplayName(displayName)
      : "";
  const arcLabel = nameArc ? shortLabel : "";

  const compactRing =
    size === "card" ||
    size === "list" ||
    size === "listSm" ||
    size === "modal" ||
    size === "sm" ||
    size === "xs";
  const ring =
    variant === "assignee"
      ? compactRing || size === "picker"
        ? "ring-1 ring-amber-400 ring-offset-1 ring-offset-[var(--kanban-card-bg)]"
        : "ring-2 ring-amber-400 ring-offset-2 ring-offset-[var(--kaiten-modal-bg)]"
      : compactRing || size === "picker"
        ? "border border-dashed border-[var(--kanban-text-muted)]"
        : "border-2 border-dashed border-[var(--kaiten-modal-muted)]";

  const base = `${sizeClass[size]} inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${ring} ${className}`.trim();

  const title =
    titleSuffix != null
      ? `${displayName}${titleSuffix}`
      : `${displayName}${variant === "assignee" ? " (ответственный)" : " (участник)"}`;

  let face: ReactNode;
  if (crm?.avatarCustomUploadedAt && !customPhotoFailed) {
    const v = String(new Date(crm.avatarCustomUploadedAt).getTime() || 0);
    const src = `/api/user-avatars/${encodeURIComponent(userId)}?v=${encodeURIComponent(v)}`;
    face = (
      <span className={`${base} overflow-hidden bg-zinc-700 p-0`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setCustomPhotoFailed(true)}
        />
      </span>
    );
  } else if (crm && (crm.avatarPresetId || "").trim()) {
    const emoji = profileAvatarEmoji(crm.avatarPresetId);
    const bg = kanbanFallbackAccentFromId(userId);
    face = (
      <span className={base} style={{ background: bg }}>
        <span
          className={`select-none leading-none ${
            size === "modal" ? "text-[1.15rem]" : ""
          }`}
          aria-hidden
        >
          {emoji}
        </span>
      </span>
    );
  } else if (legacy) {
    face = (
      <span className={base} style={{ background: legacy.color }}>
        {initials}
      </span>
    );
  } else if (crm) {
    const bg = kanbanFallbackAccentFromId(userId);
    face = (
      <span className={base} style={{ background: bg }}>
        {initials}
      </span>
    );
  } else {
    face = <span className={`${base} bg-zinc-600`}>?</span>;
  }

  if (nameCaption) {
    const dense = size === "sm" || size === "card" || size === "xs";
    return (
      <span
        title={title}
        className={`inline-flex flex-col items-center gap-0.5 ${
          size === "xs"
            ? "max-w-[2.45rem]"
            : dense
              ? "max-w-[3.1rem]"
              : "max-w-[4.2rem]"
        }`}
      >
        {face}
        <span
          className={`w-full truncate text-center font-semibold leading-tight text-[var(--kanban-text)] ${
            captionClassName ??
            (size === "xs"
              ? "text-[0.5rem]"
              : dense
                ? "text-[0.62rem]"
                : "text-[0.68rem] sm:text-[0.75rem]")
          }`}
        >
          {shortLabel || "—"}
        </span>
      </span>
    );
  }

  if (!nameArc) {
    return (
      <span title={title} className="inline-flex">
        {face}
      </span>
    );
  }

  const arcCompact = size === "list" || size === "sm" || size === "card";
  return (
    <span
      title={title}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-visible ${
        arcCompact ? "h-6 w-7" : "h-8 w-9"
      }`}
    >
      <AvatarNameArc label={arcLabel} pathId={pathId} compact={arcCompact} />
      <span className="relative z-0">{face}</span>
    </span>
  );
}

export function mergeKanbanPickerUsers(
  crmList: readonly KanbanCrmUserRow[],
  boardUsers: KanbanUser[],
  excludedCrmUserIds?: readonly string[] | null,
): Array<KanbanCrmUserRow | KanbanUser> {
  const excl = new Set(
    (excludedCrmUserIds || [])
      .map((x) => String(x || "").trim())
      .filter(Boolean),
  );
  const seen = new Set<string>();
  const out: Array<KanbanCrmUserRow | KanbanUser> = [];
  for (const u of crmList) {
    if (!u?.id || seen.has(u.id) || excl.has(u.id)) continue;
    seen.add(u.id);
    out.push(u);
  }
  for (const u of boardUsers) {
    if (!u?.id || seen.has(u.id) || excl.has(u.id)) continue;
    seen.add(u.id);
    out.push(u);
  }
  return out;
}

export function pickerRowLabel(row: KanbanUser | KanbanCrmUserRow): string {
  if ("displayName" in row) return row.displayName;
  return row.name;
}
