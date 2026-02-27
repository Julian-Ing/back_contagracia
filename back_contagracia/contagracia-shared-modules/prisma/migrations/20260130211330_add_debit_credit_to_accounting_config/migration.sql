-- DropForeignKey
ALTER TABLE "accounting_configs" DROP CONSTRAINT "accounting_configs_account_code_fkey";

-- AlterTable
ALTER TABLE "accounting_configs" ADD COLUMN     "credit_account_code" TEXT,
ADD COLUMN     "debit_account_code" TEXT,
ALTER COLUMN "account_code" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_account_code_fkey" FOREIGN KEY ("account_code") REFERENCES "chart_of_accounts"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_debit_account_code_fkey" FOREIGN KEY ("debit_account_code") REFERENCES "chart_of_accounts"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_credit_account_code_fkey" FOREIGN KEY ("credit_account_code") REFERENCES "chart_of_accounts"("code") ON DELETE SET NULL ON UPDATE CASCADE;
