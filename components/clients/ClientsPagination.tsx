import Link from "next/link";

type PageLink = { page: number; href: string; current: boolean };

export function ClientsPagination({
  totalItems,
  pageSize,
  currentPage,
  totalPages,
  prevHref,
  nextHref,
  pageLinks,
}: {
  totalItems: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  prevHref: string | null;
  nextHref: string | null;
  pageLinks: PageLink[];
}) {
  if (totalItems === 0) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-[var(--card-border)] pt-4 text-sm text-[var(--text-body)] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[var(--text-secondary)]">
        Показано{" "}
        <span className="font-medium tabular-nums text-[var(--app-text)]">
          {from}–{to}
        </span>{" "}
        из{" "}
        <span className="font-medium tabular-nums text-[var(--app-text)]">
          {totalItems}
        </span>
        {totalPages > 1 ? (
          <>
            {" "}
            · стр.{" "}
            <span className="font-medium tabular-nums text-[var(--app-text)]">
              {currentPage}
            </span>{" "}
            из {totalPages}
          </>
        ) : null}
      </p>
      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          {prevHref ? (
            <Link
              href={prevHref}
              scroll={false}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
            >
              Назад
            </Link>
          ) : (
            <span className="rounded-lg border border-transparent px-3 py-1.5 text-xs text-[var(--text-placeholder)]">
              Назад
            </span>
          )}
          <nav className="flex flex-wrap items-center gap-1" aria-label="Страницы">
            {pageLinks.map((pl, i) =>
              pl.current ? (
                <span
                  key={`${pl.page}-${i}`}
                  className="inline-flex min-w-8 justify-center rounded-md bg-[var(--sidebar-blue)] px-2 py-1 text-xs font-semibold text-white"
                  aria-current="page"
                >
                  {pl.page}
                </span>
              ) : (
                <Link
                  key={`${pl.page}-${i}`}
                  href={pl.href}
                  scroll={false}
                  className="inline-flex min-w-8 justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--table-row-hover)]"
                >
                  {pl.page}
                </Link>
              ),
            )}
          </nav>
          {nextHref ? (
            <Link
              href={nextHref}
              scroll={false}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
            >
              Вперёд
            </Link>
          ) : (
            <span className="rounded-lg border border-transparent px-3 py-1.5 text-xs text-[var(--text-placeholder)]">
              Вперёд
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Номера страниц с «дырками» как null → многоточие в родителе не нужно: даём только соседние ссылки. */
export function buildClientPageLinks(
  totalPages: number,
  currentPage: number,
  hrefForPage: (page: number) => string,
): PageLink[] {
  if (totalPages <= 1) return [];
  const links: PageLink[] = [];
  const want = new Set<number>();
  want.add(1);
  want.add(totalPages);
  for (let d = -2; d <= 2; d++) {
    const p = currentPage + d;
    if (p >= 1 && p <= totalPages) want.add(p);
  }
  const sorted = [...want].sort((a, b) => a - b);
  for (const p of sorted) {
    links.push({
      page: p,
      href: hrefForPage(p),
      current: p === currentPage,
    });
  }
  return links;
}
