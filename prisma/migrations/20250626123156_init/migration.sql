-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_change_attempted_at" TIMESTAMP(3),
ADD COLUMN     "email_change_token" VARCHAR(255),
ADD COLUMN     "email_change_token_expiry" TIMESTAMP(3),
ADD COLUMN     "email_updated_at" TIMESTAMP(3),
ADD COLUMN     "pending_new_email" TEXT;
