"use client";

import type { RefObject } from "react";
import { useCallback, useLayoutEffect, useState } from "react";

export type FixedDropdownPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

/**
 * Позиция для выпадающего списка в `createPortal(..., document.body)` с `position: fixed`,
 * чтобы родители с overflow не обрезали список.
 */
export function useFixedDropdownPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  options?: { maxListHeight?: number; minWidthPx?: number },
): FixedDropdownPosition {
  const maxList = options?.maxListHeight ?? 240;
  const minWPx = options?.minWidthPx ?? 200;

  const [pos, setPos] = useState<FixedDropdownPosition>({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: maxList,
  });

  const updatePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 8;
    const gap = 4;
    let top = r.bottom + gap;
    let maxHeight = Math.min(maxList, window.innerHeight - top - pad);
    if (maxHeight < 72 && r.top > pad + gap) {
      const aboveMax = Math.min(maxList, r.top - pad - gap);
      if (aboveMax > maxHeight) {
        maxHeight = aboveMax;
        top = r.top - gap - maxHeight;
      }
    }
    let left = r.left;
    const width = Math.max(r.width, minWPx);
    if (left + width > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - pad - width);
    }
    setPos({ top, left, width, maxHeight });
  }, [maxList, minWPx]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  return pos;
}
