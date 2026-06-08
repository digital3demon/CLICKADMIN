"use client";

import { useEffect } from "react";

/** Синхронизирует горизонтальный скролл зеркала шапки и тела таблицы. */
export function ShipmentsTableMirrorScroll({
  mirrorId,
  bodyId,
}: {
  mirrorId: string;
  bodyId: string;
}) {
  useEffect(() => {
    const mirror = document.getElementById(mirrorId);
    const body = document.getElementById(bodyId);
    if (!mirror || !body) return;

    let syncing = false;
    const sync = (from: HTMLElement, to: HTMLElement) => {
      if (syncing) return;
      syncing = true;
      to.scrollLeft = from.scrollLeft;
      syncing = false;
    };

    const onMirror = () => sync(mirror, body);
    const onBody = () => sync(body, mirror);
    mirror.addEventListener("scroll", onMirror, { passive: true });
    body.addEventListener("scroll", onBody, { passive: true });
    return () => {
      mirror.removeEventListener("scroll", onMirror);
      body.removeEventListener("scroll", onBody);
    };
  }, [mirrorId, bodyId]);

  return null;
}
