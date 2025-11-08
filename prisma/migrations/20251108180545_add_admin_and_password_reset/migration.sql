-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "hashedPassword" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "subdomain" TEXT,
    "webpageDescription" TEXT,
    "bio" TEXT,
    "title" TEXT,
    "themePreference" TEXT DEFAULT 'system',
    "sidebarBehavior" TEXT DEFAULT 'contextual',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "requirePasswordReset" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_users" ("bio", "createdAt", "email", "emailVerified", "hashedPassword", "id", "image", "name", "sidebarBehavior", "subdomain", "themePreference", "title", "updatedAt", "webpageDescription") SELECT "bio", "createdAt", "email", "emailVerified", "hashedPassword", "id", "image", "name", "sidebarBehavior", "subdomain", "themePreference", "title", "updatedAt", "webpageDescription" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_subdomain_key" ON "users"("subdomain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
