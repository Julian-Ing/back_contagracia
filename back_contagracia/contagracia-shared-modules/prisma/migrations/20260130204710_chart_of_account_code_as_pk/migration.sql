/*
  Warnings:

  - You are about to drop the column `account_id` on the `accounting_configs` table. All the data in the column will be lost.
  - The primary key for the `chart_of_accounts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `chart_of_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `parent_id` on the `chart_of_accounts` table. All the data in the column will be lost.
  - Added the required column `account_code` to the `accounting_configs` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "accounting_configs" DROP CONSTRAINT "accounting_configs_account_id_fkey";

-- DropForeignKey
ALTER TABLE "chart_of_accounts" DROP CONSTRAINT "chart_of_accounts_parent_id_fkey";

-- DropIndex
DROP INDEX "chart_of_accounts_code_key";

-- DropIndex
DROP INDEX "chart_of_accounts_parent_id_idx";

-- AlterTable
ALTER TABLE "accounting_configs" DROP COLUMN "account_id",
ADD COLUMN     "account_code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "chart_of_accounts" DROP CONSTRAINT "chart_of_accounts_pkey",
DROP COLUMN "id",
DROP COLUMN "parent_id",
ADD COLUMN     "parent_code" TEXT,
ADD CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("code");

-- CreateIndex
CREATE INDEX "chart_of_accounts_parent_code_idx" ON "chart_of_accounts"("parent_code");

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_code_fkey" FOREIGN KEY ("parent_code") REFERENCES "chart_of_accounts"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_account_code_fkey" FOREIGN KEY ("account_code") REFERENCES "chart_of_accounts"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
