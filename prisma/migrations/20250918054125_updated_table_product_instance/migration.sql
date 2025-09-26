ALTER TABLE "product_instances" 
    ADD COLUMN "archived_at" TIMESTAMP(3),
    ADD COLUMN "archived_deleted_at" TIMESTAMP(3),
    ADD COLUMN "archived_reason" TEXT,
    ADD COLUMN "clone_count" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "cloned_from" TEXT,
    ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "is_clone" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "is_locked" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "locked_at" TIMESTAMP(3),
    ADD COLUMN "locked_by" INTEGER,
    ADD COLUMN "locked_reason" TEXT,
    ADD COLUMN "was_from_plan" TEXT;

ALTER TABLE "product_instances"
    ADD CONSTRAINT archived_reason_check 
    CHECK ("archived_reason" IN ('downgrade', 'trial_expired', 'cancelled'));

CREATE INDEX "idx_product_instances_is_locked" ON "product_instances"("is_locked");

CREATE INDEX "idx_product_instances_is_archived" ON "product_instances"("is_archived");

CREATE INDEX "idx_product_instances_archive_delete_at" ON "product_instances"("archived_deleted_at");

CREATE INDEX "idx_product_instances_company_deleted" ON "product_instances"("company_id", "deleted_at");

CREATE INDEX "idx_product_instances_cloned_from" ON "product_instances"("cloned_from");

ALTER TABLE "product_instances" 
  ADD CONSTRAINT "product_instances_locked_by_fkey" 
  FOREIGN KEY ("locked_by") REFERENCES "users"("user_id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_instances" 
  ADD CONSTRAINT "product_instances_cloned_from_fkey" 
  FOREIGN KEY ("cloned_from") REFERENCES "product_instances"("instance_id") 
  ON DELETE SET NULL ON UPDATE CASCADE;
