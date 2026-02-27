/*
  Warnings:

  - You are about to drop the column `risk_level` on the `system_actions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "system_actions" DROP COLUMN "risk_level";

-- DropEnum
DROP TYPE "RiskLevel";

-- CreateTable
CREATE TABLE "tax_calendar_dates" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "tax_obligation_type_id" TEXT NOT NULL,
    "period_name" TEXT NOT NULL,
    "period_start_month" INTEGER,
    "period_end_month" INTEGER,
    "installment_number" INTEGER NOT NULL DEFAULT 1,
    "installment_description" TEXT,
    "nit_last_digits" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "due_month_name" TEXT NOT NULL,
    "due_day" INTEGER NOT NULL,
    "is_declaration" BOOLEAN NOT NULL DEFAULT false,
    "is_payment" BOOLEAN NOT NULL DEFAULT true,
    "source_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_calendar_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_calendar_sync_logs" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "source_url" TEXT,
    "source_file_name" TEXT,
    "status" TEXT NOT NULL,
    "records_created" INTEGER NOT NULL DEFAULT 0,
    "records_updated" INTEGER NOT NULL DEFAULT 0,
    "sync_duration_ms" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_calendar_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tax_calendar_dates_year_tax_obligation_type_id_idx" ON "tax_calendar_dates"("year", "tax_obligation_type_id");

-- CreateIndex
CREATE INDEX "tax_calendar_dates_due_date_idx" ON "tax_calendar_dates"("due_date");

-- CreateIndex
CREATE INDEX "tax_calendar_dates_nit_last_digits_idx" ON "tax_calendar_dates"("nit_last_digits");

-- AddForeignKey
ALTER TABLE "tax_calendar_dates" ADD CONSTRAINT "tax_calendar_dates_tax_obligation_type_id_fkey" FOREIGN KEY ("tax_obligation_type_id") REFERENCES "tax_obligation_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
