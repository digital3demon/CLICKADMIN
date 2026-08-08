"use client";

import { useLayoutEffect, useRef } from "react";

const FONT_MAX_PX = 12.8; // ~0.8rem
const FONT_MIN_PX = 8; // ~0.5rem
const STEP_PX = 0.5;

/**
 * Заголовок карточки канбана: базовый размер, при нехватке места — только здесь
 * уменьшает шрифт, пока текст влезает (или до минимума).
 */
export function KanbanCardTitleFit({ title }: { title: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const text = textRef.current;
    if (!wrap || !text) return;

    const fit = () => {
      if (wrap.clientHeight < 4 || wrap.clientWidth < 4) return;
      let size = FONT_MAX_PX;
      text.style.fontSize = `${size}px`;
      // Сначала полный размер; если не влез по высоте — шагаем вниз.
      while (
        size > FONT_MIN_PX &&
        text.scrollHeight > wrap.clientHeight + 1
      ) {
        size -= STEP_PX;
        text.style.fontSize = `${size}px`;
      }
    };

    fit();
    const ro = new ResizeObserver(() => {
      // rAF — после layout колонки/аватаров
      requestAnimationFrame(fit);
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [title]);

  return (
    <div
      ref={wrapRef}
      className="min-h-0 min-w-0 overflow-hidden font-semibold leading-snug text-[var(--kanban-text)]"
      title={title}
    >
      <span
        ref={textRef}
        className="break-words [overflow-wrap:anywhere] [word-break:normal]"
        style={{ fontSize: FONT_MAX_PX }}
      >
        {title}
      </span>
    </div>
  );
}
