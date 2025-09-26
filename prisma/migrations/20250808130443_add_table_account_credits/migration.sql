-- CreateTable
CREATE TABLE "account_credits" (
    "credit_id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" VARCHAR(255),
    "invoice_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "account_credits_pkey" PRIMARY KEY ("credit_id")
);

-- AddForeignKey
ALTER TABLE "account_credits" ADD CONSTRAINT "account_credits_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
