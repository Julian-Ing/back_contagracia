-- AlterTable
ALTER TABLE "payroll_concepts" ADD COLUMN     "default_percentage" DECIMAL(18,4),
ADD COLUMN     "default_value" DECIMAL(18,4),
ADD COLUMN     "is_percentage" BOOLEAN NOT NULL DEFAULT false;
