-- AlterTable
ALTER TABLE "tax_rates" ADD COLUMN     "tax_type_id" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_tax_type_id_fkey" FOREIGN KEY ("tax_type_id") REFERENCES "tax_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
