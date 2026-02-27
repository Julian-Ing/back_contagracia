-- CreateEnum
CREATE TYPE "PayrollConceptType" AS ENUM ('ACCRUED', 'DEDUCTION', 'PROVISION', 'PARAFISCAL');

-- AlterTable
ALTER TABLE "payroll_concepts" ADD COLUMN     "concept_type" "PayrollConceptType" NOT NULL DEFAULT 'ACCRUED',
ADD COLUMN     "is_array" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_legal" BOOLEAN NOT NULL DEFAULT false;
