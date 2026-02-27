-- CreateTable
CREATE TABLE "company_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_category_assignments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_category_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_categories_name_key" ON "company_categories"("name");

-- CreateIndex
CREATE INDEX "company_category_assignments_company_id_idx" ON "company_category_assignments"("company_id");

-- CreateIndex
CREATE INDEX "company_category_assignments_category_id_idx" ON "company_category_assignments"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_category_assignments_company_id_category_id_key" ON "company_category_assignments"("company_id", "category_id");

-- AddForeignKey
ALTER TABLE "company_category_assignments" ADD CONSTRAINT "company_category_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_category_assignments" ADD CONSTRAINT "company_category_assignments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "company_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
