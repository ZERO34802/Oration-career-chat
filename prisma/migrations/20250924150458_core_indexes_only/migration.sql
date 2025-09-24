/*
  Warnings:

  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."ChatSession_userId_updatedAt_idx";

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "email" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ChatSession_userId_idx" ON "public"."ChatSession"("userId");

-- CreateIndex
CREATE INDEX "ChatSession_updatedAt_idx" ON "public"."ChatSession"("updatedAt");
