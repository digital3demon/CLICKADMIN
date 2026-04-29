-- User.isActive в БД был INTEGER (миграция 20260416100000), Prisma Boolean ожидает BOOLEAN affinity в SQLite.
-- Пересборка таблицы без изменения данных (0/1 остаются валидными значениями).
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "passwordHash" TEXT,
    "inviteCodeHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME
);

INSERT INTO "new_User" ("id", "email", "displayName", "role", "passwordHash", "inviteCodeHash", "isActive", "createdAt", "updatedAt", "lastLoginAt")
SELECT "id", "email", "displayName", "role", "passwordHash", "inviteCodeHash", "isActive", "createdAt", "updatedAt", "lastLoginAt" FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
