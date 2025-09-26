-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripe_customer_id" VARCHAR(255);

-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "event_id" SERIAL NOT NULL,
    "stripe_event_id" TEXT NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "data" JSONB,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "subscription_id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "plan_name" VARCHAR,
    "seat_limit" INTEGER,
    "seats_used" INTEGER,
    "status" VARCHAR,
    "start_date" TIMESTAMP(3),
    "renewal_date" TIMESTAMP(3),
    "trial_end_date" TIMESTAMP(3),
    "stripe_customer_id" VARCHAR,
    "stripe_subscription_id" VARCHAR,
    "stripe_price_id" VARCHAR,
    "billing_cycle" VARCHAR,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "payment_failure_count" INTEGER DEFAULT 0,
    "billing_email" VARCHAR,
    "billing_address" JSONB,
    "payment_method_id" VARCHAR,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("subscription_id")
);

-- CreateTable
CREATE TABLE "custom_model_orders" (
    "order_id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "user_id" INTEGER,
    "stripe_payment_intent_id" VARCHAR(255) NOT NULL,
    "stripe_checkout_session_id" VARCHAR(255),
    "product_type" VARCHAR(50) NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'gbp',
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "customer_email" VARCHAR(255),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_model_orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stripe_webhook_events_stripe_event_id_key" ON "stripe_webhook_events"("stripe_event_id");

-- CreateIndex
CREATE INDEX "idx_webhook_events_type" ON "stripe_webhook_events"("type");

-- CreateIndex
CREATE INDEX "idx_webhook_events_processed" ON "stripe_webhook_events"("processed");

-- CreateIndex
CREATE INDEX "idx_webhook_events_created" ON "stripe_webhook_events"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_company_id_key" ON "subscriptions"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_model_orders_stripe_payment_intent_id_key" ON "custom_model_orders"("stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_model_orders_stripe_checkout_session_id_key" ON "custom_model_orders"("stripe_checkout_session_id");

-- CreateIndex
CREATE INDEX "idx_custom_orders_company" ON "custom_model_orders"("company_id");

-- CreateIndex
CREATE INDEX "idx_custom_orders_user" ON "custom_model_orders"("user_id");

-- CreateIndex
CREATE INDEX "idx_custom_orders_status" ON "custom_model_orders"("status");

-- CreateIndex
CREATE INDEX "idx_custom_orders_product_type" ON "custom_model_orders"("product_type");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "custom_model_orders" ADD CONSTRAINT "custom_model_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "custom_model_orders" ADD CONSTRAINT "custom_model_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
