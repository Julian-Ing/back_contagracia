-- CreateTable
CREATE TABLE "tax_obligation_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'nacional',
    "periodicity" TEXT NOT NULL,
    "nit_digit_type" TEXT NOT NULL DEFAULT 'last_1',
    "applies_to_gran_contribuyente" BOOLEAN NOT NULL DEFAULT false,
    "applies_to_persona_juridica" BOOLEAN NOT NULL DEFAULT true,
    "applies_to_persona_natural" BOOLEAN NOT NULL DEFAULT true,
    "applies_to_rst" BOOLEAN NOT NULL DEFAULT false,
    "has_multiple_installments" BOOLEAN NOT NULL DEFAULT false,
    "installment_count" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_obligation_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_obligation_types_code_key" ON "tax_obligation_types"("code");
