import { Request, Response } from "express";
import Stripe from "stripe";
import userQueries from "../../queries/user/user";
import { configs } from "../../config/config";
import { StripeData, TrialInfo } from "../../interfaces/user";
import { checkCanCreateModel, checkCanInvite } from "../../utils/userLimits";
const stripe = new Stripe(configs.stripeSecretKey);

export const getUserBillingInfo = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.decoded;

    const sub = await userQueries.getCompanySubscription(companyId);

    let stripeData: StripeData = {
      payment_method: null,
      invoices: [],
    };
    let subscription: any;

    let trialInfo: TrialInfo = {
      isActiveTrial: false,
      trialDaysRemaining: null,
    };

    if (sub && sub.plan_name !== "Free") {
      if (sub?.status === "active" || sub?.status === "past_due") {
        const subscriptionData = await stripe.subscriptions.retrieve(
          sub.stripe_subscription_id,
          { expand: ["items.data.price"] }
        );
        const item = subscriptionData.items.data[0];
        subscription = {
          ...subscriptionData,
          price: item.price.unit_amount ? item.price.unit_amount / 100 : null,
          currentPeriodStart: new Date(item.current_period_start * 1000),
          currentPeriodEnd: new Date(item.current_period_end * 1000),
        };

        const paymentMethodData = await stripe.paymentMethods.retrieve(
          String(subscription.default_payment_method)
        );
        const paymentMethod = {
          id: paymentMethodData.id,
          brand: paymentMethodData.card?.brand,
          last4: paymentMethodData.card?.last4,
          exp_month: paymentMethodData.card?.exp_month,
          exp_year: paymentMethodData.card?.exp_year,
          is_default: true,
          has_issue: sub?.status === "past_due" ? true : false,
          requires_update: sub?.status === "past_due" ? true: false, 
        };

        const getInvoices = await stripe.invoices.list({
          customer: sub.stripe_customer_id,
          limit: 10,
        });
        const invoices = getInvoices.data.map((invoice) => ({
          id: invoice.id,
          invoice_number: invoice.number,
          date: _formatDate(new Date(invoice.created * 1000)),
          amount: invoice.total / 100,
          currency: invoice.currency.toUpperCase(),
          status: invoice.status,
          pdf_url: invoice.invoice_pdf,
          hosted_invoice_url: invoice.hosted_invoice_url,
        }));

        stripeData = {
          payment_method: paymentMethod,
          invoices,
        };
      }

      if (sub?.status === "trialing") {
        const trialEndDate = new Date(sub.trial_end_date);
        const now = new Date();
        const daysRemaining = Math.ceil(
          (trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        trialInfo = {
          isActiveTrial: true,
          trialDaysRemaining: daysRemaining,
        };
      }
    }

    const limits = await userQueries.getSubscriptionLimits(sub.plan_name);
    const modelPercent = (sub.models_used / limits.max_models) * 100;
    const teamPercent = (sub.seats_used / limits.included_seats) * 100;

    const plan = {
      name: sub.plan_name,
      status: sub.status,
      is_active_trial: trialInfo.isActiveTrial,
      trial_days_remaining: trialInfo.trialDaysRemaining,
      monthly_price: subscription?.price ?? null,
    };

    const models = {
      active: sub.models_used ?? 0,
      limit: limits?.max_models ?? 0,
      remaining: Math.max(
        (limits?.max_models ?? 0) - (sub.models_used ?? 0),
        0
      ),
      can_create: (sub.models_used ?? 0) < (limits?.max_models ?? 0),
      status:
        modelPercent >= 100
          ? "at_limit"
          : modelPercent >= 80
          ? "warning"
          : "ok",
      percent_used: limits?.max_models
        ? Math.round(((sub.models_used ?? 0) / limits.max_models) * 100)
        : 0,
    };

    const team = {
      members: sub.seats_used ?? 0,
      limit: limits?.included_seats ?? 0,
      remaining: Math.max(
        (limits?.included_seats ?? 0) - (sub.seats_used ?? 0),
        0
      ),
      can_invite_editor: (sub.seats_used ?? 0) < (limits?.included_seats ?? 0),
      can_invite_viewer: limits?.allows_view_sharing ?? false,
      status:
        (sub.seats_used ?? 0) >= (limits?.included_seats ?? 0)
          ? "at_limit"
          : "ok",
    };

    const features = {
      view_sharing: !!limits?.allows_view_sharing,
      edit_sharing: sub.plan_name !== "Free",
      export: !!limits?.has_export,
      advanced_analytics: !!limits?.has_advanced_analytics,
      cash_flow_tab: true,
      scenario_planning: true,
      priority_support: false,
    };

    const prompts = {
      show_upgrade_to_founders:
        !sub || sub?.plan_name === "Free" || sub?.status === "trialing",
      show_upgrade_to_growth:
        sub?.plan_name === "Founder's Choice" &&
        (modelPercent >= 80 || teamPercent >= 100),
      show_model_warning: modelPercent >= 80 && modelPercent < 100,
      show_trial_expiring:
        trialInfo.isActiveTrial && trialInfo.trialDaysRemaining <= 3,
      show_view_only_message: !sub || sub.plan_name === "Free",
      show_payment_failed_warning: sub?.status === "past_due" ? true: false,
    };

    const responseData = {
      subscription: sub
        ? {
            id: sub.subscription_id,
            plan_name: sub.plan_name,
            status: sub.status,
            price: subscription?.price ?? null,
            currency: subscription?.currency ?? null,
            billing_cycle: sub?.billing_cycle,
            current_period_start: subscription?.currentPeriodStart ?? null,
            current_period_end: subscription?.currentPeriodEnd ?? null,
            cancel_at_period_end: sub.cancel_at_period_end,
            stripe_subscription_id: sub.stripe_subscription_id,
            stripe_customer_id: sub.stripe_customer_id,
            is_trial_active: trialInfo.isActiveTrial,
            trial_days_remaining: trialInfo.trialDaysRemaining,
            last_payment_error: sub?.status === "past_due" ? sub.last_payment_error : undefined,
          }
        : null,
      ...stripeData,
      billing_email: sub.billing_email ?? req.decoded.email,
      models_created: models?.active ?? 0,
      model_limit: models?.limit ?? 0,
      seats_used: team?.members ?? 0,
      seat_limit: team?.limit ?? 0,
      limits: {
        plan,
        models,
        team,
        features,
        prompts,
      },
    };

    return res.status(200).json({
      message: "Billing info retrieved successfully",
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

export const canCreateModal = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.decoded;
    const result = await checkCanCreateModel(companyId);

    if (!result.can_create) {
      return res.status(403).json({
        message: result.message,
        response: null,
        error: result,
      });
    }

    return res.status(200).json({
      message: "Model creation eligibility verified successfully",
      response: {
        data: result,
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

export const canInvite = async (req: Request, res: Response) => {
  try {
    const { instanceId, permission } = req.body;
    const { userId } = req.decoded;

    const result = await checkCanInvite(instanceId, userId, permission);

    if (!result.can_invite) {
      const { status, ...payload } = result;
      return res.status(status).json({
        message: result.message,
        response: null,
        error: payload,
      });
    }

    return res.status(200).json({
      message: "Invitation eligibility verified successfully",
      response: {
        data: result,
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

export const hasFeatureAccess = async (req: Request, res: Response) => {
  try {
    const { featureAccess } = req.query;
    const { companyId } = req.decoded;

    const sub = await userQueries.getSubscriptionName(companyId);
    const limits = await userQueries.getSubscriptionLimits(sub.plan_name);

    const result = {
      feature: featureAccess,
      hasAccess:
        featureAccess === "view"
          ? !!limits?.allows_view_sharing
          : featureAccess === "export"
          ? !!limits?.has_export
          : featureAccess === "advanced-analytics"
          ? !!limits?.has_advanced_analytics
          : featureAccess === "api-access"
          ? !!limits?.has_api_access
          : false,
    };

    return res.status(200).json({
      message: "Feature access verified successfully",
      response: {
        data: {
          has_access: result.hasAccess,
          feature: result.feature,
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

export const getUserAllCompanies = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.decoded.userId);

    const data = await userQueries.getUserAllCompanies(userId);
    if (data.total < 1) {
      return res.status(404).json({
        message: "No user company found",
        response: null,
        error: "No user company found",
      });
    }

    return res.status(200).json({
      message: "User companies retrieved successfully",
      response: {
        data: data,
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

export const renameCompany = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.decoded;
    const { name } = req.body;

    if (!companyId) {
      return res.status(403).json({
        message: "You do not have access to any company",
        response: null,
        error: "User is not associated with any company",
      });
    }

    const oldCompanyName = await userQueries.getCompanyName(companyId);
    if (oldCompanyName.company_name?.trim().toLowerCase() === name.trim().toLowerCase()) {
      return res.status(409).json({
        message: "Company is already using this name",
        response: null,
        error: "Company is already using this name",
      });
    }

    await userQueries.updateCompanyName(companyId, name)

    return res.status(200).json({
      message: "Company renamed successfully",
      response: {
        data: {
          company_id: 1,
          old_name: oldCompanyName.company_name,
          new_name: name,
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

export const getCompanyCollaborators = async (req: Request, res: Response) => {
  try {
    const { userId, companyId } = req.decoded;

    const collaborators = await userQueries.getCompanyCollaborators(
      Number(userId),
      companyId
    );
    if(collaborators.length < 1){
      return res.status(404).json({
        message: "No company collaborators found",
        response: null,
        error: "No company collaborators found",
      });
    }

    return res.status(200).json({
      message: "Active collaborators retrieved successfully",
      response: {
        data: {
          collaborators: collaborators,
          total: collaborators.length,
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

function _formatDate(date: Date) {
  return date?.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
