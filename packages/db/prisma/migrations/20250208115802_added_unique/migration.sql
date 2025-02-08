/*
  Warnings:

  - A unique constraint covering the columns `[projectId,filePath]` on the table `File` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Message_role_idx";

-- CreateIndex
CREATE UNIQUE INDEX "File_projectId_filePath_key" ON "File"("projectId", "filePath");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
