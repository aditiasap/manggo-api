/*
  Warnings:

  - You are about to drop the column `enhancedPrompt` on the `contents` table. All the data in the column will be lost.
  - You are about to drop the column `meta` on the `contents` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `contents` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_contents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prompt" TEXT NOT NULL,
    "style" TEXT,
    "originalPrompt" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contents_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_contents" ("createdAt", "error", "id", "imageUrl", "prompt", "sessionId", "status", "style") SELECT "createdAt", "error", "id", "imageUrl", "prompt", "sessionId", "status", "style" FROM "contents";
DROP TABLE "contents";
ALTER TABLE "new_contents" RENAME TO "contents";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
