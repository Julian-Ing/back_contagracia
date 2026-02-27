/*
  Warnings:

  - You are about to alter the column `price` on the `plans` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Decimal(10,4)`.

*/
-- AlterTable
ALTER TABLE "arl_risks" ALTER COLUMN "rate" SET DATA TYPE DECIMAL(8,4);

-- AlterTable
ALTER TABLE "plans" ALTER COLUMN "price" SET DATA TYPE DECIMAL(10,4);

-- AlterTable
ALTER TABLE "tax_rates" ALTER COLUMN "rate" SET DATA TYPE DECIMAL(8,4);

-- AlterTable
ALTER TABLE "worker_subtype_rules" ALTER COLUMN "health_employee_rate" SET DATA TYPE DECIMAL(8,4),
ALTER COLUMN "health_employer_rate" SET DATA TYPE DECIMAL(8,4),
ALTER COLUMN "pension_employee_rate" SET DATA TYPE DECIMAL(8,4),
ALTER COLUMN "pension_employer_rate" SET DATA TYPE DECIMAL(8,4),
ALTER COLUMN "fsp_special_rate" SET DATA TYPE DECIMAL(8,4),
ALTER COLUMN "ibc_min_smmlv_percentage" SET DATA TYPE DECIMAL(8,4);
