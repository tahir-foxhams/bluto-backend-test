import userQueries from "../queries/user/user";
import productQueries from "../queries/file/file";

export const checkCanCreateModel = async (companyId: number) => {
  const sub = await userQueries.getCompanySubscription(companyId);
  const limits = await userQueries.getSubscriptionLimits(sub.plan_name);

  if (
    sub.status === "trialing" &&
    sub.trial_end_date &&
    new Date(sub.trial_end_date) < new Date()
  ) {
    return {
      can_create: false,
      reason: "TRIAL_EXPIRED",
      message: "Your trial has expired. Upgrade to continue",
      plan_name: sub?.plan_name,
      models_active: sub?.models_used,
      model_limit: limits?.max_models,
    };
  }

  if ((sub.models_used ?? 0) < (limits?.max_models ?? 0)) {
    return {
      can_create: true,
      models_active: sub.models_used ?? 0,
      model_limit: limits?.max_models ?? 0,
      remaining: Math.max(
        (limits?.max_models ?? 0) - (sub.models_used ?? 0),
        0
      ),
    };
  } else {
    const message = `${sub?.plan_name} plan is limited to ${
      limits?.max_models
    } model${
      sub?.plan_name !== "Growth Engine" ? ". Upgrade to create more" : ""
    }`;

    return {
      can_create: false,
      reason: "MODEL_LIMIT_REACHED",
      message,
      models_active: sub?.models_used,
      model_limit: limits?.max_models,
      plan_name: sub?.plan_name,
    };
  }
};

export const checkCanInvite = async (
  instanceId: string,
  userId: string,
  permission: "view" | "edit" | string,
  email?: string,
) => {
  const instance = await userQueries.getInstance(instanceId);
  if (!instance) {
    return {
      status: 404,
      can_invite: false,
      reason: "FILE_NOT_FOUND",
      instance_id: instanceId,
      message: "The requested file not found",
    };
  }

  const companyUser = instance.company.company_users.find(
    (cu) => cu.user_id === Number(userId)
  );
  if (!companyUser || companyUser.role !== "owner") {
    return {
      status: 403,
      can_invite: false,
      reason: "NOT_OWNER",
      role: companyUser?.role,
      message: "Only workspace owner can share models",
    };
  }

  const planName = instance.company.subscriptions[0].plan_name;
  const subscriptionStatus = instance.company.subscriptions[0].status;
  const subscriptionTrialEndDate =
    instance.company.subscriptions[0].trial_end_date;
  const teamMembers = Number(instance.company.subscriptions[0].seats_used ?? 0);
  const inviteCheck = await userQueries.getSubscriptionLimits(planName);
  const teamLimit = Number(inviteCheck?.included_seats ?? 0);

  if (
    subscriptionStatus === "trialing" &&
    subscriptionTrialEndDate &&
    new Date(subscriptionTrialEndDate) < new Date()
  ) {
    return {
      status: 403,
      can_invite: false,
      reason: "TRIAL_EXPIRED",
      message: "Your trial has expired. Upgrade to continue",
      plan_name: planName,
      team_members: teamMembers,
      team_limit: teamLimit,
    };
  }

  let user = null;
  let collaborator = null;
  let activeEditInvitations = [{}];

  if(email){
    user = await productQueries.checkUser(email);
    collaborator =
      user?.company_users?.find(
        (u: any) => u.company_id === instance.company_id
      ) ?? null;

    activeEditInvitations = await productQueries.findActiveEditInvitations(
    Number(userId),
    email
    );
  }

  if ( 
    (email
    ? (
        (!user || !collaborator || collaborator.role !== "editor") &&
        permission === "edit" &&
        activeEditInvitations.length < 1
      )
    : permission === "edit")
  ) {
    if (planName.toLowerCase() === "free") {
      return {
        status: 403,
        can_invite: false,
        reason: "FREE_PLAN_VIEW_ONLY",
        plan_name: planName,
        team_members: teamMembers,
        team_limit: teamLimit,
        message:
          "Free plan only allows view-only sharing. Upgrade to share with edit permissions",
      };
    }

    if (teamLimit > 0 && teamMembers >= teamLimit) {
      return {
        status: 403,
        can_invite: false,
        reason: "TEAM_LIMIT_REACHED",
        plan_name: planName,
        team_members: teamMembers,
        team_limit: teamLimit,
        message: `Plan seat limit reached${
          planName.toLowerCase() !== "growth engine"
            ? ". Upgrade your plan to add more members"
            : ""
        }`,
      };
    }
  }

  const remaining = Math.max(teamLimit - teamMembers, 0);
  return {
    can_invite: true,
    plan_name: planName,
    team_members: teamMembers,
    team_limit: teamLimit,
    remaining,
    permission,
  };
};

