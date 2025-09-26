import prisma from "../../config/db";
import {
  NewUser,
  StripeWebhookEvent,
  Subscription,
  CustomOrder,
  NewAccountCredit,
} from "../../interfaces/stripe";

const getStripeWebhookEventById = async (stripe_event_id: string) => {
  return prisma.stripe_webhook_events.findUnique({
    where: { stripe_event_id },
    select: {
      processed: true,
    },
  });
};

const getUserByEmail = async (email: string) => {
  return prisma.users.findUnique({
    where: { email },
    select: {
      user_id: true,
      companies: {
        select: {
          company_id: true,
        },
      },
    },
  });
};

const checkUserCompany = async (user_id: number) => {
  const companyUser = await prisma.company_users.findFirst({
    where: {
      user_id,
      role: "owner",
    },
    select: {
      company: {
        select: {
          company_id: true,
        },
      },
    },
  });

  return companyUser?.company ?? null;
};

const getSubscription = async (subscription_id: string) => {
  return await prisma.subscriptions.findFirst({
    where: {
      stripe_subscription_id: subscription_id,
      status: {
        in: ["active", "past_due"],
      },
    },
    select: {
      cancel_at_period_end: true,
      last_payment_error: true,
      subscription_id: true,
      renewal_date: true,
      plan_name: true,
    },
  });
};

const createSubscriptionUser = async (userData: NewUser) => {
  return prisma.users.create({
    data: {
      email: userData.email,
      full_name: userData.full_name,
      default_company_id: userData.company_id,
      // timezone: userData.timezone,
      reset_password_token_expiry: userData.reset_password_token_expiry,
      reset_password_token: userData.reset_password_token,
      stripe_customer_id: userData.stripe_customer_id,
      created_at: userData.created_at,
      email_verified: userData.email_verified,
    },
  });
};

const updateSubscriptionUser = async (
  user_id: number,
  stripe_customer_id: string
) => {
  return await prisma.users.update({
    where: { user_id },
    data: { stripe_customer_id },
  });
};

const createStripeWebhookEvent = async (
  stripeWebhookEvent: StripeWebhookEvent
) => {
  return prisma.stripe_webhook_events.create({
    data: {
      stripe_event_id: stripeWebhookEvent.stripe_event_id,
      type: stripeWebhookEvent.type,
      data: stripeWebhookEvent.data,
      processed: stripeWebhookEvent.processed,
      created_at: new Date(),
    },
  });
};

