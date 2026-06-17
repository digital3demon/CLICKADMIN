import {
  beginBrowserPrintSession,
  createHiddenPrintIframe,
} from "@/lib/print-browser-session";

/**
 * Загружает PDF наряда и открывает системный диалог печати (как Ctrl+P),
 * без новой вкладки. Только в браузере.
 *
 * iframe создаётся синхронно в обработчике клика (до await fetch).
 * Повторные onload PDF не блокируются — печать планируется заново на каждый load.
 */
export async function printOrderNarjadPdf(orderId: string): Promise<void> {
  if (typeof window === "undefined") return;

  const session = beginBrowserPrintSession();
  const iframe = createHiddenPrintIframe("Печать наряда");

  let blobUrl: string | null = null;
  session.onAbort(() => {
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      blobUrl = null;
    }
  });

  const pr = await fetch(`/api/orders/${orderId}/print`);
  if (!pr.ok || session.isAborted()) {
    session.abort();
    return;
  }

  const ab = await pr.arrayBuffer();
  if (session.isAborted()) {
    session.abort();
    return;
  }

  const blob = new Blob([ab], { type: "application/pdf" });
  blobUrl = URL.createObjectURL(blob);

  let printTimer: number | null = null;
  let armed = false;

  const schedulePrint = () => {
    if (session.isAborted()) return;

    const win = iframe.contentWindow;
    if (!win) {
      session.abort();
      return;
    }

    if (!armed) {
      armed = true;
      session.armAfterPrint(win);
    }

    if (printTimer) window.clearTimeout(printTimer);
    printTimer = window.setTimeout(() => {
      printTimer = null;
      if (session.isAborted()) return;
      try {
        win.focus();
        win.print();
      } catch {
        session.abort();
      }
    }, 500);
  };

  iframe.onload = () => schedulePrint();
  iframe.src = blobUrl;
}
