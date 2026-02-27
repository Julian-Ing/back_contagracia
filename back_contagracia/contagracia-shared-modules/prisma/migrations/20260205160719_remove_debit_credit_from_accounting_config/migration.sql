/*
  Warnings:

  - You are about to drop the column `credit_account_code` on the `accounting_configs` table. All the data in the column will be lost.
  - You are about to drop the column `debit_account_code` on the `accounting_configs` table. All the data in the column will be lost.
  - You are about to drop the column `default_credit` on the `accounting_configs` table. All the data in the column will be lost.
  - You are about to drop the column `default_debit` on the `accounting_configs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "accounting_configs" DROP CONSTRAINT "accounting_configs_credit_account_code_fkey";

-- DropForeignKey
ALTER TABLE "accounting_configs" DROP CONSTRAINT "accounting_configs_debit_account_code_fkey";

-- AlterTable
ALTER TABLE "accounting_configs" DROP COLUMN "credit_account_code",
DROP COLUMN "debit_account_code",
DROP COLUMN "default_credit",
DROP COLUMN "default_debit";
