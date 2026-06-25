"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ReplyTemplateAssetItem = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  kind: "INLINE_IMAGE" | "ATTACHMENT";
  contentId: string;
};

type Props = {
  accountId: string;
  disabled?: boolean;
  onInsertImage: (contentId: string, alt: string) => void;
  onUploadImageFile?: (file: File) => Promise<ReplyTemplateAssetItem | null>;
};

function formatBytes(size: number): string {
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data;
}

export function EmailReplyTemplateAssetsPanel({
  accountId,
  disabled = false,
  onInsertImage,
  onUploadImageFile,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<ReplyTemplateAssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const loadAssets = useCallback(async () => {
    if (!accountId) {
      setAssets([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await jsonFetch<{ assets: ReplyTemplateAssetItem[] }>(
        `/api/mail/accounts/${encodeURIComponent(accountId)}/reply-template/assets`,
      );
      setAssets(data.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки файлов");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  async function uploadFile(file: File) {
    setUploading(true);
    setError("");
    try {
      let asset: ReplyTemplateAssetItem | null = null;
      if (onUploadImageFile && file.type.startsWith("image/")) {
        asset = await onUploadImageFile(file);
      } else {
        const form = new FormData();
        form.append("file", file);
        const data = await jsonFetch<{ asset: ReplyTemplateAssetItem }>(
          `/api/mail/accounts/${encodeURIComponent(accountId)}/reply-template/assets`,
          { method: "POST", body: form },
        );
        asset = data.asset;
      }
      if (asset) {
        setAssets((prev) => [...prev, asset!]);
        if (asset.kind === "INLINE_IMAGE") {
          onInsertImage(asset.contentId, asset.fileName);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить файл");
    } finally {
      setUploading(false);
    }
  }

  async function removeAsset(assetId: string) {
    setError("");
    try {
      await jsonFetch(
        `/api/mail/accounts/${encodeURIComponent(accountId)}/reply-template/assets/${encodeURIComponent(assetId)}`,
        { method: "DELETE" },
      );
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить файл");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--app-text)]">Файлы шаблона</p>
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--app-text)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
        >
          {uploading ? "Загрузка…" : "Загрузить файл"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void uploadFile(file);
          }}
        />
      </div>
      <p className="text-xs text-[var(--text-secondary)]">
        Картинки (лого) — вставьте в текст письма; PDF и другие файлы прикрепляются к каждому ответу.
      </p>
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
      ) : null}
      {loading ? (
        <p className="text-xs text-[var(--text-muted)]">Загрузка списка…</p>
      ) : assets.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Файлы не загружены</p>
      ) : (
        <ul className="space-y-2">
          {assets.map((asset) => {
            const previewUrl = `/api/mail/accounts/${encodeURIComponent(accountId)}/reply-template/assets/${encodeURIComponent(asset.id)}?inline=1`;
            return (
              <li
                key={asset.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-2.5"
              >
                {asset.kind === "INLINE_IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt=""
                    className="h-12 w-12 rounded-lg border border-[var(--card-border)] object-contain bg-white"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[10px] font-bold uppercase text-[var(--text-muted)]">
                    файл
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--app-text)]">
                    {asset.fileName}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {formatBytes(asset.size)}
                    {asset.kind === "ATTACHMENT" ? " · прикрепляется к каждому ответу" : ""}
                  </p>
                </div>
                {asset.kind === "INLINE_IMAGE" ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onInsertImage(asset.contentId, asset.fileName)}
                    className="rounded-lg bg-[var(--sidebar-blue)] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--sidebar-blue-hover)] disabled:opacity-50"
                  >
                    Вставить в письмо
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void removeAsset(asset.id)}
                  className="rounded-lg border border-red-400/40 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-300 disabled:opacity-50"
                >
                  Удалить
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
