/** Один наряд для пользователя требует индикации «упомянули лабораторию». */
export function kaitenLabMentionPendingForUser(args: {
  kaitenChatHasLabMention: boolean;
  kaitenLabMentionSignalAt: Date | null;
  ackAt: Date | null;
}): boolean {
  if (!args.kaitenChatHasLabMention) return false;
  if (!args.ackAt) return true;
  if (!args.kaitenLabMentionSignalAt) return false;
  return args.ackAt.getTime() < args.kaitenLabMentionSignalAt.getTime();
}
