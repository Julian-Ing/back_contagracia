-- Re-create trgm indexes on modules (seed.ts creates them, migration 20260224142101 dropped them incorrectly)
CREATE INDEX IF NOT EXISTS idx_modules_module_name_trgm ON "modules" USING GIN (module_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_modules_module_key_trgm ON "modules" USING GIN (module_key gin_trgm_ops);

-- ============================================================
-- STEP 1: Save company profile data to staging table
-- seed-all-tenants.ts reads from here and writes to tenant CompanySetting
-- ============================================================
CREATE TABLE IF NOT EXISTS "_company_profile_staging" (
  company_id TEXT PRIMARY KEY,
  dv TEXT,
  phone TEXT,
  address TEXT,
  whatsapp_number TEXT,
  country_id TEXT,
  department_id TEXT,
  municipality_id TEXT,
  type_document_identification_id TEXT,
  type_organization_id TEXT,
  type_regime_id TEXT,
  type_liability_id TEXT,
  legal_rep_name TEXT,
  legal_rep_identification TEXT,
  legal_rep_email TEXT,
  legal_rep_phone TEXT,
  legal_rep_signature_url TEXT
);

INSERT INTO "_company_profile_staging" (
  company_id, dv, phone, address, whatsapp_number,
  country_id, department_id, municipality_id,
  type_document_identification_id, type_organization_id,
  type_regime_id, type_liability_id,
  legal_rep_name, legal_rep_identification,
  legal_rep_email, legal_rep_phone, legal_rep_signature_url
)
SELECT
  id,
  dv, phone, address, whatsapp_number,
  CAST(country_id AS TEXT), CAST(department_id AS TEXT), CAST(municipality_id AS TEXT),
  CAST(type_document_identification_id AS TEXT), CAST(type_organization_id AS TEXT),
  CAST(type_regime_id AS TEXT), CAST(type_liability_id AS TEXT),
  legal_rep_name, legal_rep_identification,
  legal_rep_email, legal_rep_phone, legal_rep_signature_url
FROM companies
WHERE is_active = true
ON CONFLICT (company_id) DO NOTHING;

-- ============================================================
-- STEP 2: Drop FK constraints and columns (now safe — data is in staging)
-- ============================================================

-- DropForeignKey
ALTER TABLE "companies" DROP CONSTRAINT IF EXISTS "companies_country_id_fkey";

-- DropForeignKey
ALTER TABLE "companies" DROP CONSTRAINT IF EXISTS "companies_department_id_fkey";

-- DropForeignKey
ALTER TABLE "companies" DROP CONSTRAINT IF EXISTS "companies_municipality_id_fkey";

-- DropForeignKey
ALTER TABLE "companies" DROP CONSTRAINT IF EXISTS "companies_type_document_identification_id_fkey";

-- DropForeignKey
ALTER TABLE "companies" DROP CONSTRAINT IF EXISTS "companies_type_liability_id_fkey";

-- DropForeignKey
ALTER TABLE "companies" DROP CONSTRAINT IF EXISTS "companies_type_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "companies" DROP CONSTRAINT IF EXISTS "companies_type_regime_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "companies_country_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "companies_department_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "companies_municipality_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "companies_type_organization_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "companies_whatsapp_number_key";

-- AlterTable
ALTER TABLE "companies" DROP COLUMN IF EXISTS "address",
DROP COLUMN IF EXISTS "country_id",
DROP COLUMN IF EXISTS "department_id",
DROP COLUMN IF EXISTS "dv",
DROP COLUMN IF EXISTS "legal_rep_email",
DROP COLUMN IF EXISTS "legal_rep_identification",
DROP COLUMN IF EXISTS "legal_rep_name",
DROP COLUMN IF EXISTS "legal_rep_phone",
DROP COLUMN IF EXISTS "legal_rep_signature_url",
DROP COLUMN IF EXISTS "municipality_id",
DROP COLUMN IF EXISTS "phone",
DROP COLUMN IF EXISTS "type_document_identification_id",
DROP COLUMN IF EXISTS "type_liability_id",
DROP COLUMN IF EXISTS "type_organization_id",
DROP COLUMN IF EXISTS "type_regime_id",
DROP COLUMN IF EXISTS "whatsapp_number";
