-- CreateTable
CREATE TABLE "accounting_configs" (
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "default" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_configs_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "accounting_configs" ADD CONSTRAINT "accounting_configs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
