"use client";

import Link from "next/link";
import { useState } from "react";
import { PublicStickerSourceEmailsModal } from "@/components/sticker/PublicStickerSourceEmailsModal";

const btnBase =
  "block w-full rounded-lg border px-4 py-3 text-center text-sm font-medium transition-colors";

export function PublicStickerHubActions({
  tenantSlug,
  token,
  orderNumber,
  sourceEmailCount,
  employeesHref,
}: {
  tenantSlug: string;
  token: string;
  orderNumber: string;
  sourceEmailCount: number;
  employeesHref: string;
}) {
  const [lettersOpen, setLettersOpen] = useState(false);
  const showLetters = sourceEmailCount > 0;

  return (
    <>
      <div className="mt-6 space-y-2 border-t border-zinc-100 pt-5">
        <a
          href="https://t.me/CLICKlab_Admin"
          target="_blank"
          rel="noopener noreferrer"
          className={`${btnBase} border-sky-300 bg-sky-50 text-sky-950 hover:bg-sky-100`}
        >
          Написать Администраторам
        </a>
        <Link
          href={employeesHref}
          className={`${btnBase} border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200`}
        >
          Для сотрудников
        </Link>
        {showLetters ? (
          <button
            type="button"
            className={`${btnBase} border-violet-200 bg-violet-50 text-violet-950 hover:bg-violet-100`}
            onClick={() => setLettersOpen(true)}
          >
            Письма от заказа
            {sourceEmailCount > 1 ? (
              <span className="ml-1.5 tabular-nums text-violet-700/80">
                ({sourceEmailCount})
              </span>
            ) : null}
          </button>
        ) : null}
      </div>

      {lettersOpen ? (
        <PublicStickerSourceEmailsModal
          tenantSlug={tenantSlug}
          token={token}
          orderNumber={orderNumber}
          onClose={() => setLettersOpen(false)}
        />
      ) : null}
    </>
  );
}
