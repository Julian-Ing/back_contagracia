-- CreateTable
CREATE TABLE "default_company_payment_methods" (
    "id" TEXT NOT NULL,
    "payment_method_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "default_company_payment_methods_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "default_company_payment_methods" ADD CONSTRAINT "default_company_payment_methods_payment_method_code_fkey" FOREIGN KEY ("payment_method_code") REFERENCES "payment_methods"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
