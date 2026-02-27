/*
  Warnings:

  - You are about to drop the `tax_rates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "tax_rates" DROP CONSTRAINT "tax_rates_tax_type_id_fkey";

-- DropTable
DROP TABLE "tax_rates";

-- CreateTable
CREATE TABLE "taxes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(8,4) NOT NULL,
    "tax_type_id" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taxes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "taxes_code_key" ON "taxes"("code");

-- AddForeignKey
ALTER TABLE "taxes" ADD CONSTRAINT "taxes_tax_type_id_fkey" FOREIGN KEY ("tax_type_id") REFERENCES "tax_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
