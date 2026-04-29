/**
 * Загружает PDF наряда и открывает системный диалог печати (как Ctrl+P),
 * без новой вкладки. Только в браузере.
 *
 * Важно: нельзя удалять iframe и revoke blob URL, пока открыт диалог печати —
 * иначе предпросмотр сразу закрывается. Очистка только после `afterprint`
 * (и длинный запасной таймер на случай старых браузеров).
 */
export async function printOrderNarjadPdf(orderId: string): Promise<void> {
  if (typeof window === "undefined") return;

  const pr = await fetch(`/api/orders/${orderId}/print`);
  if (!pr.ok) return;

  const ab = await pr.arrayBuffer();
  const blob = new Blob([ab], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement("iframe");
  // Не 0×0: у части встроенных PDF/print это ломает предпросмотр
  iframe.setAttribute(
    "style",
    "position:fixed;left:0;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none",
  );
  iframe.setAttribute("title", "Печать наряда");
  iframe.src = url;

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
    URL.revokeObjectURL(url);
  };

  const armAfterPrint = (win: Window | null) => {
    const onAfterPrint = () => {
      win?.removeEventListener("afterprint", onAfterPrint);
      window.removeEventListener("afterprint", onAfterPrint);
      cleanup();
    };
    win?.addEventListener("afterprint", onAfterPrint);
    // У встроенного PDF в iframe событие часто приходит на родительское окно
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
        return;
      }
    };

    // PDF viewer во iframe иногда ещё не готов в момент onload
    window.setTimeout(runPrint, 250);
  };

  // Если afterprint не пришёл (редко), не держим blob вечно
  const fallbackMs = 5 * 60 * 1000;
  window.setTimeout(() => {
    if (!cleaned) cleanup();
  }, fallbackMs);

  document.body.appendChild(iframe);
}
