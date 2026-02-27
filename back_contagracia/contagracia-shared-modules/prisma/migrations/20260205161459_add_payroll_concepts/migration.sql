-- CreateTable
CREATE TABLE "payroll_concepts" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "debit_account_code" TEXT,
    "administrative_debit_account_code" TEXT,
    "credit_account_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_concepts_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "payroll_concepts" ADD CONSTRAINT "payroll_concepts_debit_account_code_fkey" FOREIGN KEY ("debit_account_code") REFERENCES "chart_of_accounts"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_concepts" ADD CONSTRAINT "payroll_concepts_administrative_debit_account_code_fkey" FOREIGN KEY ("administrative_debit_account_code") REFERENCES "chart_of_accounts"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_concepts" ADD CONSTRAINT "payroll_concepts_credit_account_code_fkey" FOREIGN KEY ("credit_account_code") REFERENCES "chart_of_accounts"("code") ON DELETE SET NULL ON UPDATE CASCADE;
