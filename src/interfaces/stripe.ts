export interface NewUser {
  email: string;
  full_name: string;
  company_id?: number;
  reset_password_token_expiry?: Date;
  reset_password_token?: string;
  stripe_customer_id: string;
  email_verified?: boolean;
  created_at?: Date;
}

export interface StripeWebhookEvent {
  stripe_event_id: string;
  type?: string;
  data?: Record<string, any>;
  processed: boolean;
}

export interface Subscription {
  company_id: number;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id?: string;
  start_date?: Date;
  renewal_date: Date;
  plan_name?: string;
  status: string;
  billing_email?: string;
  billing_cycle?: string;
}

export interface CustomOrder {
  user_id: number;
  company_id: number;
  stripe_payment_intent_id?: string;
  stripe_checkout_session_id: string;
  product_type: string;
  amount: number;
  currency: string;
  status: string;
  customer_email: string;
}

export interface NewAccountCredit {
  company_id: number;
  invoice_id?: string;
  amount: number;
}