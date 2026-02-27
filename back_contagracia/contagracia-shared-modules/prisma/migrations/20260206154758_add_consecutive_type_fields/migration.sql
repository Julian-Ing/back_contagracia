-- AlterTable
ALTER TABLE "consecutive_types" ADD COLUMN     "condition_field" TEXT,
ADD COLUMN     "condition_value" TEXT,
ADD COLUMN     "field_name" TEXT NOT NULL DEFAULT 'consecutive',
ADD COLUMN     "table_name" TEXT;
