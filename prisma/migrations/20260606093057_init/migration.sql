-- CreateTable
CREATE TABLE "ImageGenerationSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ImageGenerationContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "style" TEXT,
    "enhancedPrompt" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL,
    "stage" TEXT,
    "error" TEXT,
    "provider" TEXT,
    "meta" TEXT,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImageGenerationContent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ImageGenerationSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageGenerationSession_sessionId_key" ON "ImageGenerationSession"("sessionId");

-- CreateIndex
CREATE INDEX "ImageGenerationSession_sessionId_idx" ON "ImageGenerationSession"("sessionId");
