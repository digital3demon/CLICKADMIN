"use client";

import type { CardComment, CardFile, KanbanBoard, KanbanCard } from "@/lib/kanban/types";
import {
  isCardFileImage,
  isPdfMime,
  openOrDownloadCardFile,
  readFileAsCardFile,
} from "@/lib/kanban/card-files";
import {
  deleteOrderAttachmentById,
  fetchOrderKaitenCommentsForKanban,
  patchOrderKaitenCard,
  postOrderKaitenComment,
  uploadOrderAttachmentFromFile,
} from "@/lib/kanban/kaiten-linked-kanban-sync";
import { isOrderChatCorrectionTrigger } from "@/lib/order-chat-correction";
import { isOrderProstheticsRequestTrigger } from "@/lib/order-prosthetics-request";
import { kaitenClientPollIntervalMs } from "@/lib/kaiten-client-poll-ms";
import {
  findCard,
  formatBlockedAt,
  formatDate,
  formatDateTimeRu,
  generateId,
  deadlineHintKind,
  isCardBlocked,
  kaitenCardTypes,
  performUnblock,
  pushActivity,
  relativeTimeRu,
  trackLanes,
  tryBlockCard,
  userNameById,
} from "@/lib/kanban/model";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DeadlineTomorrowHint } from "./DeadlineTomorrowHint";
import { useKanbanCrmUsers } from "./kanban-crm-users-context";
import {
  KanbanPersonAvatar,
  mergeKanbanPickerUsers,
  pickerRowLabel,
} from "./KanbanPersonAvatar";
import {
  IconArrowRight,
  IconBrick,
  IconLink,
  IconPlus,
  IconSend,
  IconUnlock,
  IconX,
} from "./kanban-icons";

/** Короткая подпись расширения для бейджа слева от имени файла. */
function cardFileExtensionLabel(fileName: string, mime: string): string {
  const base = fileName.trim();
  const dot = base.lastIndexOf(".");
  if (dot >= 0 && dot < base.length - 1) {
    const ext = base.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, "");
    if (ext) return ext.length > 5 ? ext.slice(0, 5).toUpperCase() : ext.toUpperCase();
  }
  const sub = (mime || "").split("/")[1];
  if (sub) {
    const short = sub.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5);
    if (short) return short.toUpperCase();
  }
  return "FILE";
}

type KanbanCardModalProps = {
  cardId: string | null;
  board: KanbanBoard;
  /** Подпись текущего пользователя для журнала активности. */
  activityActorLabel?: string;
  onClose: () => void;
  onApply: (fn: (b: KanbanBoard) => void) => void;
  toast: (msg: string, err?: boolean) => void;
  onMoveNextStage: (id: string) => void;
  /** Копирует в буфер ссылку на карточку (как в меню на доске). */
  onCopyCardLink: (cardId: string) => void;
  /** Если задано — список дорожек вместо ортопедия/ортодонтия (демо: одна доска). */
  trackLaneOptions?: { id: string; name: string }[];
  /** Подпись поля дорожки; по умолчанию «Расположение (дорожка)». */
  trackLaneFieldLabel?: string;
  /** Демо: тип карточки без Kaiten сохраняется через PATCH наряда. */
  isDemo?: boolean;
  /** id пользователя CRM для комментариев в Kaiten (иначе первый участник доски). */
  commentAuthorUserId?: string | null;
};

