/*
  Warnings:

  - You are about to drop the column `code` on the `product_units` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "product_units_code_key";

-- AlterTable
ALTER TABLE "product_units" DROP COLUMN "code",
ALTER COLUMN "symbol" DROP NOT NULL;
