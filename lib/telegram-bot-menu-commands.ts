/** Текст на reply-кнопке → slash-команда (полное совпадение строки сообщения). */
export const TELEGRAM_MENU_LABEL_TO_COMMAND: Record<string, string> = {
  "Отгрузки на сегодня": "/shiptd",
  "Отгрузки на завтра": "/shiptm",
  "Отгрузки до конца недели": "/shipw",
  "Срок на сегодня": "/dlinetd",
  "Срок на завтра": "/dlinetm",
  "Срок до конца недели": "/dlinew",
  "Мой срок на сегодня": "/dlinetd",
  "Мой срок на завтра": "/dlinetm",
  "Мой срок до конца недели": "/dlinew",
  "Срок карточек на сегодня": "/cardtd",
  "Срок карточек на завтра": "/cardtm",
  "Срок карточек до конца недели": "/cardw",
};

const LIST_COMMANDS = new Set([
  "/shiptd",
  "/shiptm",
  "/shipw",
  "/dlinew",
  "/dlinetd",
  "/dlinetm",
  "/cardtd",
  "/cardtm",
  "/cardw",
]);

export function telegramMenuLabelToCommand(raw: string): string | null {
  const key = raw
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ");
  if (TELEGRAM_MENU_LABEL_TO_COMMAND[key]) return TELEGRAM_MENU_LABEL_TO_COMMAND[key];
  const lower = key.toLowerCase();
  for (const [label, cmd] of Object.entries(TELEGRAM_MENU_LABEL_TO_COMMAND)) {
    if (label.toLowerCase() === lower) return cmd;
  }
  return null;
}

export function isTelegramBotListCommand(cmd: string): boolean {
  return LIST_COMMANDS.has(cmd.trim().toLowerCase());
}

function listCommandFirstToken(text: string): string {
  let t = text.trim().replace(/^\uFEFF/, "");
  t = t.replace(/^[\uFF0F\u2215]/, "/");
  const first = t.split(/\s+/)[0] ?? "";
  return (first.split("@")[0] ?? "").toLowerCase();
}

/** Текст кнопки или slash-команда → /shiptd и т.д. */
export function resolveTelegramBotListCommand(textRaw: string): string | null {
  const menu = telegramMenuLabelToCommand(textRaw);
  if (menu) return menu;
  const cmd = listCommandFirstToken(textRaw);
  return isTelegramBotListCommand(cmd) ? cmd : null;
}

export function isTelegramBotCardStageCommand(cmd: string): boolean {
  const c = cmd.trim().toLowerCase();
  return c === "/cardtd" || c === "/cardtm" || c === "/cardw";
}
