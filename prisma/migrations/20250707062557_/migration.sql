-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('bug', 'data_issue', 'account', 'model_help', 'feature_request', 'other');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" SERIAL NOT NULL,
    "ticket_number" INTEGER NOT NULL DEFAULT nextval('support_tickets_ticket_number_seq'::regclass),
    "user_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "ticket_type" "TicketType" NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "priority" "TicketPriority" NOT NULL DEFAULT 'medium',
    "page_url" TEXT,
    "browser_info" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "platform" VARCHAR(10) NOT NULL DEFAULT 'PH3',

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_ticket_number_key" ON "support_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "idx_support_tickets_user_id" ON "support_tickets"("user_id");

-- CreateIndex
CREATE INDEX "idx_support_tickets_company_id" ON "support_tickets"("company_id");

-- CreateIndex
CREATE INDEX "idx_support_tickets_status" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "idx_support_tickets_created_at" ON "support_tickets"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_support_tickets_ticket_number" ON "support_tickets"("ticket_number");

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;
