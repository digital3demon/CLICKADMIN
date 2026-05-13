"use client";

import {
  type CSSProperties,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export function StickyListChrome({
  toolbar,
  children,
  className,
  toolbarClassName,
  offsetVarName = "--sticky-list-toolbar-height",
}: {
  toolbar: ReactNode;
  children: ReactNode;
  className?: string;
  toolbarClassName?: string;
  offsetVarName?: `--${string}`;
}) {
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [toolbarHeight, setToolbarHeight] = useState(0);

  useLayoutEffect(() => {
    const node = toolbarRef.current;
    if (!node) return;

    const update = () => {
      setToolbarHeight(Math.ceil(node.getBoundingClientRect().height));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      className={className}
      style={
        {
          [offsetVarName]: `${toolbarHeight}px`,
        } as CSSProperties
      }
    >
      <div
        ref={toolbarRef}
        className={[
          "sticky top-0 z-40 bg-[var(--app-bg)] pb-3",
          toolbarClassName ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {toolbar}
      </div>
      {children}
    </div>
  );
}
