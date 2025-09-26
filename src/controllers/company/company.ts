import { Request, Response } from "express";
import Stripe from "stripe";
import companyQueries from "../../queries/company/company";
import productQueries from "../../queries/file/file";
import { configs } from "../../config/config";
import { TrialInfo } from "../../interfaces/user";
import { checkInviteEligibility } from "../../utils/userLimits";
const stripe = new Stripe(configs.stripeSecretKey);

export const getAllCompanies = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.decoded.userId as string);

    const companies = await companyQueries.getAllCompanies(userId);
    if (companies.length < 1) {
      return res.status(404).json({
        message: "Company not found",
        response: null,
        error: "Company not found",
      });
    }

    return res.status(200).json({
      message: "Companies retrieved successfully",
      response: {
        data: companies,
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

export const getAllUserOfCompany = async (req: Request, res: Response) => {
  try {
    const { companyId, userId } = req.decoded;

    const companyUsers = await companyQueries.getAllUserOfCompany(
      companyId,
      Number(userId)
    );
    const pendingCompanyUsers = await companyQueries.getPendingUsersOfCompany(
      companyId,
      Number(userId)
    );
    if (companyUsers.length < 1 && pendingCompanyUsers.length < 1) {
      return res.status(404).json({
        message: "Company users not found",
        response: null,
        error: "Company users not found",
      });
    }
    const subscriptionData = await companyQueries.getSubscriptionOfCompany(
      companyId
    );

    const allUsers = [...companyUsers, ...pendingCompanyUsers];
    const data = {
      company_id: companyId,
      company_name: subscriptionData.companyName,
      users: allUsers,
      seat_used: subscriptionData.seatUsed,
      seat_limit: subscriptionData.seatLimit,
      total_users: allUsers.length,
    };

    return res.status(200).json({
      message: "Company users retrieved successfully",
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

export const getCompanyLimits = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.decoded;
    const sub = await companyQueries.getCompanySubscription(companyId);

    const limits = await companyQueries.getSubscriptionLimits(sub.plan_name);
    const responseData = {
      plan: sub.plan_name,
      limits: {
        max_models: limits?.max_models ?? 0,
        included_seats: limits?.included_seats ?? 0,
      },
      usage: {
        models_created: sub.models_used ?? 0,
        seats_used: sub.seats_used ?? 0,
      },
      can_create_model: (sub.models_used ?? 0) < (limits?.max_models ?? 0),
      can_invite_users: (sub.seats_used ?? 0) < (limits?.included_seats ?? 0),
      can_share_view: limits?.allows_view_sharing ?? false,
    };

    return res.status(200).json({
      message: "Company limits retrieved successfully",
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

export const checkCompanyLimits = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.decoded;

    const sub = await companyQueries.getCompanySubscription(companyId);

    let subscription: any;
    let trialInfo: TrialInfo = {
      isActiveTrial: false,
      trialDaysRemaining: null,
    };

    if (sub && sub.plan_name !== "Free") {
      if (sub?.status === "active") {
        const subscriptionData = await stripe.subscriptions.retrieve(
          sub.stripe_subscription_id,
          { expand: ["items.data.price"] }
        );
        const item = subscriptionData.items.data[0];
        subscription = {
          price: item.price.unit_amount ? item.price.unit_amount / 100 : null,
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

    if (
      trialInfo.trialDaysRemaining !== null &&
      trialInfo.trialDaysRemaining < 0
    ) {
      return res.status(400).json({
        message: "Your trial has expired. Upgrade to continue",
        response: null,
        error: "Your trial has expired. Upgrade to continue",
      });
    }

    const limits = await companyQueries.getSubscriptionLimits(sub.plan_name);
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
    };

    const responseData = {
      plan,
      models,
      team,
      features,
      prompts,
    };

    return res.status(200).json({
      message: "Company limits check retrieved successfully",
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

export const updateRoleOfUser = async (req: Request, res: Response) => {
  try {
    const { companyId, userId: ownerId } = req.decoded;
    const userId = Number(req.params.userId);
    const { role } = req.body;

    if (Number(ownerId) === userId) {
      return res.status(403).json({
        message: "Access denied",
        response: null,
        error: "You are not allowed to update your own role",
      });
    }

    const companyUser = await companyQueries.checkUser(companyId, userId);
    if (!companyUser) {
      return res.status(404).json({
        message: "Company user not found",
        response: null,
        error: "Company user not found",
      });
    }
    if (role === companyUser.role) {
      return res.status(409).json({
        message: `User is already '${role}' for your company`,
        response: null,
        error: `User is already '${role}' for your company`,
      });
    }

    let seat_consumed = false;
    let seat_released = false;
    let files_updated = 0;

    if (role === "editor") {
      const result = await checkInviteEligibility(companyId);
      if (!result.can_invite) {
        return res.status(403).json({
          message: result.message,
          response: null,
          error: result,
        });
      }
      await productQueries.consumeSeat(companyId);
      seat_consumed = true;
    } else if (role === "viewer") {
      await productQueries.releaseSeat(companyId);
      const filesUpdate = await productQueries.updateInvitationPermissionToView(
        Number(ownerId),
        companyUser.user.email
      );
      files_updated = filesUpdate.count;
      seat_released = true;
    }

    await companyQueries.updateRoleOfUser(companyId, userId, role);
    const seatsRemaining = await companyQueries.getCompanySeatsRemaining(
      companyId
    );

    const data = {
      user_id: userId,
      old_role: companyUser.role,
      new_role: role,
      seat_consumed,
      seat_released,
      seats_remaining: seatsRemaining.seats_remaining,
      files_updated,
    };

    return res.status(200).json({
      message: "User role updated successfully",
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

export const deleteCompanyUser = async (req: Request, res: Response) => {
  try {
    const { companyId, userId: ownerId } = req.decoded;
    const userId = Number(req.params.userId);

    if (Number(ownerId) === userId) {
      return res.status(403).json({
        message: "Access denied",
        response: null,
        error: "You cannot delete yourself as a company member",
      });
    }

    const companyUser = await companyQueries.checkUser(companyId, userId);
    if (!companyUser) {
      return res.status(404).json({
        message: "Company user not found",
        response: null,
        error: "Company user not found",
      });
    }

    let seat_released = false;
    if (companyUser.role === "editor") {
      await productQueries.releaseSeat(companyId);
      seat_released = true;
    }

    const deleteCompanyUser = await companyQueries.deleteCompanyUser(
      Number(ownerId),
      companyId,
      userId
    );
    const filesdeleted = await productQueries.deleteSharedFile(
      Number(ownerId),
      companyUser.user.email
    );

    const data = {
      user_id: userId,
      email: deleteCompanyUser.user.email,
      seat_released,
      files_removed: filesdeleted.count,
    };

    return res.status(200).json({
      message: "User removed from company successfully",
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
