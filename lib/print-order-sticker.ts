import {
  beginBrowserPrintSession,
  createHiddenPrintIframe,
  CRM_PRINT_READY,
} from "@/lib/print-browser-session";

/**
 * Загружает макет этикетки в скрытый iframe и открывает системный диалог печати,
 * без перехода на страницу предпросмотра.
 *
 * print() вызывается внутри iframe после гидратации React (StickerEmbedAutoPrint),
 * а не на onload документа — иначе диалог открывается «через раз».
 */
export function printOrderSticker(orderId: string): void {
  if (typeof window === "undefined") return;

  const session = beginBrowserPrintSession();
  const iframe = createHiddenPrintIframe("Печать этикетки");
  const url = `/shipments/stickers-print/embed?orderId=${encodeURIComponent(orderId)}`;

  let armed = false;
  const armOnce = () => {
    if (armed || session.isAborted()) return;
    armed = true;
    session.armAfterPrint(iframe.contentWindow);
  };

  const onMessage = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) return;
    if (event.origin !== window.location.origin) return;
    if (event.data?.type !== CRM_PRINT_READY) return;
    armOnce();
  };

  window.addEventListener("message", onMessage);
  session.onAbort(() => {
    window.removeEventListener("message", onMessage);
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  });

  iframe.src = url;
}
