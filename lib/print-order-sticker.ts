/**
 * Загружает макет этикетки в скрытый iframe и открывает системный диалог печати,
 * без перехода на страницу предпросмотра (как printOrderNarjadPdf для наряда).
 */
export function printOrderSticker(orderId: string): void {
  if (typeof window === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;left:0;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none",
  );
  iframe.setAttribute("title", "Печать этикетки");

  const url = `/shipments/stickers-print/embed?orderId=${encodeURIComponent(orderId)}`;

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };

  const armAfterPrint = (win: Window | null) => {
    const onAfterPrint = () => {
      win?.removeEventListener("afterprint", onAfterPrint);
      window.removeEventListener("afterprint", onAfterPrint);
      cleanup();
    };
    win?.addEventListener("afterprint", onAfterPrint);
    window.addEventListener("afterprint", onAfterPrint);
  };

  let loadHandled = false;
  iframe.onload = () => {
    if (loadHandled) return;
    loadHandled = true;

    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }

    armAfterPrint(win);

    const runPrint = () => {
      try {
        win.focus();
        win.print();
      } catch {
        cleanup();
      }
    };

    window.setTimeout(runPrint, 250);
  };

  const fallbackMs = 5 * 60 * 1000;
  window.setTimeout(() => {
    if (!cleaned) cleanup();
  }, fallbackMs);

  document.body.appendChild(iframe);
  iframe.src = url;
}
