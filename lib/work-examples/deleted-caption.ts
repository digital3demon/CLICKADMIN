import { formatMoscowDateTime } from "@/lib/moscow-datetime-format";

export function workExampleDeletedCaption(opts: {
  actorLabel: string;
  kind: "file" | "link" | "example";
  fileName?: string;
  at: Date;
}): string {
  const who = (opts.actorLabel || "").trim() || "Сотрудник";
  const when = formatMoscowDateTime(opts.at);
  if (opts.kind === "file") {
    const name = (opts.fileName || "").trim() || "файл";
    return `${who} удалил файл ${name} ${when}`;
  }
  if (opts.kind === "link") {
    return `${who} удалил ссылку ${when}`;
  }
  return `${who} удалил пример работы ${when}`;
}
