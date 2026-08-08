/**
 * Если GET /kanban-chat (live, как на доске) вернул пустую ленту —
 * догрузить /kaiten/chat по Order.kaitenCardId.
 */
export function needsOrderListKaitenChatFallback(opts: {
  mirrorOk: boolean;
  commentCount: number;
}): boolean {
  return opts.mirrorOk && opts.commentCount === 0;
}
