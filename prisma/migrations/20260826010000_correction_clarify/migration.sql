ALTER TABLE "OrderChatCorrection" ADD COLUMN IF NOT EXISTS "clarifyAskedAt" TIMESTAMP(3);
ALTER TABLE "OrderChatCorrection" ADD COLUMN IF NOT EXISTS "clarifyAskedByUserId" TEXT;
ALTER TABLE "OrderChatCorrection" ADD COLUMN IF NOT EXISTS "clarifyCommentId" TEXT;
ALTER TABLE "OrderChatCorrection" ADD COLUMN IF NOT EXISTS "clarifyReplyAt" TIMESTAMP(3);
ALTER TABLE "OrderChatCorrection" ADD COLUMN IF NOT EXISTS "clarifyReplyAckAt" TIMESTAMP(3);

ALTER TABLE "OrderChatInboxItem" ADD COLUMN IF NOT EXISTS "clarifyAskedAt" TIMESTAMP(3);
ALTER TABLE "OrderChatInboxItem" ADD COLUMN IF NOT EXISTS "clarifyAskedByUserId" TEXT;
ALTER TABLE "OrderChatInboxItem" ADD COLUMN IF NOT EXISTS "clarifyCommentId" TEXT;
ALTER TABLE "OrderChatInboxItem" ADD COLUMN IF NOT EXISTS "clarifyReplyAt" TIMESTAMP(3);
ALTER TABLE "OrderChatInboxItem" ADD COLUMN IF NOT EXISTS "clarifyReplyAckAt" TIMESTAMP(3);