const createOrUpdateUserSubscription = async (subscription: Subscription) => {
  return prisma.subscriptions.upsert({
    where: {
      company_id: subscription.company_id,
    },
    update: {
      stripe_customer_id: subscription.stripe_customer_id,
      stripe_subscription_id: subscription.stripe_subscription_id,
      status: subscription.status,
      start_date: new Date(),
      renewal_date: subscription.renewal_date,
      trial_end_date: null,
      is_manual_trial: false,
      updated_at: new Date(),
    },
    create: {
      company_id: subscription.company_id,
      stripe_customer_id: subscription.stripe_customer_id,
      stripe_subscription_id: subscription.stripe_subscription_id,
      stripe_price_id: subscription.stripe_price_id,
      plan_name: subscription.plan_name,
      status: subscription.status,
      seats_used: 1,
      first_subscription_date: subscription.start_date,
      start_date: new Date(),
      renewal_date: subscription.renewal_date,
      billing_email: subscription.billing_email,
      billing_cycle: subscription.billing_cycle,
      last_payment_error: null,
      trial_end_date: null,
      is_manual_trial: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
};

const upgradeUserSubscription = async (subscription: Subscription) => {
  return prisma.subscriptions.update({
    where: {
      company_id: subscription.company_id,
    },
    data: {
      company_id: subscription.company_id,
      stripe_customer_id: subscription.stripe_customer_id,
      stripe_subscription_id: subscription.stripe_subscription_id,
      stripe_price_id: subscription.stripe_price_id,
      plan_name: subscription.plan_name,
      status: subscription.status,
      first_subscription_date: subscription.start_date,
      start_date: new Date(),
      renewal_date: subscription.renewal_date,
      billing_email: subscription.billing_email,
      billing_cycle: subscription.billing_cycle,
      last_payment_error: null,
      trial_end_date: null,
      is_manual_trial: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
};

const createAccountCredits = async (accountCredit: NewAccountCredit) => {
  return prisma.account_credits.create({
    data: {
      company_id: accountCredit.company_id,
      amount: accountCredit.amount,
      description: "Duplicate subscription payment converted to credit",
      invoice_id: accountCredit.invoice_id,
      created_at: new Date(),
    },
  });
};

const createCustomOrder = async (customOrder: CustomOrder) => {
  return prisma.custom_model_orders.create({
    data: {
      user_id: customOrder.user_id,
      company_id: customOrder.company_id,
      stripe_payment_intent_id: customOrder.stripe_payment_intent_id,
      stripe_checkout_session_id: customOrder.stripe_checkout_session_id,
      product_type: customOrder.product_type,
      amount: customOrder.amount,
      currency: customOrder.currency,
      status: customOrder.status,
      customer_email: customOrder.customer_email,
    },
  });
};

const updateSubscription = async (
  subscription_id: number,
  cancel_at_period_end: boolean,
  status?: string
) => {
  return await prisma.subscriptions.update({
    where: { subscription_id },
    data: {
      cancel_at_period_end,
      status,
      last_payment_error: null,
    },
  });
};

const updateSubscriptionRenewalTime = async (
  subscription_id: number,
  start_date: Date,
  renewal_date: Date
) => {
  return await prisma.subscriptions.update({
    where: { subscription_id },
    data: {
      status: "active",
      last_payment_error: null,
      start_date,
      renewal_date,
    },
  });
};

const getCompanySubscriptionStatus = async (companyId: number) => {
  return prisma.subscriptions.findFirst({
    where: { company_id: companyId },
    select: {
      stripe_subscription_id: true,
      cancel_at_period_end: true,
      stripe_customer_id: true,
      subscription_id: true,
      renewal_date: true,
      models_used: true,
      start_date: true, 
      seats_used: true,
      plan_name: true,
      status: true,
    },
  });
};

const getSubscriptionLimits = async (plan_name: string) => {
  return prisma.subscription_limits.findUnique({
    where: { plan_name },
    select: {
      max_models: true,
      included_seats: true,
      has_export: true,
      has_advanced_analytics: true,
      allows_view_sharing: true,
      has_api_access: true,
    },
  });
};

const paymentFailure = async (
  subscription_id: number,
  paymentFailedDate: Date,
  nextRetryDate: Date,
  reason: string,
  attemptCount: number,
) => {
  return await prisma.subscriptions.update({
    where: {
      subscription_id,
      status: {
        in: ["active", "past_due"],
      },
    },
    data: {
      status: "past_due",
      last_payment_error: {
        failed_at: paymentFailedDate,
        next_retry_at: nextRetryDate,
        reason: reason,
        attempt_count: attemptCount,
      },
    },
  });
};

const markWebhookProcessed = async (stripe_event_id: string) => {
  return prisma.stripe_webhook_events.update({
    where: { stripe_event_id },
    data: {
      processed: true,
      processed_at: new Date(),
    },
  });
};

const stripeQueries = {
  getStripeWebhookEventById,
  getUserByEmail,
  checkUserCompany,
  getSubscription,
  createSubscriptionUser,
  updateSubscriptionUser,
  createStripeWebhookEvent,
  createOrUpdateUserSubscription,
  upgradeUserSubscription,
  createAccountCredits,
  createCustomOrder,
  updateSubscription,
  updateSubscriptionRenewalTime,
  getCompanySubscriptionStatus,
  getSubscriptionLimits,
  paymentFailure,
  markWebhookProcessed,
};

export default stripeQueries;
