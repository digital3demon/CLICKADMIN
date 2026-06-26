"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderSourceEmail } from "@/components/orders/new-order-panel-context";
import { buildEmailReplyTemplateContext } from "@/lib/mail/build-email-reply-context";
import {
  defaultReplySubject,
  renderEmailReplyTemplate,
} from "@/lib/mail/email-reply-template";
import {
  extractInlineImagesFromReplyHtml,
  htmlReplyBodyToPlainText,
  mergeReplyHtmlWithImages,
  plainTextToReplyHtml,
} from "@/lib/mail/reply-body-plain-text";
import { substituteReplyTemplateCidsForPreview } from "@/lib/mail/reply-template-cid";

function restoreReplyTemplateCidsFromPreview(
  html: string,
  assets: Array<{ id: string; contentId: string }>,
  accountId: string,
): string {
  let out = html;
  for (const asset of assets) {
    const url = `/api/mail/accounts/${encodeURIComponent(accountId)}/reply-template/assets/${encodeURIComponent(asset.id)}?inline=1`;
    out = out.split(url).join(`cid:${asset.contentId}`);
  }
  return out;
}

export type AutoReplyPreflightDraft = {
  subject: string;
  html: string;
};

export type AutoReplyPreflightState = {
  sendReply: boolean;
  draft: AutoReplyPreflightDraft | null;
  canSendReply: boolean;
  loading: boolean;
  hint: string | null;
};

type Props = {
  open: boolean;
  sourceEmail: OrderSourceEmail | null;
  orderNumberPreview: string;
  patientName: string;
  doctorName: string;
  clinicName: string;
  clinicAddress: string;
  dueDateLocal: string;
  appointmentLocal: string;
  sendReply: boolean;
  onSendReplyChange: (value: boolean) => void;
  onStateChange: (state: AutoReplyPreflightState) => void;
};

function senderLabel(email: OrderSourceEmail): string {
  const name = email.fromName?.trim();
  const addr = email.fromAddress?.trim();
  if (name && addr) return `${name} <${addr}>`;
  return name || addr || "—";
}

