-- AlterTable
ALTER TABLE "accounting_configs" ADD COLUMN     "default_credit" TEXT,
ADD COLUMN     "default_debit" TEXT,
ALTER COLUMN "default" DROP NOT NULL;
