-- AlterTable
ALTER TABLE "AiOrderPrediction" ADD COLUMN IF NOT EXISTS "selfCorrectionAt" TIMESTAMP(3);
ALTER TABLE "AiOrderPrediction" ADD COLUMN IF NOT EXISTS "selfCorrectionRefHash" TEXT;
