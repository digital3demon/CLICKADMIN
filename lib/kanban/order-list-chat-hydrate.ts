/**
 * Если GET /kanban-chat?local=1 вернул пустую ленту —
 * догрузить /kaiten/chat по Order.kaitenCardId.
 */
export function needsOrderListKaitenChatFallback(opts: {
  mirrorOk: boolean;
  commentCount: number;
}): boolean {
  return opts.mirrorOk && opts.commentCount === 0;
}
