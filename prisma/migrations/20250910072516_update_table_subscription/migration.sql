-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "payment_failure_count",
ADD COLUMN     "last_payment_error" JSONB;
