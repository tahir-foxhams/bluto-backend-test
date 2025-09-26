-- CreateTable
CREATE TABLE "demo_requests" (
    "id" SERIAL NOT NULL,
    "request_number" INTEGER NOT NULL DEFAULT nextval('demo_requests_request_number_seq'::regclass),
    "user_type" VARCHAR(50) NOT NULL,
    "is_qualified" BOOLEAN NOT NULL DEFAULT false,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "company_name" VARCHAR(255),
    "phone" VARCHAR(50),
    "additional_info" TEXT,
    "form_data" JSONB NOT NULL,
    "calendly_shown_at" TIMESTAMPTZ,
    "calendly_scheduled" BOOLEAN NOT NULL DEFAULT false,
    "booking_token" UUID NOT NULL,
    "token_expires_at" TIMESTAMPTZ NOT NULL DEFAULT (now() + '7 days'::interval),
    "follow_up_sent" BOOLEAN NOT NULL DEFAULT false,
    "follow_up_sent_at" TIMESTAMPTZ,
    "source_url" TEXT,
    "utm_source" VARCHAR(100),
    "utm_medium" VARCHAR(100),
    "utm_campaign" VARCHAR(100),
    "browser_info" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "demo_requests_request_number_key" ON "demo_requests"("request_number");

-- CreateIndex
CREATE UNIQUE INDEX "demo_requests_booking_token_key" ON "demo_requests"("booking_token");

-- CreateIndex
CREATE INDEX "idx_demo_requests_email" ON "demo_requests"("email");

-- CreateIndex
CREATE INDEX "idx_demo_requests_qualified" ON "demo_requests"("is_qualified");

-- CreateIndex
CREATE INDEX "idx_demo_requests_follow_up" ON "demo_requests"("calendly_shown_at", "calendly_scheduled", "follow_up_sent");
