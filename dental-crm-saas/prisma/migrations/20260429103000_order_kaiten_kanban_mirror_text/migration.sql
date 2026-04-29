-- SQLite: кэш заголовка/описания карточки Kaiten для зеркала канбана в CRM
ALTER TABLE "Order" ADD COLUMN "kaitenCardTitleMirror" TEXT;
ALTER TABLE "Order" ADD COLUMN "kaitenCardDescriptionMirror" TEXT;
