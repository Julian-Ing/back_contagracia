/*
  Warnings:

  - You are about to drop the column `status` on the `subscriptions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[whatsapp_number]` on the table `companies` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "subscriptions_company_id_status_idx";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "display_decimals" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "whatsapp_number" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "status";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- CreateIndex
CREATE UNIQUE INDEX "companies_whatsapp_number_key" ON "companies"("whatsapp_number");

-- CreateIndex
CREATE INDEX "subscriptions_company_id_idx" ON "subscriptions"("company_id");
