import { Request, Response } from "express";
import Stripe from "stripe";
import stripeQueries from "../../queries/stripe/stripe";
import userQueries from "../../queries/auth/user";
import { configs } from "../../config/config";
import { emailConfigs } from "../../config/email-config";
import { sendMail } from "../../utils/sendMail";
const stripe = new Stripe(configs.stripeSecretKey);

const subscriptionPriceMap = {
  founders_choice: {
    priceId: configs.foundersChoicePriceId!,
    priceName: "Founder's Choice",
  },
  growth_engine: {
    priceId: configs.growthEnginePriceId!,
    priceName: "Growth Engine",
  },
};

const priceMap = {
  pitch_deck: configs.pitchDeckPriceId!,
  forecast: configs.forecastPriceId!,
  complete: configs.completePriceId!,
};

function formatDate(date: Date) {
  return date?.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

function getGraceDays(date: Date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const remainingGraceDays = Math.max(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    0
  );

  return remainingGraceDays;
}

export const subscriptionStatus = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.decoded;
    const sub = await stripeQueries.getCompanySubscriptionStatus(companyId);

    if (!sub || sub?.status !== "active") {
      return res.status(404).json({
        message: "No active subscription",
        response: null,
        error: "No active subscription",
      });
    }

    const limits = await stripeQueries.getSubscriptionLimits(sub.plan_name);
    const responseData: any = {
      hasActiveSubscription: true,
      subscription: {
        id: sub.subscription_id,
        planName: sub.plan_name,
        currentPeriodStart: sub.start_date,
        currentPeriodEnd: sub.renewal_date,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        stripeSubscriptionId: sub.stripe_subscription_id,
      },
      limits: null,
      usage: {
        modelsCreated: sub.models_used ?? 0,
        seatsUsed: sub.seats_used ?? 0,
      },
    };

    if (limits) {
      responseData.limits = {
        maxModels: limits.max_models,
        includedSeats: limits.included_seats,
        features: {
          export: !!limits.has_export,
          advancedAnalytics: !!limits.has_advanced_analytics,
          viewSharing: !!limits.allows_view_sharing,
          editSharing: sub.plan_name !== "Free",
        },
      };
    }
    return res.status(200).json({
      message: "Subscription status retrieved successfully",
      response: {
        data: responseData,
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const createSubscriptionCheckout = async (
  req: Request,
  res: Response
) => {
  try {
    const { email } = req.decoded;
    const prod = req.body.subscriptionType as keyof typeof subscriptionPriceMap;
    const priceId = subscriptionPriceMap[prod].priceId;
    const priceName = subscriptionPriceMap[prod].priceName;

    const stripeSessionOptions: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${configs.frontendBaseUrl}/dashboard?success=true`,
      cancel_url: `${configs.frontendBaseUrl}/pricing?canceled=true`,
      metadata: {
        subscription_type: priceName,
      },
    };
    if (email) {
      stripeSessionOptions.customer_email = email;
    }
    const session = await stripe.checkout.sessions.create(stripeSessionOptions);

    return res.status(201).json({
      message: "Subscription checkout session created successfully",
      response: {
        data: {
          url: session.url,
          sessionId: session.id,
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const createCustomCheckout = async (req: Request, res: Response) => {
  try {
    const { email } = req.decoded;
    const prod = req.body.product_type as keyof typeof priceMap;
    const priceId = priceMap[prod];

    const stripeSessionOptions: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${configs.frontendBaseUrl}/orders?success=true`,
      cancel_url: `${configs.frontendBaseUrl}/orders?canceled=true`,
    };
    if (email) {
      stripeSessionOptions.customer_email = email;
    }
    const session = await stripe.checkout.sessions.create(stripeSessionOptions);

    return res.status(201).json({
      message: "Custom checkout session created successfully",
      response: {
        data: {
          url: session.url,
          sessionId: session.id,
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const createPortalSession = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.decoded;
    const sub = await stripeQueries.getCompanySubscriptionStatus(companyId);

    if (!sub || !sub?.stripe_customer_id) {
      return res.status(404).json({
        message: "No subscription found",
        response: null,
        error: "No subscription found",
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${configs.frontendBaseUrl}/dashboard`,
    });

    return res.status(201).json({
      message: "Portal session created successfully",
      response: {
        data: {
          url: session.url,
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const webhookHandler = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  if (!sig) {
    console.error("No stripe-signature header provided");
    return res.status(400).send("No stripe-signature header provided");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      configs.stripeWebhookSecret
    );
  } catch (err: any) {
    console.error("Webhook verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const existingEvent = await stripeQueries.getStripeWebhookEventById(event.id);
  if (existingEvent) {
    console.log(`Duplicate webhook event received: ${event.id}`);
    return res.status(400).send("Event already processed");
  }

  await stripeQueries.createStripeWebhookEvent({
    stripe_event_id: event.id,
    type: event.type,
    data: event.data,
    processed: false,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const expanded = await stripe.checkout.sessions.retrieve(session.id, {
          expand: [
            "line_items",
            "line_items.data.price.product",
            "payment_intent",
          ],
        });

        const lineItem = expanded.line_items?.data[0];
        const priceId = lineItem.price.id;

        const email = session.customer_details?.email;
        const fullName = session.customer_details?.name || "Customer";

        const existingUser = await stripeQueries.getUserByEmail(email);

        if (session.mode === "subscription") {
          const subscriptionType = session.metadata?.subscription_type;
          const stripeSubscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          const paymentMethodId = String(
            stripeSubscription.default_payment_method
          );
          const paymentMethod = await stripe.paymentMethods.retrieve(
            paymentMethodId
          );

          const billingCycle =
            stripeSubscription.items.data[0].plan.interval + "ly";

          const amount = stripeSubscription.items.data[0].plan.amount / 100;

          const renewal_date =
            stripeSubscription.items.data[0].current_period_end;

          if (!existingUser) {
            const createCompany = await userQueries.createCompany(
              `${session.customer_details?.name || "Customer"}'s Company`
            );
            const company_id = createCompany.company_id;

            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            const token = Array.from(array)
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            const now = new Date();
            const tokenExpiry = new Date();
            tokenExpiry.setDate(tokenExpiry.getDate() + 3);
            const resetPasswordUrl = `${configs.frontendBaseUrl}/auth/create-password?token=${token}&email=${email}`;

            const user = await stripeQueries.createSubscriptionUser({
              email,
              full_name: fullName,
              company_id,
              reset_password_token_expiry: tokenExpiry,
              reset_password_token: token,
              stripe_customer_id: String(session.customer),
              email_verified: false,
              created_at: now,
            });

            await userQueries.createCompanyUser(
              company_id,
              user.user_id,
              "owner"
            );
            await userQueries.assignCompaniesToUser(email, user.user_id);

            await stripeQueries.createOrUpdateUserSubscription({
              company_id,
              stripe_customer_id: String(session.customer),
              stripe_subscription_id: String(session.subscription),
              stripe_price_id: priceId,
              start_date: new Date(stripeSubscription.start_date * 1000),
              renewal_date: new Date(renewal_date * 1000),
              billing_cycle: billingCycle,
              plan_name: subscriptionType,
              status: "active",
              billing_email: email,
            });

            const billingPortalLink =
              await stripe.billingPortal.sessions.create({
                customer: String(session.customer),
                return_url: `${configs.frontendBaseUrl}/dashboard`,
              });

            const dynamicUserData = {
              billing_portal_link: billingPortalLink.url,
              customer_email: email,
              customer_name: fullName,
              next_billing_date: formatDate(new Date(renewal_date * 1000)),
              password_setup_link: resetPasswordUrl,
              plan_name: subscriptionType,
              payment_method: paymentMethod.type,
              stripe_subscription_amount: amount,
              to_email: email,
            };
            await sendMail(
              emailConfigs.templates.stripeSubscriptionNewAccount,
              dynamicUserData
            );
          } else {
            const userCompany = await stripeQueries.checkUserCompany(
              existingUser.user_id
            );
            const company_id = userCompany.company_id;
            const sub = await stripeQueries.getCompanySubscriptionStatus(
              company_id
            );

            if (!sub) {
              await stripeQueries.createOrUpdateUserSubscription({
                company_id,
                stripe_customer_id: String(session.customer),
                stripe_subscription_id: String(session.subscription),
                stripe_price_id: priceId,
                start_date: new Date(stripeSubscription.start_date * 1000),
                renewal_date: new Date(renewal_date * 1000),
                billing_cycle: billingCycle,
                plan_name: subscriptionType,
                status: "active",
                billing_email: email,
              });
            } else if (sub?.plan_name === "Free") {
              await stripeQueries.upgradeUserSubscription({
                company_id,
                stripe_customer_id: String(session.customer),
                stripe_subscription_id: String(session.subscription),
                stripe_price_id: priceId,
                start_date: new Date(stripeSubscription.start_date * 1000),
                renewal_date: new Date(renewal_date * 1000),
                billing_cycle: billingCycle,
                plan_name: subscriptionType,
                status: "active",
                billing_email: email,
              });
            } else {
              if (sub?.status === "active") {
                const currentPlan = sub.plan_name;
                if (
                  currentPlan ===
                    subscriptionPriceMap.founders_choice.priceName &&
                  subscriptionType ===
                    subscriptionPriceMap.growth_engine.priceName
                ) {
                  await stripe.subscriptions.cancel(
                    sub.stripe_subscription_id,
                    {
                      prorate: false,
                      invoice_now: false,
                      cancellation_details: {
                        comment: "upgraded",
                      },
                    }
                  );

                  await stripeQueries.upgradeUserSubscription({
                    company_id,
                    stripe_customer_id: String(session.customer),
                    stripe_subscription_id: String(session.subscription),
                    stripe_price_id: priceId,
                    start_date: new Date(stripeSubscription.start_date * 1000),
                    renewal_date: new Date(renewal_date * 1000),
                    billing_cycle: billingCycle,
                    plan_name: subscriptionType,
                    status: "active",
                    billing_email: email,
                  });
                } else {
                  console.error("Duplicate subscription detected:", {
                    email,
                    existing_sub: sub.stripe_subscription_id,
                    new_sub: session.subscription,
                  });

                  await stripe.subscriptions.cancel(stripeSubscription.id, {
                    prorate: false,
                    invoice_now: false,
                  });

                  await stripeQueries.markWebhookProcessed(event.id);
                  break;
                }
              }
              await stripeQueries.createOrUpdateUserSubscription({
                company_id,
                stripe_customer_id: String(session.customer),
                stripe_subscription_id: String(session.subscription),
                renewal_date: new Date(stripeSubscription.start_date * 1000),
                status: "active",
              });
            }

            await stripeQueries.updateSubscriptionUser(
              existingUser.user_id,
              String(session.customer)
            );

            const billingPortalLink =
              await stripe.billingPortal.sessions.create({
                customer: String(session.customer),
                return_url: `${configs.frontendBaseUrl}/dashboard`,
              });

            const dynamicData = {
              billing_portal_link: billingPortalLink.url,
              customer_email: email,
              customer_name: fullName,
              dashboard_url: `${configs.frontendBaseUrl}/dashboard`,
              next_billing_date: formatDate(new Date(renewal_date * 1000)),
              plan_name: subscriptionType,
              payment_method: paymentMethod.type,
              stripe_subscription_amount: amount,
              to_email: email,
            };
            await sendMail(
              emailConfigs.templates.stripeSubscriptionUpgrade,
              dynamicData
            );
          }
        } else if (session.mode === "payment") {
          const paymentIntent = expanded.payment_intent as Stripe.PaymentIntent;
          const paymentMethodId = paymentIntent.payment_method as string;
          const paymentMethod = await stripe.paymentMethods.retrieve(
            paymentMethodId
          );
          const product = lineItem?.price?.product as Stripe.Product;

          let companyId = undefined;
          if (existingUser) {
            const userCompany = await stripeQueries.checkUserCompany(
              existingUser.user_id
            );
            companyId = userCompany?.company_id || null;
          }

          const order = await stripeQueries.createCustomOrder({
            user_id: existingUser?.user_id || undefined,
            company_id: companyId,
            stripe_payment_intent_id: String(session.payment_intent),
            stripe_checkout_session_id: session.id,
            product_type: product?.name || "",
            amount: session.amount_total / 100,
            currency: session.currency,
            status: "completed",
            customer_email: email,
          });

          const dynamicData = {
            amount: session.amount_total / 100,
            calendly_link: configs.calendlyLink,
            oneoff_requirement_form_link: configs.oneoffRequirementFormLink,
            customer_email: email,
            customer_name: fullName,
            order_id: order.order_id,
            payment_method: paymentMethod.type,
            product_name: product?.name || "",
            to_email: email,
          };
          await sendMail(
            emailConfigs.templates.stripeOneOffOrderEmail,
            dynamicData
          );
        }

        await stripeQueries.markWebhookProcessed(event.id);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const existingSubscription = await stripeQueries.getSubscription(
          subscription.id
        );

        if (existingSubscription) {
          const customerId =
            typeof subscription.customer === "string"
              ? subscription.customer
              : subscription.customer.id;

          const customer = await stripe.customers.retrieve(customerId);
          const email = (customer as Stripe.Customer).email;
          const fullName = (customer as Stripe.Customer).name;
          const startDate = new Date(
            subscription.items.data[0].current_period_start * 1000
          );
          const renewalDate = new Date(
            subscription.items.data[0].current_period_end * 1000
          );

          if (subscription.cancel_at_period_end) {
            await stripeQueries.updateSubscription(
              existingSubscription.subscription_id,
              subscription.cancel_at_period_end
            );

            const accessEndDate = new Date(subscription.cancel_at * 1000);
            const invoice = await stripe.invoices.retrieve(
              String(subscription.latest_invoice)
            );
            const amount = invoice.amount_due / 100;
            const lastPaymentDate = invoice.status_transitions?.paid_at
              ? new Date(invoice.status_transitions.paid_at * 1000)
              : null;

            const dynamicData = {
              access_end_date: formatDate(accessEndDate),
              customer_email: email,
              customer_name: fullName,
              dashboard_url: `${configs.frontendBaseUrl}/dashboard`,
              last_payment_date: formatDate(lastPaymentDate),
              stripe_subscription_amount: amount,
              to_email: email,
            };
            await sendMail(
              emailConfigs.templates.stripeSubscriptionCancelled,
              dynamicData
            );
          } else if (
            subscription.cancel_at_period_end !==
            existingSubscription.cancel_at_period_end
          ) {
            await stripeQueries.updateSubscription(
              existingSubscription.subscription_id,
              subscription.cancel_at_period_end
            );

            const amount = subscription.items.data[0].plan.amount / 100;
            const nextPaymentTimestamp =
              subscription.items.data[0].current_period_end;
            const nextPaymentDate = new Date(nextPaymentTimestamp * 1000);

            const dynamicData = {
              customer_email: email,
              customer_name: fullName,
              dashboard_url: `${configs.frontendBaseUrl}/dashboard`,
              next_payment_date: formatDate(nextPaymentDate),
              stripe_subscription_amount: amount,
              to_email: email,
            };
            await sendMail(
              emailConfigs.templates.stripeDiscardCancelSubscriptionRequest,
              dynamicData
            );
          } else if (renewalDate !== existingSubscription.renewal_date) {
            await stripeQueries.updateSubscriptionRenewalTime(
              existingSubscription.subscription_id,
              startDate,
              renewalDate
            );
          }
        }

        await stripeQueries.markWebhookProcessed(event.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const comment = subscription.cancellation_details?.comment || "";
        if (comment === "upgraded") break;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const customer = (await stripe.customers.retrieve(
          customerId
        )) as Stripe.Customer;
        const email = customer.email;
        const fullName = customer.name;

        if (!email) {
          return res.status(404).send("Email not found");
        }
        const user = await stripeQueries.getUserByEmail(email);

        if (!user) {
          return res.status(404).send("User not found");
        }
        const companyId = user.companies.company_id;
        const sub = await stripeQueries.getSubscription(
          String(subscription.id)
        );

        if (sub) {
          await stripeQueries.updateSubscription(
            sub.subscription_id,
            false,
            "canceled"
          );
        } else {
          const invoiceId = subscription.latest_invoice as string;
          const invoice = await stripe.invoices.retrieve(invoiceId);
          const amount = invoice.amount_due / 100;
          const paidAt = invoice.status_transitions?.paid_at
            ? new Date(invoice.status_transitions.paid_at * 1000)
            : null;

          await stripeQueries.createAccountCredits({
            company_id: companyId,
            invoice_id: invoiceId,
            amount: Number(amount),
          });

          const dynamicData = {
            original_payment_date: paidAt ? formatDate(paidAt) : "",
            credit_amount: "£" + amount,
            customer_email: email,
            customer_name: fullName,
            sign_in_url: `${configs.frontendBaseUrl}/signin`,
            support_email: emailConfigs.adminToEmail,
            to_email: email,
          };
          await sendMail(
            emailConfigs.templates.stripePaymentConvertedToCredit,
            dynamicData
          );
        }

        await stripeQueries.markWebhookProcessed(event.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & {
          payment_intent?: string;
        };

        const customerId = invoice.customer as string;
        const customer = (await stripe.customers.retrieve(
          customerId
        )) as Stripe.Customer;
        const customerEmail = customer.email;
        const customerName = customer.name;

        if (!customerEmail) {
          return res.status(404).send("Email not found");
        }
        const user = await stripeQueries.getUserByEmail(customerEmail);
        if (!user) {
          return res.status(404).send("User not found");
        }
        const subscritpionId = String(
          invoice.parent.subscription_details.subscription
        );
        const subscription = await stripe.subscriptions.retrieve(
          subscritpionId
        );
        if (subscription.status !== "past_due") {
          return res.status(400).send("Invalid request");
        }

        const sub = await stripeQueries.getSubscription(subscritpionId);
        if (!sub) {
          return res.status(404).send("Subscription not found");
        }
        const paymentIntent = invoice.payment_intent
          ? await stripe.paymentIntents.retrieve(
              invoice.payment_intent as string
            )
          : null;

        const failureReason =
          paymentIntent?.last_payment_error?.code ||
          paymentIntent?.last_payment_error?.message ||
          "unknown_error";

        const paymentFailedDate = new Date(invoice.created * 1000);
        const cancellationDate = new Date(paymentFailedDate);
        cancellationDate.setDate(
          cancellationDate.getDate() + Number(configs.gracePeriodDays)
        );

        const paymentMethod = await stripe.paymentMethods.retrieve(
          String(customer?.invoice_settings?.default_payment_method)
        );

        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${configs.frontendBaseUrl}/dashboard`,
        });
        const billingPortalLink = portalSession.url;

        const nextRetryDate = invoice.next_payment_attempt
          ? new Date(invoice.next_payment_attempt * 1000)
          : null;

        await stripeQueries.paymentFailure(
          sub.subscription_id,
          paymentFailedDate,
          nextRetryDate,
          failureReason,
          invoice.attempt_count
        );
        const dynamicData = {
          billing_portal_link: billingPortalLink,
          customer_email: customerEmail,
          customer_name: customerName,
          grace_period_days: getGraceDays(cancellationDate),
          next_retry_date: formatDate(nextRetryDate),
          payment_failed_date: formatDate(paymentFailedDate),
          payment_method: paymentMethod?.type,
          stripe_subscription_amount: invoice?.amount_due / 100,
          suspension_date: formatDate(cancellationDate),
          to_email: customerEmail,
        };
        await sendMail(
          emailConfigs.templates.stripeSubscriptionPaymentFailed,
          dynamicData
        );
        await stripeQueries.markWebhookProcessed(event.id);
        break;
      }
    }

    await stripeQueries.markWebhookProcessed(event.id);
    return res.status(200).send("Received");
  } catch (error: unknown) {
    console.log("error", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};
