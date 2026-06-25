/** Вставка плейсхолдера в controlled input (тема письма). */
export function insertTokenIntoControlledInput(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  token: string,
): { nextValue: string; caret: number } {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  const nextValue = value.slice(0, start) + token + value.slice(end);
  const caret = start + token.length;
  return { nextValue, caret };
}
