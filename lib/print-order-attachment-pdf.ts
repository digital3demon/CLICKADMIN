/**
 * Печать PDF вложения наряда (счёт / УПД) из модалки.
 * Скрытый iframe + встроенный просмотрщик Chrome часто не шлёт onload/afterprint
 * и клином держит UI. Берём blob, открываем вкладку, print(), не ждём afterprint.
 */

const FETCH_MS = 30_000;
const PRINT_FALLBACK_MS = 6_000;

export async function printOrderAttachmentPdf(url: string): Promise<boolean> {
  const ac = new AbortController();
  const fetchTimer = window.setTimeout(() => ac.abort(), FETCH_MS);
  let res: Response;
  try {
    res = await fetch(url, { credentials: "include", signal: ac.signal });
  } catch {
    return false;
  } finally {
    window.clearTimeout(fetchTimer);
  }
  if (!res.ok) return false;

  const buf = await res.arrayBuffer();
  const blob = new Blob([buf], { type: "application/pdf" });
  const blobUrl = URL.createObjectURL(blob);
  const win = window.open(blobUrl, "_blank");
  if (!win) {
    URL.revokeObjectURL(blobUrl);
    return false;
  }

  return await new Promise<boolean>((resolve) => {
    let settled = false;
    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
      resolve(ok);
    };

    const tryPrint = () => {
      try {
        win.focus();
        win.print();
      } catch {
        /* вкладка открыта — пользователь напечатает сам */
      }
      settle(true);
    };

    const late = window.setTimeout(tryPrint, 800);
    try {
      win.addEventListener(
        "load",
        () => {
          window.clearTimeout(late);
          window.setTimeout(tryPrint, 200);
        },
        { once: true },
      );
    } catch {
      window.clearTimeout(late);
      tryPrint();
    }
    window.setTimeout(() => settle(true), PRINT_FALLBACK_MS);
  });
}
