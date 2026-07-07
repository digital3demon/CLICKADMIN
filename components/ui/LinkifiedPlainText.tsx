"use client";

import { splitPlainTextLinks } from "@/lib/linkify-plain-text";

export function LinkifiedPlainText({
  text,
  className,
  linkClassName = "text-[var(--sidebar-blue)] underline underline-offset-2 hover:opacity-90",
}: {
  text: string;
  className?: string;
  linkClassName?: string;
}) {
  const segments = splitPlainTextLinks(text);

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.kind === "link" ? (
          <a
            key={`link-${index}-${segment.href}`}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            onClick={(e) => e.stopPropagation()}
          >
            {segment.display}
          </a>
        ) : (
          <span key={`text-${index}`}>{segment.value}</span>
        ),
      )}
    </span>
  );
}
