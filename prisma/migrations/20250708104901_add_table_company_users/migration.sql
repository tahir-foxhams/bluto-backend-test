-- CreateTable
CREATE TABLE "company_users" (
    "company_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT,
    "seat_status" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "custom_permissions" JSONB,

    CONSTRAINT "company_users_pkey" PRIMARY KEY ("company_id","user_id")
);

-- AddForeignKey
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
