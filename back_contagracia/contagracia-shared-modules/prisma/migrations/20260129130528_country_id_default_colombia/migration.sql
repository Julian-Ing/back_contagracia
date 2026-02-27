-- AlterTable
ALTER TABLE "companies" ALTER COLUMN "country_id" SET DEFAULT '46';

-- Update existing records
UPDATE "companies" SET "country_id" = '46' WHERE "country_id" IS NULL;
