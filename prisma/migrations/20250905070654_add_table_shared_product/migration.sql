-- AlterTable
ALTER TABLE "company_users" ADD COLUMN     "removed_from_company_at" TIMESTAMP(3),
ADD COLUMN     "removed_from_company_by" INTEGER;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "first_subscription_date" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "shared_products" (
    "share_id" SERIAL NOT NULL,
    "instance_id" TEXT,
    "shared_by" INTEGER,
    "shared_with_email" TEXT,
    "permission" TEXT,
    "access_token" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiration" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "prevent_download" BOOLEAN,
    "disable_comments" BOOLEAN,
    "last_accessed" TIMESTAMP(3),
    "visits_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "shared_products_pkey" PRIMARY KEY ("share_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shared_products_instance_id_shared_with_email_key" ON "shared_products"("instance_id", "shared_with_email");

-- AddForeignKey
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_removed_from_company_by_fkey" FOREIGN KEY ("removed_from_company_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_products" ADD CONSTRAINT "shared_products_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "product_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_products" ADD CONSTRAINT "shared_products_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
