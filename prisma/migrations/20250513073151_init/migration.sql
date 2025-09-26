-- CreateTable
CREATE TABLE "recent_accesses" (
    "access_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recent_accesses_pkey" PRIMARY KEY ("access_id")
);

-- CreateIndex
CREATE INDEX "recent_accesses_accessed_at_idx" ON "recent_accesses"("accessed_at" DESC);

-- CreateIndex
CREATE INDEX "recent_accesses_user_id_idx" ON "recent_accesses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "recent_accesses_user_id_instance_id_key" ON "recent_accesses"("user_id", "instance_id");

-- AddForeignKey
ALTER TABLE "recent_accesses" ADD CONSTRAINT "recent_accesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recent_accesses" ADD CONSTRAINT "recent_accesses_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "product_instances"("instance_id") ON DELETE RESTRICT ON UPDATE CASCADE;
