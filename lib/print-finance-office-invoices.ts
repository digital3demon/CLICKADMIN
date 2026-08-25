/**
 * Печать склеенного PDF счетов ФинОтдела. Timezone не используется.
 */
import {
  beginBrowserPrintSession,
  createHiddenPrintIframe,
} from "@/lib/print-browser-session";

export type PrintFinanceOfficeInvoicesResult = {
  printedOrderIds: string[];
  skipped: number;
  truncated: number;
  error?: string;
};

function printPdfBlob(blob: Blob): Promise<boolean> {
  return new Promise((resolve) => {
    const session = beginBrowserPrintSession();
    const iframe = createHiddenPrintIframe("Печать счетов");
    const blobUrl = URL.createObjectURL(blob);
    let settled = false;
    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      session.abort();
      resolve(ok);
    };
    session.onAbort(() => {
      try {
        iframe.remove();
      } catch {
        /* ignore */
      }
      URL.revokeObjectURL(blobUrl);
      if (!settled) settle(false);
    });
    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        window.open(blobUrl, "_blank", "noopener,noreferrer");
        window.setTimeout(() => settle(true), 2_000);
        return;
      }
      const onAfter = () => settle(true);
      win.addEventListener("afterprint", onAfter, { once: true });
      window.addEventListener("afterprint", onAfter, { once: true });
      try {
        win.focus();
        win.print();
      } catch {
        window.open(blobUrl, "_blank", "noopener,noreferrer");
        window.setTimeout(() => settle(true), 2_000);
      }
    };
    iframe.src = blobUrl;
  });
}

export async function printFinanceOfficeSelectedInvoices(
  orderIds: readonly string[],
  documents: "invoices" | "upd" | "both" = "invoices",
): Promise<PrintFinanceOfficeInvoicesResult> {
  const ids = Array.from(new Set(orderIds.map((id) => id.trim()).filter(Boolean)));
  if (ids.length === 0) {
    return { printedOrderIds: [], skipped: 0, truncated: 0, error: "Не выбраны наряды" };
  }

  const res = await fetch("/api/finance-office/invoice-print", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderIds: ids, documents }),
  });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    return {
      printedOrderIds: [],
      skipped: 0,
      truncated: 0,
      error:
        j.error ||
        (documents === "upd"
          ? "Не удалось подготовить УПД к печати"
          : "Не удалось подготовить счета к печати"),
    };
  }

  const printedOrderIds = (res.headers.get("X-Invoice-Print-Order-Ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const skipped = Number(res.headers.get("X-Invoice-Print-Skipped") || "0");
  const truncated = Number(res.headers.get("X-Invoice-Print-Truncated") || "0");
  const blob = await res.blob();
  const printed = await printPdfBlob(blob);
  if (!printed) {
    return {
      printedOrderIds: [],
      skipped,
      truncated,
      error: "Печать не завершена — отметки не поставлены",
    };
  }

  if (printedOrderIds.length > 0) {
    await fetch("/api/finance-office/invoice-printed", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderIds: printedOrderIds,
        mark:
          documents === "upd"
            ? "upd"
            : documents === "both"
              ? "both"
              : "invoice",
      }),
    }).catch(() => {});
  }

  return { printedOrderIds, skipped, truncated };
}
