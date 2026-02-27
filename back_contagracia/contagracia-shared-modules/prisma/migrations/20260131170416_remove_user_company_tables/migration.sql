/*
  Warnings:

  - You are about to drop the `user_action_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_companies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_module_permissions` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `email` to the `password_resets` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "user_action_permissions" DROP CONSTRAINT "user_action_permissions_company_id_fkey";

-- DropForeignKey
ALTER TABLE "user_action_permissions" DROP CONSTRAINT "user_action_permissions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_companies" DROP CONSTRAINT "user_companies_company_id_fkey";

-- DropForeignKey
ALTER TABLE "user_companies" DROP CONSTRAINT "user_companies_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_module_permissions" DROP CONSTRAINT "user_module_permissions_company_id_fkey";

-- DropForeignKey
ALTER TABLE "user_module_permissions" DROP CONSTRAINT "user_module_permissions_user_id_fkey";

-- AlterTable
ALTER TABLE "password_resets" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "user_id" DROP NOT NULL;

-- DropTable
DROP TABLE "user_action_permissions";

-- DropTable
DROP TABLE "user_companies";

-- DropTable
DROP TABLE "user_module_permissions";

-- CreateIndex
CREATE INDEX "password_resets_email_idx" ON "password_resets"("email");
