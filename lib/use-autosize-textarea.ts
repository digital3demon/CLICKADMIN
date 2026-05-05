import { useCallback, useLayoutEffect, useRef } from "react";

/** Высота textarea по содержимому (растёт вниз при наборе и при вставке текста). */
export function useAutosizeTextarea(
  value: string,
  options: { maxHeight?: number } = {},
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const maxHeight = options.maxHeight;

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Сначала сброс высоты — иначе в растянутом flex/grid родителе scrollHeight
    // подхватывает лишнюю высоту строки и поле раздувается.
    el.style.height = "0px";
    const nextHeight =
      typeof maxHeight === "number"
        ? Math.min(el.scrollHeight, maxHeight)
        : el.scrollHeight;
    el.style.overflow =
      typeof maxHeight === "number" && el.scrollHeight > maxHeight
        ? "auto"
        : "hidden";
    el.style.height = `${nextHeight}px`;
  }, [maxHeight]);

  useLayoutEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  useLayoutEffect(() => {
    const onResize = () => syncHeight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [syncHeight]);

  return ref;
}