export function OrderAutoReplyPreflightPanel({
  open,
  sourceEmail,
  orderNumberPreview,
  patientName,
  doctorName,
  clinicName,
  clinicAddress,
  dueDateLocal,
  appointmentLocal,
  sendReply,
  onSendReplyChange,
  onStateChange,
}: Props) {
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [canSendReply, setCanSendReply] = useState(false);
  const dirtyRef = useRef(false);
  const templateAssetsRef = useRef<Array<{ id: string; contentId: string }>>([]);
  const inlineImagesRef = useRef<string[]>([]);

  const buildHtmlFromBodyText = useCallback((text: string) => {
    return mergeReplyHtmlWithImages(
      inlineImagesRef.current,
      plainTextToReplyHtml(text),
    );
  }, []);

  const buildContext = useCallback(() => {
    if (!sourceEmail) return null;
    return buildEmailReplyTemplateContext({
      orderNumber: orderNumberPreview,
      patientName,
      doctorName,
      clinicName,
      clinicAddress,
      dueDate: dueDateLocal.trim() ? new Date(dueDateLocal) : null,
      appointmentDate: appointmentLocal.trim() ? new Date(appointmentLocal) : null,
      originalSubject: sourceEmail.subject,
      originalFromName: sourceEmail.fromName,
      originalFromAddress: sourceEmail.fromAddress,
    });
  }, [
    sourceEmail,
    orderNumberPreview,
    patientName,
    doctorName,
    clinicName,
    clinicAddress,
    dueDateLocal,
    appointmentLocal,
  ]);

  useEffect(() => {
    if (!open || !sourceEmail) return;
    dirtyRef.current = false;
    let cancelled = false;
    setLoading(true);
    setHint(null);
    void (async () => {
      try {
        const [templateRes, assetsRes] = await Promise.all([
          fetch(
            `/api/mail/accounts/${encodeURIComponent(sourceEmail.accountId)}/reply-template`,
            { credentials: "include" },
          ),
          fetch(
            `/api/mail/accounts/${encodeURIComponent(sourceEmail.accountId)}/reply-template/assets`,
            { credentials: "include" },
          ),
        ]);
        const data = (await templateRes.json()) as {
          template?: { subjectTemplate?: string; htmlTemplate?: string } | null;
          error?: string;
        };
        const assetsData = assetsRes.ok
          ? ((await assetsRes.json()) as {
              assets?: Array<{ id: string; contentId: string }>;
            })
          : { assets: [] as Array<{ id: string; contentId: string }> };
        if (!templateRes.ok) {
          throw new Error(data.error ?? "Не удалось загрузить шаблон");
        }
        if (cancelled) return;
        const template = data.template;
        if (!template?.htmlTemplate?.trim()) {
          setCanSendReply(false);
          setHint("Шаблон ответа не настроен или пустой");
          setSubject("");
          setBodyText("");
          inlineImagesRef.current = [];
          return;
        }
        setCanSendReply(true);
        setHint(null);
        const ctx = buildContext();
        if (!ctx) return;
        const subjectRaw = template.subjectTemplate?.trim() ?? "";
        setSubject(
          subjectRaw
            ? renderEmailReplyTemplate(subjectRaw, ctx)
            : defaultReplySubject(ctx.originalSubject),
        );
        const renderedHtml = renderEmailReplyTemplate(template.htmlTemplate, ctx, {
          html: true,
        });
        const assets = assetsData.assets ?? [];
        templateAssetsRef.current = assets;
        const previewHtml = substituteReplyTemplateCidsForPreview(
          renderedHtml,
          assets,
          sourceEmail.accountId,
        );
        inlineImagesRef.current = extractInlineImagesFromReplyHtml(previewHtml);
        setBodyText(htmlReplyBodyToPlainText(previewHtml));
      } catch (e) {
        if (!cancelled) {
          setCanSendReply(false);
          setHint(e instanceof Error ? e.message : "Ошибка загрузки шаблона");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sourceEmail?.id, sourceEmail?.accountId, buildContext, sourceEmail]);

  useEffect(() => {
    const htmlPreview = buildHtmlFromBodyText(bodyText);
    const htmlForSend =
      sourceEmail && htmlPreview.trim()
        ? restoreReplyTemplateCidsFromPreview(
            htmlPreview,
            templateAssetsRef.current,
            sourceEmail.accountId,
          )
        : htmlPreview;
    onStateChange({
      sendReply,
      draft:
        subject.trim() && htmlForSend.trim()
          ? { subject: subject.trim(), html: htmlForSend.trim() }
          : null,
      canSendReply,
      loading,
      hint,
    });
  }, [
    sendReply,
    subject,
    bodyText,
    canSendReply,
    loading,
    hint,
    onStateChange,
    sourceEmail,
    buildHtmlFromBodyText,
  ]);

  if (!sourceEmail) return null;

  return (
    <div className="flex max-h-[min(96vh,920px)] w-full max-w-md min-w-[min(100%,20rem)] flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
      <div className="shrink-0 border-b border-[var(--border-subtle)] px-5 py-4">
        <h2 className="text-lg font-semibold text-[var(--app-text)]">
          Ответное письмо
        </h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Кому: {senderLabel(sourceEmail)}
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-2.5">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[var(--input-border)] text-[var(--sidebar-blue)]"
            checked={sendReply}
            onChange={(e) => onSendReplyChange(e.target.checked)}
          />
          <span className="text-sm font-medium text-[var(--text-strong)]">
            Отправить ответ
          </span>
        </label>
        {hint ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-100">
            {hint}
          </p>
        ) : null}
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Загрузка шаблона…</p>
        ) : (
          <>
            <div>
              <label
                htmlFor="auto-reply-subject"
                className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]"
              >
                Тема
              </label>
              <input
                id="auto-reply-subject"
                type="text"
                value={subject}
                disabled={!sendReply}
                onChange={(e) => {
                  dirtyRef.current = true;
                  setSubject(e.target.value);
                }}
                className="h-10 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 text-sm text-[var(--app-text)] shadow-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)] disabled:opacity-50"
              />
            </div>
            <div>
              <label
                htmlFor="auto-reply-body"
                className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]"
              >
                Текст
              </label>
              <textarea
                id="auto-reply-body"
                value={bodyText}
                disabled={!sendReply}
                rows={14}
                onChange={(e) => {
                  dirtyRef.current = true;
                  setBodyText(e.target.value);
                }}
                className="min-h-[12rem] w-full resize-y rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-2 text-sm leading-relaxed text-[var(--app-text)] shadow-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)] disabled:opacity-50"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
