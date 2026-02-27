/*
  Warnings:

  - A unique constraint covering the columns `[consecutive]` on the table `company_payment_methods` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "company_payment_methods" ADD COLUMN     "consecutive" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "company_payment_methods_consecutive_key" ON "company_payment_methods"("consecutive");