export const checkInviteEligibility = async (companyId: number) => {
  const companySubscription = await userQueries.checkCompanySubscription(
    companyId
  );
  const planName = companySubscription.plan_name;
  const subscriptionStatus = companySubscription.status;
  const subscriptionTrialEndDate = companySubscription.trial_end_date;
  const teamMembers = Number(companySubscription.seats_used ?? 0);
  const inviteCheck = await userQueries.getSubscriptionLimits(planName);
  const teamLimit = Number(inviteCheck?.included_seats ?? 0);
  if (
    subscriptionStatus === "trialing" &&
    subscriptionTrialEndDate &&
    new Date(subscriptionTrialEndDate) < new Date()
  ) {
    return {
      can_invite: false,
      reason: "TRIAL_EXPIRED",
      message: "Your trial has expired. Upgrade to continue",
      plan_name: planName,
      team_members: teamMembers,
      team_limit: teamLimit,
    };
  }
  if (planName.toLowerCase() === "free") {
    return {
      can_invite: false,
      reason: "FREE_PLAN_VIEW_ONLY",
      message:
        "Free plan only allows view-only sharing. Upgrade to share with edit permissions",
      plan_name: planName,
      team_members: teamMembers,
      team_limit: teamLimit,
    };
  }
  if (teamLimit > 0 && teamMembers >= teamLimit) {
    return {
      can_invite: false,
      reason: "TEAM_LIMIT_REACHED",
      message: `Plan seat limit reached${
        planName.toLowerCase() !== "growth engine"
          ? ". Upgrade your plan to add more members"
          : ""
      }`,
      plan_name: planName,
      team_members: teamMembers,
      team_limit: teamLimit,
    };
  }
  return { can_invite: true };
};

export const checkCanRestoreModel = async (companyId: number) => {
  const sub = await userQueries.getCompanySubscription(companyId);
  const limits = await userQueries.getSubscriptionLimits(sub.plan_name);

  if (!sub || sub.status !== "active" || sub.plan_name === "Free") {
    return {
      can_create: false,
      reason: "NO_ACTIVE_SUBSCRIPTION",
      message: "An active subscription is required to restore archived files",
      plan_name: sub?.plan_name,
    };
  }

  if ((sub.models_used ?? 0) < (limits?.max_models ?? 0)) {
    return {
      can_create: true,
      models_active: sub.models_used ?? 0,
      model_limit: limits?.max_models ?? 0,
      remaining: Math.max(
        (limits?.max_models ?? 0) - (sub.models_used ?? 0),
        0
      ),
    };
  } else {
    const message = `${sub?.plan_name} plan is limited to ${
      limits?.max_models
    } model${
      sub?.plan_name !== "Growth Engine" ? ". Upgrade to restore" : ""
    }`;

    return {
      can_create: false,
      reason: "MODEL_LIMIT_REACHED",
      message,
      models_active: sub?.models_used,
      model_limit: limits?.max_models,
      plan_name: sub?.plan_name,
    };
  }
};
