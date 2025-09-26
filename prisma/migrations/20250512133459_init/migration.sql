-- CreateTable
CREATE TABLE "companies" (
    "company_id" SERIAL NOT NULL,
    "company_name" TEXT,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),
    "industry" TEXT,
    "company_size" TEXT,
    "website" TEXT,
    "logo_url" TEXT,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "full_name" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "default_company_id" INTEGER,
    "profile_picture_url" TEXT,
    "job_title" TEXT,
    "phone" TEXT,
    "timezone" TEXT,
    "last_login" TIMESTAMP(3),
    "onboarding_completed" BOOLEAN,
    "marketing_opt_in" BOOLEAN,
    "terms_accepted" BOOLEAN NOT NULL DEFAULT false,
    "terms_accepted_date" TIMESTAMP(3),
    "email_verification_token" VARCHAR(255),
    "email_verification_token_expiry" TIMESTAMP(3),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "reset_password_token" VARCHAR(255),
    "reset_password_token_expiry" TIMESTAMP(3),
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "product_types" (
    "product_type_id" SERIAL NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "pricing_model" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "requires_subscription" BOOLEAN,
    "form_config" JSONB,
    "output_types" JSONB,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "product_types_pkey" PRIMARY KEY ("product_type_id")
);

-- CreateTable
CREATE TABLE "product_instances" (
    "instance_id" SERIAL NOT NULL,
    "product_type_id" INTEGER,
    "company_id" INTEGER,
    "created_by" INTEGER,
    "last_modified_by" INTEGER,
    "title" TEXT,
    "description" TEXT,
    "unique_slug" TEXT,
    "public_access_level" TEXT,
    "current_version_id" INTEGER,
    "is_template" BOOLEAN,
    "template_id" INTEGER,
    "status" TEXT,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),
    "completion_percentage" INTEGER NOT NULL DEFAULT 0,
    "last_autosave_at" TIMESTAMP(3),
    "sections_completed" JSONB,

    CONSTRAINT "product_instances_pkey" PRIMARY KEY ("instance_id")
);

-- CreateTable
CREATE TABLE "product_versions" (
    "version_id" SERIAL NOT NULL,
    "instance_id" INTEGER,
    "version_number" INTEGER,
    "created_by" INTEGER,
    "changes_description" TEXT,
    "change_type" TEXT,
    "created_at" TIMESTAMP(3),

    CONSTRAINT "product_versions_pkey" PRIMARY KEY ("version_id")
);

-- CreateTable
CREATE TABLE "product_form_data" (
    "form_data_id" SERIAL NOT NULL,
    "instance_id" INTEGER,
    "section_name" TEXT,
    "version_id" INTEGER,
    "form_data" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "product_form_data_pkey" PRIMARY KEY ("form_data_id")
);

-- CreateTable
CREATE TABLE "user_favorites" (
    "favorite_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("favorite_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "product_instances_unique_slug_key" ON "product_instances"("unique_slug");

-- CreateIndex
CREATE INDEX "idx_user_favorites_user" ON "user_favorites"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorites_user_id_instance_id_key" ON "user_favorites"("user_id", "instance_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_default_company_id_fkey" FOREIGN KEY ("default_company_id") REFERENCES "companies"("company_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_instances" ADD CONSTRAINT "product_instances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_instances" ADD CONSTRAINT "product_instances_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_instances" ADD CONSTRAINT "product_instances_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_instances" ADD CONSTRAINT "product_instances_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_types"("product_type_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_instances" ADD CONSTRAINT "product_instances_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "product_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_versions" ADD CONSTRAINT "product_versions_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "product_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_versions" ADD CONSTRAINT "product_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_form_data" ADD CONSTRAINT "product_form_data_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "product_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_form_data" ADD CONSTRAINT "product_form_data_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "product_versions"("version_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "product_instances"("instance_id") ON DELETE RESTRICT ON UPDATE CASCADE;
