"use client";

/**
 * Recharts ResponsiveContainer без width/height -1 в консоли:
 * не монтируем график, пока контейнер реально имеет размер
 * (скрытый/ещё не разложенный flex → -1).
 */
import { useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

export function ChartResponsiveContainer({
  children,
  className,
}: {
  children: ReactElement;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const sync = () => {
      const { width, height } = el.getBoundingClientRect();
      setReady(width > 1 && height > 1);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={hostRef} className={`h-full min-h-0 w-full min-w-0 ${className ?? ""}`}>
      {ready ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          {children}
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full" aria-hidden />
      )}
    </div>
  );
}
