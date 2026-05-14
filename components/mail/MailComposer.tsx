"use client";

import { useEffect, useState } from "react";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { MailAccount } from "@/components/mail/types";

type Props = {
  open: boolean;
  account: MailAccount | null;
  initialTo?: string;
  initialSubject?: string;
  initialHtml?: string;
  onClose: () => void;
  onSent: () => void;
};

export function MailComposer({
  open,
  account,
  initialTo = "",
  initialSubject = "",
  initialHtml = "",
  onClose,
  onSent,
}: Props) {
  const [to, setTo] = useState(initialTo);
  const [ccOpen, setCcOpen] = useState(false);
  const [bccOpen, setBccOpen] = useState(false);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Напишите письмо..." }),
    ],
    content: initialHtml || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "min-h-[280px] px-5 py-4 text-[15px] leading-7 text-[var(--app-text)] outline-none",
      },
    },
  });

  useEffect(() => {
    if (!open) return;
    setTo(initialTo);
    setSubject(initialSubject);
    if (editor) editor.commands.setContent(initialHtml || "<p></p>");
  }, [editor, initialHtml, initialSubject, initialTo, open]);

  if (!open) return null;

  async function send() {
    if (!account || !editor) return;
    setSending(true);
    setStatus("");
    try {
      const form = new FormData();
      form.set("accountId", account.id);
      form.set("to", to);
      form.set("cc", cc);
      form.set("bcc", bcc);
      form.set("subject", subject);
      form.set("html", editor.getHTML());
      files.forEach((file) => form.append("attachments", file));
      const res = await fetch("/api/mail/send", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Не удалось отправить письмо");
      setStatus("Письмо отправлено");
      setFiles([]);
      onSent();
      onClose();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  }

  function saveDraft() {
    if (!editor) return;
    localStorage.setItem(
      "mail-composer-draft",
      JSON.stringify({ to, cc, bcc, subject, html: editor.getHTML(), at: new Date().toISOString() }),
    );
    setStatus("Черновик сохранён локально");
  }

  return (
    <div
      className="fixed inset-0 z-[260] bg-black/40 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Написать письмо"
        className="absolute bottom-5 right-5 top-5 flex w-[min(920px,calc(100vw-40px))] flex-col overflow-hidden rounded-[28px] bg-[var(--card-bg)] text-[var(--app-text)] shadow-[0_24px_80px_rgba(0,0,0,0.30)] ring-1 ring-[var(--card-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[var(--card-border)] bg-[var(--surface-muted)] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--app-text)]">Новое письмо</h2>
            <p className="text-xs text-[var(--text-muted)]">От: {account?.email ?? "аккаунт не выбран"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <div className="border-b border-[var(--border-subtle)] px-5 py-3">
          <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] py-2">
            <span className="w-16 text-sm text-[var(--text-muted)]">Кому</span>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
              placeholder="email@example.ru"
            />
            <button type="button" className="text-xs text-[var(--sidebar-blue)]" onClick={() => setCcOpen((v) => !v)}>
              Копия
            </button>
            <button type="button" className="text-xs text-[var(--sidebar-blue)]" onClick={() => setBccOpen((v) => !v)}>
              Скрытая
            </button>
          </div>
          {ccOpen ? (
            <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] py-2">
              <span className="w-16 text-sm text-[var(--text-muted)]">Копия</span>
              <input value={cc} onChange={(e) => setCc(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]" />
            </div>
          ) : null}
          {bccOpen ? (
            <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] py-2">
              <span className="w-16 text-sm text-[var(--text-muted)]">Скрытая</span>
              <input value={bcc} onChange={(e) => setBcc(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]" />
            </div>
          ) : null}
          <div className="flex items-center gap-3 py-2">
            <span className="w-16 text-sm text-[var(--text-muted)]">Тема</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
              placeholder="Тема письма"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-2">
          {[
            ["bold", "Ж"],
            ["italic", "К"],
            ["bulletList", "•"],
            ["orderedList", "1."],
          ].map(([cmd, label]) => (
            <button
              key={cmd}
              type="button"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
              onClick={() => {
                if (cmd === "bold") editor?.chain().focus().toggleBold().run();
                if (cmd === "italic") editor?.chain().focus().toggleItalic().run();
                if (cmd === "bulletList") editor?.chain().focus().toggleBulletList().run();
                if (cmd === "orderedList") editor?.chain().focus().toggleOrderedList().run();
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className="min-h-0 flex-1 overflow-auto"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
          }}
        >
          <EditorContent editor={editor} />
          {files.length > 0 ? (
            <div className="mx-5 mb-5 grid gap-2 sm:grid-cols-2">
              {files.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="flex items-center gap-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm">
                  <span>📎</span>
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <button type="button" className="text-red-600 dark:text-red-300" onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-[var(--card-border)] bg-[var(--surface-muted)] px-5 py-4">
          <button
            type="button"
            disabled={sending || !to.trim() || !subject.trim() || !editor?.getText().trim()}
            onClick={() => void send()}
            className="rounded-2xl bg-[var(--sidebar-blue)] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--sidebar-blue-hover)] disabled:opacity-50"
          >
            {sending ? "Отправка..." : "Отправить"}
          </button>
          <label className="cursor-pointer rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]">
            Прикрепить
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
            />
          </label>
          <button type="button" className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]" onClick={saveDraft}>
            Сохранить черновик
          </button>
          <button type="button" className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]" onClick={() => setStatus("Отложенная отправка будет доступна после настройки расписания.")}>
            Отложить отправку
          </button>
          <button type="button" className="ml-auto rounded-xl px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)]" onClick={onClose}>
            Закрыть
          </button>
          {status ? <span className="w-full text-xs text-[var(--text-secondary)]">{status}</span> : null}
        </footer>
      </section>
    </div>
  );
}
