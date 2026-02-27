-- CreateEnum
CREATE TYPE "TransactionDirection" AS ENUM ('IN', 'OUT');

-- CreateTable
CREATE TABLE "bank_adjustment_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "direction" "TransactionDirection" NOT NULL,
    "account_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_adjustment_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_adjustment_types_direction_idx" ON "bank_adjustment_types"("direction");

-- AddForeignKey
ALTER TABLE "bank_adjustment_types" ADD CONSTRAINT "bank_adjustment_types_account_code_fkey" FOREIGN KEY ("account_code") REFERENCES "chart_of_accounts"("code") ON DELETE SET NULL ON UPDATE CASCADE;
