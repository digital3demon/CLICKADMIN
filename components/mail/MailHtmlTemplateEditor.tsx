"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "@tiptap/extension-image";
import FontFamily from "@tiptap/extension-font-family";
import { TextStyle } from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { compressImageForEmail } from "@/lib/mail/compress-image-for-email";
import { FontSize } from "@/lib/mail/tiptap-font-size";

const FONT_OPTIONS = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
] as const;

const SIZE_OPTIONS = ["12px", "14px", "16px", "18px", "20px", "24px", "28px"] as const;

type Props = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

function toolbarBtnClass(active: boolean) {
  return [
    "rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors",
    active
      ? "bg-[var(--sidebar-blue)] text-white"
      : "text-[var(--text-body)] hover:bg-[var(--surface-hover)]",
  ].join(" ");
}

export function MailHtmlTemplateEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Текст письма…",
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState("");
  const [, setToolbarTick] = useState(0);
  const lastEmittedHtmlRef = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
      }),
      TextStyle,
      FontFamily,
      FontSize,
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] px-3 py-3 text-sm leading-6 text-[var(--app-text)] outline-none [&_img]:my-2 [&_img]:max-w-full [&_img]:rounded-lg",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      lastEmittedHtmlRef.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedHtmlRef.current) return;
    if (value === editor.getHTML()) {
      lastEmittedHtmlRef.current = value;
      return;
    }
    editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    lastEmittedHtmlRef.current = value;
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    const refresh = () => setToolbarTick((n) => n + 1);
    editor.on("selectionUpdate", refresh);
    editor.on("transaction", refresh);
    return () => {
      editor.off("selectionUpdate", refresh);
      editor.off("transaction", refresh);
    };
  }, [editor]);

  const insertImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      setImageError("");
      try {
        const src = await compressImageForEmail(file);
        editor.chain().focus().setImage({ src, alt: file.name }).run();
      } catch (err) {
        setImageError(err instanceof Error ? err.message : "Не удалось вставить изображение");
      }
    },
    [editor],
  );

  const currentFont =
    (editor?.getAttributes("textStyle").fontFamily as string | undefined) ?? "";
  const currentSize =
    (editor?.getAttributes("textStyle").fontSize as string | undefined) ?? "";

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2 py-2">
        <select
          value={currentFont}
          disabled={disabled || !editor}
          onChange={(e) => {
            const next = e.target.value;
            if (!next) editor?.chain().focus().unsetFontFamily().run();
            else editor?.chain().focus().setFontFamily(next).run();
          }}
          className="h-8 max-w-[9rem] rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] px-2 text-xs text-[var(--app-text)] outline-none"
          aria-label="Шрифт"
        >
          <option value="">Шрифт</option>
          {FONT_OPTIONS.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>

        <select
          value={currentSize}
          disabled={disabled || !editor}
          onChange={(e) => {
            const next = e.target.value;
            if (!next) editor?.chain().focus().unsetFontSize().run();
            else editor?.chain().focus().setFontSize(next).run();
          }}
          className="h-8 w-[4.5rem] rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] px-2 text-xs text-[var(--app-text)] outline-none"
          aria-label="Размер"
        >
          <option value="">Размер</option>
          {SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size.replace("px", "")}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={disabled || !editor}
          className={toolbarBtnClass(editor?.isActive("bold") ?? false)}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Жирный"
        >
          Ж
        </button>
        <button
          type="button"
          disabled={disabled || !editor}
          className={toolbarBtnClass(editor?.isActive("italic") ?? false)}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Курсив"
        >
          К
        </button>

        <button
          type="button"
          disabled={disabled || !editor}
          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
          onClick={() => fileInputRef.current?.click()}
          title="Вставить изображение"
        >
          Картинка
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void insertImage(file);
          }}
        />
      </div>

      <EditorContent editor={editor} />
      {imageError ? (
        <p className="border-t border-[var(--border-subtle)] px-3 py-2 text-xs text-red-600 dark:text-red-300">
          {imageError}
        </p>
      ) : null}
    </div>
  );
}
