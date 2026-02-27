/*
  Warnings:

  - Added the required column `email` to the `password_resets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "password_resets" ADD COLUMN     "code" TEXT,
ADD COLUMN     "email" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "password_resets_email_idx" ON "password_resets"("email");

-- CreateIndex
CREATE INDEX "password_resets_code_idx" ON "password_resets"("code");
