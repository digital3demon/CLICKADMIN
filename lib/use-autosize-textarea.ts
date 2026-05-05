import { useCallback, useLayoutEffect, useRef } from "react";

/** Высота textarea по содержимому (растёт вниз при наборе и при вставке текста). */
export function useAutosizeTextarea(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Сначала сброс высоты — иначе в растянутом flex/grid родителе scrollHeight
    // подхватывает лишнюю высоту строки и поле раздувается.
    el.style.height = "0px";
    el.style.overflow = "hidden";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

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
