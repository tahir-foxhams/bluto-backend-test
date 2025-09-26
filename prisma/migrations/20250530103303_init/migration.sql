/*
  Warnings:

  - The primary key for the `product_instances` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "product_form_data" DROP CONSTRAINT "product_form_data_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "product_instances" DROP CONSTRAINT "product_instances_template_id_fkey";

-- DropForeignKey
ALTER TABLE "product_versions" DROP CONSTRAINT "product_versions_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "recent_accesses" DROP CONSTRAINT "recent_accesses_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "user_favorites" DROP CONSTRAINT "user_favorites_instance_id_fkey";

-- AlterTable
ALTER TABLE "product_form_data" ALTER COLUMN "instance_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "product_instances" DROP CONSTRAINT "product_instances_pkey",
ALTER COLUMN "instance_id" DROP DEFAULT,
ALTER COLUMN "instance_id" SET DATA TYPE TEXT,
ALTER COLUMN "template_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "product_instances_pkey" PRIMARY KEY ("instance_id");
DROP SEQUENCE "product_instances_instance_id_seq";

-- AlterTable
ALTER TABLE "product_versions" ALTER COLUMN "instance_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "recent_accesses" ALTER COLUMN "instance_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "user_favorites" ALTER COLUMN "instance_id" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "user_social_accounts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "profile_picture_url" TEXT,
    "id_token" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_user_social_accounts_user_id" ON "user_social_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_social_accounts_user_id_provider_provider_user_id_key" ON "user_social_accounts"("user_id", "provider", "provider_user_id");

-- AddForeignKey
ALTER TABLE "product_instances" ADD CONSTRAINT "product_instances_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "product_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_versions" ADD CONSTRAINT "product_versions_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "product_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_form_data" ADD CONSTRAINT "product_form_data_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "product_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "product_instances"("instance_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recent_accesses" ADD CONSTRAINT "recent_accesses_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "product_instances"("instance_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_social_accounts" ADD CONSTRAINT "user_social_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
