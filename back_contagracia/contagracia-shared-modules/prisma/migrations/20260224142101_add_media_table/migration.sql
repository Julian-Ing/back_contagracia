-- DropIndex
DROP INDEX IF EXISTS "idx_modules_module_key_trgm";

-- DropIndex
DROP INDEX IF EXISTS "idx_modules_module_name_trgm";

-- AlterTable
ALTER TABLE "company_notifications" ADD COLUMN IF NOT EXISTS "exclude_user_id" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "media" (
    "id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "uploaded_by" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "media_category_idx" ON "media"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "media_uploaded_by_idx" ON "media"("uploaded_by");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "company_notifications_exclude_user_id_idx" ON "company_notifications"("exclude_user_id");