export function KanbanCardModal({
  cardId,
  board,
  activityActorLabel,
  onClose,
  onApply,
  toast,
  onMoveNextStage,
  onCopyCardLink,
  trackLaneOptions,
  trackLaneFieldLabel,
  isDemo = false,
  commentAuthorUserId,
}: KanbanCardModalProps) {
  const [rightTab, setRightTab] = useState<"chat" | "act">("chat");
  const [blockPopupOpen, setBlockPopupOpen] = useState(false);
  const [blockReasonDraft, setBlockReasonDraft] = useState("");
  const [pickerMode, setPickerMode] = useState<null | "assign" | "part">(null);
  const [pickerIds, setPickerIds] = useState<string[]>([]);
  const [pickerQuery, setPickerQuery] = useState("");
  const { byId: crmById, list: crmList } = useKanbanCrmUsers();
  const [descDraft, setDescDraft] = useState("");
  const [fileViewer, setFileViewer] = useState<
    | null
    | { mode: "image"; images: CardFile[]; index: number }
    | { mode: "pdf"; pdfs: CardFile[]; index: number }
  >(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const found = cardId ? findCard(board, cardId) : null;
  const card = found?.card;
  const act = (activityActorLabel ?? "").trim() || undefined;

  const closeFileViewer = useCallback(() => setFileViewer(null), []);

  const viewerGoPrev = useCallback(() => {
    setFileViewer((v) => {
      if (!v) return v;
      const L = v.mode === "image" ? v.images.length : v.pdfs.length;
      if (L <= 1) return v;
      const idx = (v.index - 1 + L) % L;
      return v.mode === "image"
        ? { mode: "image", images: v.images, index: idx }
        : { mode: "pdf", pdfs: v.pdfs, index: idx };
    });
  }, []);

  const viewerGoNext = useCallback(() => {
    setFileViewer((v) => {
      if (!v) return v;
      const L = v.mode === "image" ? v.images.length : v.pdfs.length;
      if (L <= 1) return v;
      const idx = (v.index + 1) % L;
      return v.mode === "image"
        ? { mode: "image", images: v.images, index: idx }
        : { mode: "pdf", pdfs: v.pdfs, index: idx };
    });
  }, []);

  useEffect(() => {
    if (!card || !titleRef.current) return;
    titleRef.current.textContent = card.title;
  }, [card?.id, card?.title]);

  useEffect(() => {
    setRightTab("chat");
    setBlockReasonDraft("");
    setBlockPopupOpen(false);
    setPickerMode(null);
    setFileViewer(null);
  }, [cardId]);

  useEffect(() => {
    if (card) setDescDraft(card.description || "");
  }, [cardId, card?.description]);

  useEffect(() => {
    if (pickerMode === "assign" && card) {
      setPickerIds([...(card.assignees || [])]);
    } else if (pickerMode === "part" && card) {
      setPickerIds([...(card.participants || [])]);
    }
    setPickerQuery("");
  }, [pickerMode, card?.id, cardId]);

  const linkedOrderId = card?.linkedOrderId;
  const kaitenCardIdForChat = card?.kaitenCardId;
  const chatActorUserId =
    (commentAuthorUserId ?? "").trim() || board.users[0]?.id || "";

  useEffect(() => {
    if (
      !cardId ||
      !linkedOrderId ||
      kaitenCardIdForChat == null ||
      !Number.isFinite(kaitenCardIdForChat)
    ) {
      return;
    }
    let cancelled = false;
    const load = (opts?: { refresh?: boolean }) => {
      if (cancelled) return;
      if (document.visibilityState !== "visible" && !opts?.refresh) return;
      void (async () => {
        const snap = await fetchOrderKaitenCommentsForKanban(
          linkedOrderId,
          chatActorUserId,
          { refresh: opts?.refresh },
        );
        if (cancelled || !snap.ok) return;
        onApply((b) => {
          const fc = findCard(b, cardId);
          if (!fc) return;
          fc.card.comments = snap.comments;
        });
      })();
    };
    load();
    const pollMs = kaitenClientPollIntervalMs();
    const iv = window.setInterval(() => load(), pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [cardId, linkedOrderId, kaitenCardIdForChat, chatActorUserId, onApply]);

  const pickerMerged = useMemo(
    () => mergeKanbanPickerUsers(crmList, board.users),
    [crmList, board.users],
  );

  const pickerFiltered = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return pickerMerged;
    return pickerMerged.filter((r) => {
      if (pickerRowLabel(r).toLowerCase().includes(q)) return true;
      if ("email" in r && typeof r.email === "string" && r.email.toLowerCase().includes(q)) {
        return true;
      }
      return false;
    });
  }, [pickerMerged, pickerQuery]);

  if (!cardId || !card) return null;

  const blocked = isCardBlocked(card);
  const dueHintKind = deadlineHintKind(card.dueDate);

  const openBlockPopup = () => {
    if (blocked) return;
    setBlockReasonDraft("");
    setBlockPopupOpen(true);
  };

  const confirmBlock = () => {
    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      const ok = tryBlockCard(fc.card, b, blockReasonDraft, act);
      if (!ok) toast("Укажите причину остановки работы", true);
      else {
        setBlockPopupOpen(false);
        setBlockReasonDraft("");
      }
    });
  };

  const savePicker = () => {
    if (!pickerMode) return;
    if (pickerMode === "assign") {
      onApply((b) => {
        const fc = findCard(b, cardId);
        if (!fc) return;
        fc.card.assignees = [...pickerIds];
        pushActivity(fc.card, "Изменены ответственные", b.users[0]?.id, b, act);
      });
    } else {
      onApply((b) => {
        const fc = findCard(b, cardId);
        if (!fc) return;
        fc.card.participants = [...pickerIds];
        pushActivity(fc.card, "Изменён состав участников", b.users[0]?.id, b, act);
      });
    }
    setPickerMode(null);
  };

  const togglePickerId = (uid: string) => {
    setPickerIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid],
    );
  };

  const addCheckItem = () => {
    if (blocked) return;
    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      fc.card.checklist.push({
        id: generateId("ch"),
        text: "Новый пункт",
        completed: false,
      });
    });
  };

  const sendComment = async (text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (blocked || !trimmed) return false;
    const linkedKaiten =
      Boolean(card.linkedOrderId) &&
      card.kaitenCardId != null &&
      Number.isFinite(card.kaitenCardId);

    if (linkedKaiten && card.linkedOrderId) {
      const r = await postOrderKaitenComment(card.linkedOrderId, trimmed);
      if (!r.ok) {
        toast(r.error, true);
        return false;
      }
      const actor = chatActorUserId || board.users[0]?.id || "";
      let snap = await fetchOrderKaitenCommentsForKanban(card.linkedOrderId, actor, {
        refresh: true,
      });
      if (!snap.ok) {
        snap = await fetchOrderKaitenCommentsForKanban(card.linkedOrderId, actor);
      }
      if (snap.ok) {
        onApply((b) => {
          const fc = findCard(b, cardId);
          if (!fc) return;
          fc.card.comments = snap.comments;
          pushActivity(fc.card, "Комментарий", actor, b, act);
        });
        return true;
      }
      toast("Сообщение ушло в Kaiten, список чата не обновился — откройте карточку снова", true);
      return true;
    }

    onApply((b) => {
      const fc = findCard(b, cardId);
      if (!fc) return;
      const c = fc.card;
      const actor = b.users[0]?.id ?? "";
      c.comments = c.comments || [];
      c.comments.push({
        id: generateId("cm"),
        userId: actor,
        text: trimmed,
        createdAt: new Date().toISOString(),
      });
      pushActivity(c, "Комментарий", actor, b, act);
    });
    if (
      card.linkedOrderId &&
      (isOrderChatCorrectionTrigger(trimmed) ||
        isOrderProstheticsRequestTrigger(trimmed))
    ) {
      void fetch(`/api/orders/${card.linkedOrderId}/chat-corrections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: trimmed }),
      }).catch(() => {});
    }
    return true;
  };

  const attachFilesFromChat = async (fileList: File[]) => {
    if (blocked || !fileList.length) return;
    const actor = board.users[0]?.id ?? "";
    const linked =
      Boolean(card.linkedOrderId) &&
      card.kaitenCardId != null &&
      Number.isFinite(card.kaitenCardId);
    for (const file of fileList) {
      try {
        let orderAttId: string | undefined;
        if (linked && card.linkedOrderId) {
          const up = await uploadOrderAttachmentFromFile(card.linkedOrderId, file);
          if (!up.ok) {
            toast(up.error, true);
            continue;
          }
          orderAttId = up.id;
        }
        const cf = await readFileAsCardFile(file, actor);
        if (orderAttId) cf.orderAttachmentId = orderAttId;
        onApply((b) => {
          const fc = findCard(b, cardId);
          if (!fc) return;
          fc.card.files = [...(fc.card.files || []), cf];
          fc.card.updatedAt = new Date().toISOString();
          pushActivity(fc.card, `Прикреплён файл: ${cf.name}`, actor, b, act);
          if (isCardFileImage(cf)) {
            fc.card.comments = fc.card.comments || [];
            fc.card.comments.push({
              id: generateId("cm"),
              userId: actor,
              text: "",
              createdAt: new Date().toISOString(),
              imageFileId: cf.id,
            });
          }
        });
      } catch (e) {
        toast(e instanceof Error ? e.message : "Не удалось прочитать файл", true);
      }
    }
  };

  const baseInput =
    "w-full rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1.5 text-[0.8125rem] text-[var(--kaiten-modal-text)]";

  const creatorLabel = card.createdByUserId
    ? (crmById.get(card.createdByUserId)?.displayName ??
      userNameById(board, card.createdByUserId))
    : "—";
  const createdWhen = formatDateTimeRu(card.createdAt);

  const cardImageFiles = (card.files || []).filter((f) => isCardFileImage(f));
  const cardPdfFiles = (card.files || []).filter((f) => isPdfMime(f.mime || "", f.name));

  const openAttachment = (f: CardFile) => {
    if (isCardFileImage(f)) {
      const ix = cardImageFiles.findIndex((x) => x.id === f.id);
      setFileViewer({
        mode: "image",
        images: cardImageFiles,
        index: ix >= 0 ? ix : 0,
      });
    } else if (isPdfMime(f.mime || "", f.name)) {
      const ix = cardPdfFiles.findIndex((x) => x.id === f.id);
      setFileViewer({
        mode: "pdf",
        pdfs: cardPdfFiles,
        index: ix >= 0 ? ix : 0,
      });
    } else {
      openOrDownloadCardFile(f);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      {blockPopupOpen && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setBlockPopupOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)] p-4 text-[var(--kaiten-modal-text)] shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="m-0 text-sm font-semibold">Блокировка карточки</h3>
            <p className="mt-1 text-[0.75rem] text-[var(--kaiten-modal-muted)]">
              Укажите причину. Пока карточка заблокирована, её нельзя редактировать и
              переносить.
            </p>
            <textarea
              value={blockReasonDraft}
              onChange={(e) => setBlockReasonDraft(e.target.value)}
              placeholder="Например: ждём материалы от клиента…"
              rows={4}
              className={`${baseInput} mt-3 resize-y`}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] px-3 py-1.5 text-sm"
                onClick={() => setBlockPopupOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800"
                onClick={confirmBlock}
              >
                Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}

      {pickerMode && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPickerMode(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)] p-4 text-[var(--kaiten-modal-text)] shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="m-0 text-sm font-semibold">
              {pickerMode === "assign" ? "Ответственные" : "Участники"}
            </h3>
            <p className="mt-1 text-[0.75rem] text-[var(--kaiten-modal-muted)]">
              Любой активный пользователь CRM. Ответственные — с золотой обводкой на карточке.
            </p>
            <input
              type="search"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Поиск по имени или email…"
              className={`${baseInput} mt-2`}
            />
            <div className="mt-3 max-h-[240px] space-y-2 overflow-y-auto">
              {pickerFiltered.length === 0 ? (
                <p className="text-[0.8125rem] text-[var(--kaiten-modal-muted)]">
                  {pickerMerged.length === 0
                    ? "Нет пользователей (проверьте доступ к CRM)."
                    : "Никого не найдено."}
                </p>
              ) : (
                pickerFiltered.map((row) => (
                  <label
                    key={row.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--kaiten-modal-border)] px-2 py-1.5 text-[0.8125rem]"
                  >
                    <input
                      type="checkbox"
                      checked={pickerIds.includes(row.id)}
                      onChange={() => togglePickerId(row.id)}
                      className="rounded"
                    />
                    <KanbanPersonAvatar
                      userId={row.id}
                      homeBoard={board}
                      variant={pickerMode === "assign" ? "assignee" : "participant"}
                      size="picker"
                      titleSuffix=""
                    />
                    {pickerRowLabel(row)}
                  </label>
                ))
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--kaiten-modal-border)] px-3 py-1.5 text-sm"
                onClick={() => setPickerMode(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-md bg-[var(--sidebar-blue)] px-3 py-1.5 text-sm font-medium text-white"
                onClick={savePicker}
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="flex w-full max-w-[min(1200px,100vw-24px)] flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {blocked && (
          <div className="flex items-stretch gap-2 rounded-t-[10px] border border-b-0 border-red-900/50 bg-gradient-to-b from-[#dc2626] to-[#b91c1c] px-3 py-2.5 text-white shadow-md dark:from-[#991b1b] dark:to-[#7f1d1d]">
            <IconBrick className="h-5 w-5 shrink-0 text-white" />
            <div className="min-w-0 flex-1">
              <div className="text-[0.65rem] font-bold uppercase tracking-wide opacity-90">
                Работа остановлена
                {card.blockedAt ? ` · ${formatBlockedAt(card.blockedAt)}` : ""}
              </div>
              <div className="mt-0.5 text-[0.8125rem] font-medium leading-snug">
                {(card.blockReason || "").trim() || "—"}
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 self-center rounded-md bg-white/15 px-3 py-1.5 text-[0.75rem] font-semibold text-white hover:bg-white/25"
              onClick={() =>
                onApply((b) => {
                  const fc = findCard(b, cardId);
                  if (!fc) return;
                  performUnblock(fc.card, b, act);
                })
              }
            >
              Снять блокировку
            </button>
          </div>
        )}

        <div
          className={`relative flex min-h-[min(72vh,920px)] max-h-[min(96vh,1400px)] flex-col overflow-hidden border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)] text-[var(--kaiten-modal-text)] shadow-[0_16px_40px_rgba(0,0,0,0.55)] ${
            blocked ? "rounded-b-[10px] rounded-t-none border-t-0" : "rounded-[10px]"
          }`}
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--kaiten-modal-border)] px-4 py-5 sm:gap-4 sm:px-6 sm:py-6">
            <div className="min-w-0 flex-1 pr-1">
              <h2
                ref={titleRef}
                contentEditable={!blocked}
                suppressContentEditableWarning
                className="m-0 break-words text-2xl font-semibold leading-tight tracking-tight text-[var(--kaiten-modal-text)] outline-none sm:text-3xl md:text-4xl"
                onBlur={() => {
                  void (async () => {
                    if (blocked) return;
                    const el = titleRef.current;
                    if (!el) return;
                    const t = (el.textContent || "").trim();
                    if (!t) {
                      el.textContent = card.title;
                      return;
                    }
                    if (t === card.title) return;
                    const ok = window.confirm(
                      `Подтвердите смену заголовка карточки.\n\nБыло: ${card.title}\nСтанет: ${t}`,
                    );
                    if (!ok) {
                      el.textContent = card.title;
                      return;
                    }
                    if (
                      card.linkedOrderId &&
                      card.kaitenCardId != null &&
                      Number.isFinite(card.kaitenCardId)
                    ) {
                      const r = await patchOrderKaitenCard(card.linkedOrderId, { title: t });
                      if (!r.ok) {
                        toast(r.error, true);
                        el.textContent = card.title;
                        return;
                      }
                    }
                    onApply((b) => {
                      const fc = findCard(b, cardId);
                      if (!fc) return;
                      fc.card.title = t;
                      pushActivity(fc.card, "Изменён заголовок", b.users[0]?.id, b, act);
                    });
                  })();
                }}
                onKeyDown={(e) => {
                  if (blocked) return;
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).blur();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    const el = titleRef.current;
                    if (el) el.textContent = card.title;
                    (e.currentTarget as HTMLElement).blur();
                  }
                }}
              />
              <div className="mt-3 text-base leading-relaxed text-emerald-700/95 dark:text-emerald-400/95 sm:mt-4 sm:text-lg">
                <span className="font-semibold">Создал(а):</span> {creatorLabel}
                <span className="text-[var(--kaiten-modal-muted)]"> · </span>
                <span>{createdWhen || "—"}</span>
              </div>
              {card.lastMovedAt && (
                <div className="mt-2 text-sm text-[var(--kaiten-modal-muted)] sm:text-base">
                  Перемещена · {relativeTimeRu(card.lastMovedAt)}
                </div>
              )}
            </div>
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-muted)] hover:text-[var(--kaiten-modal-text)] sm:h-12 sm:w-12"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <IconX className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 border-b border-[var(--kaiten-modal-border)] px-3 py-2.5">
            <button
              type="button"
              title={blocked ? "Снять блокировку" : "Заблокировать карточку"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-muted)] hover:bg-[var(--kaiten-modal-input)] hover:text-[var(--kaiten-modal-text)] disabled:opacity-40"
              disabled={false}
              onClick={() => {
                if (blocked) {
                  onApply((b) => {
                    const fc = findCard(b, cardId);
                    if (!fc) return;
                    performUnblock(fc.card, b, act);
                  });
                } else openBlockPopup();
              }}
            >
              {blocked ? <IconUnlock className="h-4 w-4" /> : <IconBrick className="h-4 w-4" />}
            </button>
            <button
              type="button"
              title="Следующий столбец"
              disabled={blocked}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-text)] disabled:opacity-40"
              onClick={() => onMoveNextStage(cardId)}
            >
              <IconArrowRight />
            </button>
            <div className="mx-1 h-6 w-px bg-[var(--kaiten-modal-border)]" aria-hidden />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                Отв.
              </span>
              {(card.assignees || []).map((uid) => (
                <span key={uid} className={blocked ? "opacity-50" : ""}>
                  <KanbanPersonAvatar
                    userId={uid}
                    homeBoard={board}
                    variant="assignee"
                    size="md"
                    titleSuffix=""
                  />
                </span>
              ))}
              <button
                type="button"
                disabled={blocked}
                title="Добавить ответственного"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-[var(--kaiten-modal-muted)] text-[var(--kaiten-modal-muted)] hover:bg-[var(--kaiten-modal-control)] disabled:opacity-40"
                onClick={() => setPickerMode("assign")}
              >
                <IconPlus />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pl-1">
              <span className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                Участн.
              </span>
              {(card.participants || []).map((uid) => (
                <span key={uid} className={blocked ? "opacity-50" : ""}>
                  <KanbanPersonAvatar
                    userId={uid}
                    homeBoard={board}
                    variant="participant"
                    size="md"
                    titleSuffix=""
                  />
                </span>
              ))}
              <button
                type="button"
                disabled={blocked}
                title="Добавить участника"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-[var(--kaiten-modal-muted)] text-[var(--kaiten-modal-muted)] hover:bg-[var(--kaiten-modal-control)] disabled:opacity-40"
                onClick={() => setPickerMode("part")}
              >
                <IconPlus />
              </button>
            </div>
            <button
              type="button"
              title="Скопировать ссылку на карточку"
              aria-label="Поделиться — копировать ссылку"
              className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] px-2.5 text-[var(--kaiten-modal-muted)] hover:bg-[var(--kaiten-modal-input)] hover:text-[var(--kaiten-modal-text)]"
              onClick={() => onCopyCardLink(cardId)}
            >
              <IconLink className="h-4 w-4 shrink-0" />
              <span className="hidden text-[0.65rem] font-semibold uppercase tracking-wide sm:inline">
                Поделиться
              </span>
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-2.5">
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                    {trackLaneFieldLabel ?? "Расположение (дорожка)"}
                  </div>
                  <select
                    className={baseInput}
                    disabled={blocked}
                    value={card.trackLane || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onApply((b) => {
                        const fc = findCard(b, cardId);
                        if (!fc) return;
                        fc.card.trackLane = v;
                        pushActivity(
                          fc.card,
                          trackLaneFieldLabel ? "Изменена доска" : "Изменена дорожка",
                          b.users[0]?.id,
                          b,
                          act,
                        );
                      });
                    }}
                  >
                    <option value="">— не выбрано —</option>
                    {(trackLaneOptions ?? [...trackLanes()]).map((lane) => (
                      <option key={lane.id} value={lane.id}>
                        {lane.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                    Тип карточки
                  </div>
                  <select
                    className={baseInput}
                    disabled={blocked}
                    value={card.cardTypeId || ""}
                    onChange={(e) => {
                      void (async () => {
                        const v = e.target.value;
                        if (blocked) return;
                        if (card.linkedOrderId) {
                          const hasKaiten =
                            card.kaitenCardId != null &&
                            Number.isFinite(card.kaitenCardId);
                          if (hasKaiten) {
                            const r = await patchOrderKaitenCard(card.linkedOrderId, {
                              kaitenCardTypeId: v.trim() ? v : null,
                            });
                            if (!r.ok) {
                              toast(r.error, true);
                              return;
                            }
                          } else if (isDemo) {
                            const res = await fetch(
                              `/api/orders/${card.linkedOrderId}`,
                              {
                                method: "PATCH",
                                credentials: "include",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  kaitenCardTypeId: v.trim() ? v : null,
                                }),
                              },
                            );
                            const data = (await res.json().catch(() => ({}))) as {
                              error?: string;
                            };
                            if (!res.ok) {
                              toast(
                                typeof data.error === "string"
                                  ? data.error
                                  : "Не удалось сохранить тип карточки",
                                true,
                              );
                              return;
                            }
                          }
                        }
                        onApply((b) => {
                          const fc = findCard(b, cardId);
                          if (!fc) return;
                          fc.card.cardTypeId = v;
                          pushActivity(
                            fc.card,
                            "Изменён тип карточки",
                            b.users[0]?.id,
                            b,
                            act,
                          );
                        });
                      })();
                    }}
                  >
                    <option value="">— не выбран —</option>
                    {(board.cardTypes || kaitenCardTypes()).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-wide text-amber-800/90 dark:text-amber-300/90">
                  Внутренний срок
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    className={`${baseInput} max-w-[12rem]`}
                    disabled={blocked}
                    value={card.dueDate || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onApply((b) => {
                        const fc = findCard(b, cardId);
                        if (!fc) return;
                        fc.card.dueDate = v;
                        pushActivity(fc.card, "Изменён срок", b.users[0]?.id, b, act);
                      });
                    }}
                  />
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-wide transition-colors ${
                      card.urgent
                        ? "border-orange-600/80 bg-gradient-to-b from-orange-500 to-red-600 text-white shadow-sm"
                        : "border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-muted)] hover:border-orange-400/50 hover:text-orange-700 dark:hover:text-orange-300"
                    }`}
                    title={
                      card.urgent
                        ? "Снять метку «Срочно» (срок не меняется)"
                        : "Пометить как срочное (срок не меняется)"
                    }
                    onClick={() =>
                      onApply((b) => {
                        const fc = findCard(b, cardId);
                        if (!fc) return;
                        const next = !fc.card.urgent;
                        fc.card.urgent = next;
                        pushActivity(
                          fc.card,
                          next ? "Отмечена как срочная" : "Снята метка «Срочно»",
                          b.users[0]?.id,
                          b,
                          act,
                        );
                      })
                    }
                  >
                    Срочно
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <div className="mb-1 text-[0.625rem] font-medium uppercase tracking-wide text-sky-800/90 dark:text-sky-300/90">
                  Описание и детали заказа
                </div>
                <div className="grid min-h-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(10.5rem,34%)] sm:items-stretch">
                  <textarea
                    className={`${baseInput} min-h-[100px] resize-y sm:min-h-[120px]`}
                    disabled={blocked}
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    onBlur={() => {
                      void (async () => {
                        if (blocked) return;
                        if (descDraft === (card.description || "")) return;
                        if (
                          card.linkedOrderId &&
                          card.kaitenCardId != null &&
                          Number.isFinite(card.kaitenCardId)
                        ) {
                          const r = await patchOrderKaitenCard(card.linkedOrderId, {
                            description: descDraft,
                          });
                          if (!r.ok) {
                            toast(r.error, true);
                            setDescDraft(card.description || "");
                            return;
                          }
                        }
                        onApply((b) => {
                          const fc = findCard(b, cardId);
                          if (!fc) return;
                          fc.card.description = descDraft;
                          pushActivity(fc.card, "Обновлено описание", b.users[0]?.id, b, act);
                        });
                      })();
                    }}
                  />
                  <aside
                    className={`flex min-h-[100px] flex-col rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] p-1.5 sm:min-h-[120px] sm:max-h-[min(22rem,50vh)]`}
                  >
                    <div className="mb-1 shrink-0 text-[0.55rem] font-semibold uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                      Файлы наряда и чата
                    </div>
                    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden">
                      {(card.files || []).length === 0 ? (
                        <p className="m-0 px-0.5 py-1 text-[0.7rem] leading-snug text-[var(--kaiten-modal-muted)]">
                          Вложения из наряда подтягиваются сюда автоматически. Чтобы отправить ещё файл в Kaiten и
                          обсудить в чате — перетащите его в область чата справа.
                        </p>
                      ) : (
                        (card.files || []).map((f) => (
                          <div
                            key={f.id}
                            className="group relative rounded border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-bg)] py-0.5 pl-1 pr-7"
                          >
                            <button
                              type="button"
                              disabled={blocked}
                              className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded px-0.5 py-0.5 text-left transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => openAttachment(f)}
                              title={f.name}
                            >
                              <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[var(--kaiten-modal-border)] bg-black/25 px-0.5 text-center text-[0.5rem] font-bold uppercase leading-tight tracking-tight text-[var(--kaiten-modal-muted)]"
                                aria-hidden
                              >
                                {cardFileExtensionLabel(f.name, f.mime)}
                              </span>
                              <span className="min-w-0 flex-1 break-words text-left text-[0.7rem] leading-snug text-[var(--kaiten-modal-text)] line-clamp-3">
                                {f.name}
                              </span>
                            </button>
                            {!blocked ? (
                              <button
                                type="button"
                                className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded bg-[var(--kaiten-modal-bg)]/90 p-0.5 text-[var(--kaiten-modal-muted)] opacity-0 shadow-sm ring-1 ring-[var(--kaiten-modal-border)] transition-opacity hover:text-red-500 group-hover:opacity-100"
                                title="Убрать файл"
                                aria-label="Убрать файл"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void (async () => {
                                    if (f.orderAttachmentId && card.linkedOrderId) {
                                      const del = await deleteOrderAttachmentById(
                                        card.linkedOrderId,
                                        f.orderAttachmentId,
                                      );
                                      if (!del.ok) {
                                        toast(del.error, true);
                                        return;
                                      }
                                    }
                                    onApply((b) => {
                                      const fc = findCard(b, cardId);
                                      if (!fc) return;
                                      fc.card.files = (fc.card.files || []).filter(
                                        (x) => x.id !== f.id,
                                      );
                                      fc.card.updatedAt = new Date().toISOString();
                                      pushActivity(
                                        fc.card,
                                        `Удалён файл: ${f.name}`,
                                        b.users[0]?.id,
                                        b,
                                        act,
                                      );
                                    });
                                  })();
                                }}
                              >
                                <IconX className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </aside>
                </div>
              </div>

              <div className="mb-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[0.625rem] font-medium uppercase tracking-wide text-[var(--kaiten-modal-muted)]">
                    Чеклист
                  </span>
                  <button
                    type="button"
                    disabled={blocked}
                    className="text-[0.75rem] text-[var(--kaiten-modal-muted)] hover:text-[var(--kaiten-modal-text)] disabled:opacity-40"
                    onClick={addCheckItem}
                  >
                    + Пункт
                  </button>
                </div>
                <ChecklistEditor
                  card={card}
                  cardId={cardId}
                  blocked={blocked}
                  onApply={onApply}
                  activityActorLabel={act}
                  kaitenLinked={
                    Boolean(
                      card.linkedOrderId &&
                        card.kaitenCardId != null &&
                        Number.isFinite(card.kaitenCardId),
                    )
                  }
                />
              </div>

              {blocked && (
                <p className="mt-2 text-[0.75rem] text-[var(--kaiten-modal-muted)]">
                  Карточка заблокирована. Снимите блокировку, чтобы снова менять поля и
                  переносить её.
                </p>
              )}
              </div>

              {dueHintKind !== "none" ? (
                <div className="shrink-0 px-3 pb-0 pt-1">
                  <DeadlineTomorrowHint />
                </div>
              ) : null}
            </div>

            <div className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-t border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-aside)] sm:w-[min(400px,42%)] sm:max-w-md sm:border-l sm:border-t-0">
              <div className="flex overflow-hidden rounded-md border border-[var(--kaiten-modal-border)]">
                <button
                  type="button"
                  className={`flex-1 px-2 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide ${
                    rightTab === "chat"
                      ? "bg-[var(--kaiten-modal-control)] text-[var(--kaiten-accent)] shadow-[inset_0_-2px_0_0_var(--kaiten-accent)]"
                      : "bg-[var(--kaiten-modal-bg)] text-[var(--kaiten-modal-muted)]"
                  }`}
                  onClick={() => setRightTab("chat")}
                >
                  Чат карточки
                </button>
                <button
                  type="button"
                  className={`flex-1 px-2 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide ${
                    rightTab === "act"
                      ? "bg-[var(--kaiten-modal-control)] text-[var(--kaiten-accent)] shadow-[inset_0_-2px_0_0_var(--kaiten-accent)]"
                      : "bg-[var(--kaiten-modal-bg)] text-[var(--kaiten-modal-muted)]"
                  }`}
                  onClick={() => setRightTab("act")}
                >
                  Активность
                </button>
              </div>
              {rightTab === "chat" ? (
                <ChatPanel
                  card={card}
                  board={board}
                  blocked={blocked}
                  onSend={sendComment}
                  onFilesDropped={attachFilesFromChat}
                  onOpenAttachment={openAttachment}
                />
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 text-[0.8125rem]">
                  {(card.activity || []).slice(0, 40).map((a) => {
                    const u = board.users.find((x) => x.id === a.userId);
                    const name =
                      (a.actorLabel || "").trim() ||
                      crmById.get(a.userId)?.displayName ||
                      u?.name ||
                      "—";
                    return (
                      <div
                        key={a.id}
                        className="mb-2 border-b border-[var(--kaiten-modal-border)]/50 pb-2 last:border-0"
                      >
                        <span className="text-[var(--kaiten-modal-muted)]">
                          {relativeTimeRu(a.at)}
                        </span>
                        {" · "}
                        {name}: {a.text}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {fileViewer ? (
        <CardAttachmentViewerOverlay
          state={fileViewer}
          onClose={closeFileViewer}
          onPrev={viewerGoPrev}
          onNext={viewerGoNext}
        />
      ) : null}
    </div>
  );
}

type AttachmentViewerState =
  | { mode: "image"; images: CardFile[]; index: number }
  | { mode: "pdf"; pdfs: CardFile[]; index: number };

function CardAttachmentViewerOverlay({
  state,
  onClose,
  onPrev,
  onNext,
}: {
  state: AttachmentViewerState;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      const len = state.mode === "image" ? state.images.length : state.pdfs.length;
      if (len <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onClose, onPrev, onNext]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const count = state.mode === "image" ? state.images.length : state.pdfs.length;
  const current =
    state.mode === "image" ? state.images[state.index] : state.pdfs[state.index];
  if (!current) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex flex-col items-center justify-center bg-black/88 p-2 sm:p-4"
      role="dialog"
      aria-modal
      aria-label={state.mode === "image" ? "Просмотр изображений" : "Просмотр PDF"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(96vh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/15 bg-zinc-950 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-white">
          <span className="min-w-0 truncate text-sm font-medium" title={current.name}>
            {current.name}
          </span>
          <div className="flex shrink-0 items-center gap-2">
            {count > 1 ? (
              <span className="text-xs tabular-nums text-white/65">
                {state.index + 1} / {count}
              </span>
            ) : null}
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/85 hover:bg-white/10 hover:text-white"
              onClick={onClose}
              aria-label="Закрыть"
            >
              <IconX className="h-5 w-5" />
            </button>
          </div>
        </header>
        <div className="relative min-h-0 flex-1 bg-black">
          {count > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-xl text-white hover:bg-black/75 sm:left-2"
                aria-label="Предыдущий файл"
                onClick={onPrev}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-xl text-white hover:bg-black/75 sm:right-2"
                aria-label="Следующий файл"
                onClick={onNext}
              >
                ›
              </button>
            </>
          ) : null}
          {state.mode === "image" ? (
            <div className="flex h-[min(82vh,800px)] min-h-[200px] items-center justify-center p-2 sm:p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.dataUrl}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <iframe
              title={current.name}
              src={current.dataUrl}
              className="h-[min(82vh,800px)] min-h-[320px] w-full border-0 bg-white"
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

type ChatRenderBlock =
  | { kind: "imageRow"; key: string; comments: CardComment[] }
  | { kind: "message"; comment: CardComment };

function resolveChatImageFile(card: KanbanCard, cm: CardComment) {
  if (!cm.imageFileId) return undefined;
  return (card.files || []).find((f) => f.id === cm.imageFileId);
}

/** Сначала все превью изображений (как в наряде), затем текст — визуально галерея всегда сверху. */
function orderCommentsImagesFirst(comments: CardComment[], card: KanbanCard): CardComment[] {
  const imgs: CardComment[] = [];
  const rest: CardComment[] = [];
  for (const cm of comments) {
    if (!cm.imageFileId) {
      rest.push(cm);
      continue;
    }
    const f = resolveChatImageFile(card, cm);
    if (f && isCardFileImage(f)) imgs.push(cm);
    else rest.push(cm);
  }
  return [...imgs, ...rest];
}

/** Подряд идущие сообщения с картинками — один блок, сетка по 3 в ряд. */
function buildChatRenderBlocks(comments: CardComment[], card: KanbanCard): ChatRenderBlock[] {
  const list = orderCommentsImagesFirst(comments || [], card);
  const out: ChatRenderBlock[] = [];
  let i = 0;
  while (i < list.length) {
    const cm = list[i];
    const f = resolveChatImageFile(card, cm);
    if (f && isCardFileImage(f)) {
      const group: CardComment[] = [];
      while (i < list.length) {
        const c = list[i];
        const cf = resolveChatImageFile(card, c);
        if (!cf || !isCardFileImage(cf)) break;
        group.push(c);
        i++;
      }
      out.push({ kind: "imageRow", key: group[0].id, comments: group });
      continue;
    }
    out.push({ kind: "message", comment: cm });
    i++;
  }
  return out;
}

function ChatPanel({
  card,
  board,
  blocked,
  onSend,
  onFilesDropped,
  onOpenAttachment,
}: {
  card: KanbanCard;
  board: KanbanBoard;
  blocked: boolean;
  onSend: (t: string) => boolean | Promise<boolean>;
  onFilesDropped: (files: File[]) => void | Promise<void>;
  onOpenAttachment: (f: CardFile) => void;
}) {
  const { byId: crmChatById } = useKanbanCrmUsers();
  const ref = useRef<HTMLDivElement>(null);
  const [inp, setInp] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const chatAuthorName = (userId: string, authorLabel?: string) => {
    const lab = (authorLabel ?? "").trim();
    if (lab) return lab;
    return (
      crmChatById.get(userId)?.displayName ??
      board.users.find((x) => x.id === userId)?.name ??
      "Неизвестно"
    );
  };
  const chatBlocks = useMemo(
    () => buildChatRenderBlocks(card.comments || [], card),
    [card.comments, card.files, card.id],
  );

  const lastChatCardIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (lastChatCardIdRef.current !== card.id) {
      lastChatCardIdRef.current = card.id;
      ref.current.scrollTop = 0;
      return;
    }
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [card.id, card.comments?.length, card.files?.length, chatBlocks.length]);

  const flushFiles = (list: FileList | File[]) => {
    const arr = Array.from(list).filter((f) => f.size > 0);
    if (!arr.length) return;
    void Promise.resolve(onFilesDropped(arr));
  };

  const submitMessage = async () => {
    const v = inp.trim();
    if (!v) return;
    const ok = await Promise.resolve(onSend(v));
    if (ok) setInp("");
  };

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col transition-[box-shadow] ${
        dragOver && !blocked
          ? "ring-2 ring-[var(--kaiten-accent)] ring-inset ring-offset-0"
          : ""
      }`}
      onDragEnter={(e) => {
        if (blocked) return;
        if (e.dataTransfer?.types?.includes("Files")) setDragOver(true);
      }}
      onDragOver={(e) => {
        if (blocked) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (blocked) return;
        if (e.dataTransfer.files?.length) flushFiles(e.dataTransfer.files);
      }}
    >
      <div ref={ref} className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {chatBlocks.map((block) => {
          if (block.kind === "imageRow") {
            const cm0 = block.comments[0];
            const author0 = chatAuthorName(cm0.userId, cm0.authorLabel);
            return (
              <div
                key={block.key}
                className="mb-2 rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1.5 text-[0.8125rem] text-[var(--kaiten-modal-text)]"
              >
                <div className="mb-0.5 text-[0.7rem] text-[var(--kaiten-modal-muted)]">
                  {author0} · {relativeTimeRu(cm0.createdAt)}
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {block.comments.map((cm) => {
                    const imgFile = resolveChatImageFile(card, cm)!;
                    return (
                      <button
                        key={cm.id}
                        type="button"
                        className="group flex min-w-0 cursor-zoom-in flex-col gap-0.5 text-left transition-opacity hover:opacity-95"
                        title={imgFile.name}
                        onClick={() => onOpenAttachment(imgFile)}
                      >
                        <div className="aspect-square w-full overflow-hidden rounded-md border border-[var(--kaiten-modal-border)] bg-black/20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgFile.dataUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="line-clamp-2 break-all text-[0.55rem] leading-tight text-[var(--kaiten-modal-muted)]">
                          {cm.text.trim() || imgFile.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          const cm = block.comment;
          const author = chatAuthorName(cm.userId, cm.authorLabel);
          const imgFile = resolveChatImageFile(card, cm);

          return (
            <div
              key={cm.id}
              className="mb-2 rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1.5 text-[0.8125rem] text-[var(--kaiten-modal-text)]"
            >
              <div className="mb-0.5 text-[0.7rem] text-[var(--kaiten-modal-muted)]">
                {author} · {relativeTimeRu(cm.createdAt)}
              </div>
              {cm.imageFileId && !imgFile ? (
                <div className="mt-0.5 text-[0.75rem] text-[var(--kaiten-modal-muted)]">
                  Изображение удалено из карточки
                  {cm.text.trim() ? (
                    <span className="mt-0.5 block whitespace-pre-wrap break-words text-[var(--kaiten-modal-text)]">
                      {cm.text}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words">{cm.text}</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 border-t border-[var(--kaiten-modal-border)] p-2">
        <input
          type="text"
          className="min-w-0 flex-1 rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-2 py-1.5 text-[0.8125rem] text-[var(--kaiten-modal-text)] placeholder:text-[var(--kaiten-modal-muted)]"
          placeholder="Сообщение в чат (в т.ч. обсуждение файлов)…"
          disabled={blocked}
          value={inp}
          onChange={(e) => setInp(e.target.value)}
          onPaste={(e) => {
            const files = e.clipboardData?.files;
            if (files?.length) {
              e.preventDefault();
              flushFiles(files);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submitMessage();
            }
          }}
        />
        <button
          type="button"
          disabled={blocked}
          className="shrink-0 rounded-md border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] px-2 py-1.5 text-[var(--kaiten-modal-muted)] hover:text-[var(--kaiten-modal-text)] disabled:opacity-40"
          onClick={() => {
            void submitMessage();
          }}
        >
          <IconSend />
        </button>
      </div>
    </div>
  );
}

/** 16 лучей — плотнее и заметнее круг. */
const CHECKLIST_SPARK_ANGLES = Array.from({ length: 16 }, (_, i) => i * 22.5);
const CHECKLIST_SPARK_COLORS = [
  "#ff006e",
  "#ffbe0b",
  "#3a86ff",
  "#8338ec",
  "#fb5607",
  "#06ffa5",
  "#ffe066",
  "#f15bb5",
  "#00bbf9",
  "#fee440",
  "#9b5de5",
  "#f72585",
  "#4cc9f0",
  "#ffd60a",
  "#06d6a0",
  "#ef476f",
] as const;

function ChecklistCheckboxWithFirework({
  completed,
  disabled,
  onToggle,
}: {
  completed: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [burst, setBurst] = useState<null | { cx: number; cy: number; key: number }>(
    null,
  );

  useEffect(() => {
    if (!burst) return;
    const t = window.setTimeout(() => setBurst(null), 680);
    return () => window.clearTimeout(t);
  }, [burst]);

  const burstPortal =
    burst &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className="pointer-events-none fixed z-[500]"
        style={
          {
            left: burst.cx,
            top: burst.cy,
            transform: "translate(-50%, -50%)",
          } as CSSProperties
        }
        aria-hidden
      >
        <div className="relative h-0 w-0">
          {CHECKLIST_SPARK_ANGLES.map((deg, i) => (
            <span
              key={`${burst.key}-${i}`}
              className="checklist-spark-arm"
              style={{ transform: `rotate(${deg}deg)` }}
            >
              <span
                className="checklist-spark-dot"
                style={
                  {
                    backgroundColor:
                      CHECKLIST_SPARK_COLORS[i % CHECKLIST_SPARK_COLORS.length],
                    color: CHECKLIST_SPARK_COLORS[i % CHECKLIST_SPARK_COLORS.length],
                    animationDelay: `${i * 32}ms`,
                  } as CSSProperties
                }
              />
            </span>
          ))}
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      {burstPortal}
      <span
        ref={wrapRef}
        className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center"
      >
        <input
          type="checkbox"
          className="relative z-[1] h-4 w-4 shrink-0 cursor-pointer accent-[var(--kaiten-accent,#9333ea)] disabled:cursor-not-allowed"
          checked={completed}
          disabled={disabled}
          onChange={() => {
            if (!completed && wrapRef.current) {
              const r = wrapRef.current.getBoundingClientRect();
              setBurst({
                cx: r.left + r.width / 2,
                cy: r.top + r.height / 2,
                key: Date.now(),
              });
            }
            onToggle();
          }}
        />
      </span>
    </>
  );
}

function ChecklistEditor({
  card,
  cardId,
  blocked,
  onApply,
  activityActorLabel,
  kaitenLinked,
}: {
  card: KanbanCard;
  cardId: string;
  blocked: boolean;
  onApply: (fn: (b: KanbanBoard) => void) => void;
  activityActorLabel?: string;
  kaitenLinked?: boolean;
}) {
  const cl = card.checklist || [];
  const done = cl.filter((i) => i.completed).length;
  const total = cl.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      {cl.map((item) => (
        <div key={item.id} className="mb-1 flex items-center gap-2">
          <ChecklistCheckboxWithFirework
            completed={item.completed}
            disabled={blocked}
            onToggle={() =>
              onApply((b) => {
                const fc = findCard(b, cardId);
                if (!fc) return;
                const it = fc.card.checklist.find((x) => x.id === item.id);
                if (!it) return;
                it.completed = !it.completed;
                pushActivity(fc.card, `Чеклист: ${it.text}`, b.users[0]?.id, b, activityActorLabel);
              })
            }
          />
          <input
            type="text"
            className="min-w-0 flex-1 rounded border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-input)] px-1.5 py-0.5 text-[0.8125rem] text-[var(--kaiten-modal-text)]"
            disabled={blocked}
            defaultValue={item.text}
            onBlur={(e) => {
              const v = e.target.value;
              if (v === item.text) return;
              onApply((b) => {
                const fc = findCard(b, cardId);
                if (!fc) return;
                const it = fc.card.checklist.find((x) => x.id === item.id);
                if (it) it.text = v;
              });
            }}
          />
          <button
            type="button"
            disabled={blocked}
            className="text-[var(--kaiten-modal-muted)] hover:text-[var(--kaiten-modal-text)] disabled:opacity-40"
            onClick={() =>
              onApply((b) => {
                const fc = findCard(b, cardId);
                if (!fc) return;
                fc.card.checklist = fc.card.checklist.filter((x) => x.id !== item.id);
              })
            }
          >
            <IconX />
          </button>
        </div>
      ))}
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 max-w-[280px] flex-1 overflow-hidden rounded-full bg-[var(--kaiten-modal-border)]">
          <div
            className="h-full rounded-full bg-[var(--kaiten-accent)]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[0.75rem] text-[var(--kaiten-modal-muted)]">
          {done} из {total}
        </span>
      </div>
      {kaitenLinked ? (
        <p className="mt-2 text-[0.65rem] leading-snug text-[var(--kaiten-modal-muted)]">
          Чеклист здесь — только в CRM-канбане; нативный чеклист Kaiten в API не
          синхронизируется. Чат, заголовок, описание и файлы (как вложения наряда)
          уходят в Kaiten.
        </p>
      ) : null}
    </div>
  );
}
