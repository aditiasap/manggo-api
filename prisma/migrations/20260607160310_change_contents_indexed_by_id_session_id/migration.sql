/*
  Warnings:

  - A unique constraint covering the columns `[id,sessionId]` on the table `contents` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "contents_id_sessionId_key" ON "contents"("id", "sessionId");
