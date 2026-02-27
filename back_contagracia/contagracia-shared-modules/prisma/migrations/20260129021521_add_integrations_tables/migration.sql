/*
  Warnings:

  - Added the required column `email` to the `email_verifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "email_verifications" ADD COLUMN     "code" TEXT,
ADD COLUMN     "email" TEXT NOT NULL,
ALTER COLUMN "user_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_keys" (
    "id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "key_name" TEXT NOT NULL,
    "key_value" TEXT NOT NULL,
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integrations_code_key" ON "integrations"("code");

-- CreateIndex
CREATE INDEX "integrations_type_is_active_idx" ON "integrations"("type", "is_active");

-- CreateIndex
CREATE INDEX "integration_keys_integration_id_idx" ON "integration_keys"("integration_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_keys_integration_id_key_name_key" ON "integration_keys"("integration_id", "key_name");

-- CreateIndex
CREATE INDEX "email_verifications_email_idx" ON "email_verifications"("email");

-- CreateIndex
CREATE INDEX "email_verifications_code_idx" ON "email_verifications"("code");

-- AddForeignKey
ALTER TABLE "integration_keys" ADD CONSTRAINT "integration_keys_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
