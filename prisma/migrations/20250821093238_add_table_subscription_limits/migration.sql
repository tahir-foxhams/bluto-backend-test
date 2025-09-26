-- AlterTable
ALTER TABLE "product_instances" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" INTEGER;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "is_manual_trial" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "seat_limit",
ADD COLUMN     "models_used" INTEGER;


-- CreateTable
CREATE TABLE "subscription_limits" (
    "plan_name" VARCHAR(255) NOT NULL,
    "max_models" INTEGER,
    "included_seats" INTEGER NOT NULL DEFAULT 1,
    "has_export" BOOLEAN NOT NULL DEFAULT false,
    "has_advanced_analytics" BOOLEAN NOT NULL DEFAULT false,
    "has_api_access" BOOLEAN NOT NULL DEFAULT false,
    "allows_view_sharing" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_limits_pkey" PRIMARY KEY ("plan_name")
);

-- AddForeignKey
ALTER TABLE "product_instances" ADD CONSTRAINT "product_instances_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
