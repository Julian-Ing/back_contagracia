/*
  Warnings:

  - You are about to drop the column `code` on the `password_resets` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `password_resets` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "password_resets_code_idx";

-- DropIndex
DROP INDEX "password_resets_email_idx";

-- AlterTable
ALTER TABLE "password_resets" DROP COLUMN "code",
DROP COLUMN "email";
