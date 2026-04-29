-- Привязка Telegram через бота: /start → email → одноразовая ссылка (как в Kaiten).

CREATE TABLE "TelegramBotLinkPending" (
    "telegramUserId" TEXT NOT NULL PRIMARY KEY,
    "tenantSlug" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "TelegramLinkToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "telegramUsername" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    CONSTRAINT "TelegramLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TelegramLinkToken_token_key" ON "TelegramLinkToken"("token");
CREATE INDEX "TelegramLinkToken_telegramUserId_idx" ON "TelegramLinkToken"("telegramUserId");
