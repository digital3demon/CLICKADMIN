/** Сообщение из iframe: контент готов, внутри вызван window.print(). */
export const CRM_PRINT_READY = "crm-print-ready";

type PrintSession = {
  abort: () => void;
  armAfterPrint: (win: Window | null) => void;
  onAbort: (cb: () => void) => void;
  isAborted: () => boolean;
};

let activeSession: PrintSession | null = null;

/** Одна активная печать: новый клик отменяет предыдущий скрытый iframe. */
export function beginBrowserPrintSession(): PrintSession {
  activeSession?.abort();

  let aborted = false;
  const detachAfterPrint: Array<() => void> = [];
  const onAbortCallbacks: Array<() => void> = [];

  const abort = () => {
    if (aborted) return;
    aborted = true;
    for (const detach of detachAfterPrint) detach();
    detachAfterPrint.length = 0;
    for (const cb of onAbortCallbacks) cb();
    onAbortCallbacks.length = 0;
    if (activeSession === session) activeSession = null;
  };

  const onAbort = (cb: () => void) => {
    if (aborted) {
      cb();
      return;
    }
    onAbortCallbacks.push(cb);
  };

  const armAfterPrint = (win: Window | null) => {
    if (aborted) return;
    const onAfterPrint = () => {
      win?.removeEventListener("afterprint", onAfterPrint);
      window.removeEventListener("afterprint", onAfterPrint);
      abort();
    };
    win?.addEventListener("afterprint", onAfterPrint);
    window.addEventListener("afterprint", onAfterPrint);
    detachAfterPrint.push(() => {
      win?.removeEventListener("afterprint", onAfterPrint);
      window.removeEventListener("afterprint", onAfterPrint);
    });
  };

  const session: PrintSession = {
    abort,
    armAfterPrint,
    onAbort,
    isAborted: () => aborted,
  };

  activeSession = session;

  window.setTimeout(() => {
    if (!aborted) abort();
  }, 5 * 60 * 1000);

  return session;
}

export function createHiddenPrintIframe(title: string): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;left:0;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none",
  );
  iframe.setAttribute("title", title);
  document.body.appendChild(iframe);
  return iframe;
}
