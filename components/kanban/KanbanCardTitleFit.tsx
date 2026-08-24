"use client";

import { useLayoutEffect, useRef } from "react";

const FONT_MAX_PX = 15.8; // ~0.8rem + 3px
const FONT_MIN_PX = 13;
const STEP_PX = 0.5;

/**
 * Заголовок карточки: один канон размера, перенос строк.
 * Уменьшаем только если при максимуме текст всё ещё не влезает по высоте.
 */
export function KanbanCardTitleFit({ title }: { title: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const text = textRef.current;
    if (!wrap || !text) return;

    const fit = () => {
      const boxH = wrap.clientHeight;
      if (boxH < 4) return;

      let size = FONT_MAX_PX;
      text.style.fontSize = `${size}px`;
      while (size > FONT_MIN_PX && text.scrollHeight > boxH + 1) {
        size -= STEP_PX;
        text.style.fontSize = `${size}px`;
      }
    };

    fit();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(fit);
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [title]);

  return (
    <div
      ref={wrapRef}
      className="h-full min-h-0 min-w-0 overflow-hidden font-semibold leading-snug text-[var(--kanban-text)]"
      title={title}
    >
      <span
        ref={textRef}
        className="block break-words [overflow-wrap:anywhere] [word-break:break-word]"
        style={{ fontSize: FONT_MAX_PX }}
      >
        {title}
      </span>
    </div>
  );
}
