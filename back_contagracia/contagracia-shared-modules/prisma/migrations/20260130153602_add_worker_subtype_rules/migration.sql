-- CreateTable
CREATE TABLE "worker_subtype_rules" (
    "id" TEXT NOT NULL,
    "sub_type_worker_id" TEXT NOT NULL,
    "health_employee_rate" DECIMAL(5,2),
    "health_employer_rate" DECIMAL(5,2),
    "pension_employee_rate" DECIMAL(5,2),
    "pension_employer_rate" DECIMAL(5,2),
    "health_employee_pays" BOOLEAN NOT NULL DEFAULT true,
    "pension_employee_pays" BOOLEAN NOT NULL DEFAULT true,
    "ccf_applies" BOOLEAN NOT NULL DEFAULT true,
    "icbf_applies" BOOLEAN NOT NULL DEFAULT true,
    "sena_applies" BOOLEAN NOT NULL DEFAULT true,
    "arl_applies" BOOLEAN NOT NULL DEFAULT true,
    "fsp_applies" BOOLEAN NOT NULL DEFAULT true,
    "fsp_special_rate" DECIMAL(5,2),
    "ibc_min_smmlv_percentage" DECIMAL(5,2),
    "legal_notes" TEXT,
    "ui_display_name" TEXT,
    "ui_impacts" JSONB,
    "ui_color" TEXT DEFAULT 'amber',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "worker_subtype_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "worker_subtype_rules_sub_type_worker_id_key" ON "worker_subtype_rules"("sub_type_worker_id");
