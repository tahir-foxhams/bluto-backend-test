import prisma from "../../config/db";

type PendingUser = {
  user_id: number | null;
  full_name: string | null;
  email: string;
  role: "editor" | "viewer";
  files_count: number;
};

const getAllCompanies = async (user_id: number) => {
  const companies = await prisma.company_users.findMany({
    where: { user_id, removed_from_company_at: null },
    select: {
      company: {
        select: {
          company_id: true,
          company_name: true,
        },
      },
      role: true,
    },
  });

  return companies.map((item) => ({
    ...item.company,
    role: item.role,
  }));
};

const getAllUserOfCompany = async (company_id: number, userId: number) => {
  const companies = await prisma.company_users.findMany({
    where: {
      company_id,
      role: {
        in: ["editor", "owner"]
      },
      removed_from_company_at: null,
    },
    select: {
      user: {
        select: {
          user_id: true,
          full_name: true,
          email: true,
          profile_picture_url: true,
        },
      },
      role: true,
    },
    orderBy: {
      updated_at: "desc",
    },
  });

  const data = Promise.all(
    companies.map(async (item) => {
      const fileCount = await prisma.shared_products.findMany({
        where: {
          shared_by: userId,
          shared_with_email: item.user.email,
          status: {
            in: ["accepted", "pending"],
          },
          deleted_at: null,
        },
        select: {
          share_id: true,
        },
      });

      return {
        user_id: item.user.user_id,
        full_name: item.user.full_name,
        email: item.user.email,
        avatar: item.user.profile_picture_url,
        role: item.role,
        files_count: fileCount.length,
      };
    })
  );
  return data;
};

const getPendingUsersOfCompany = async (
  companyId: number,
  userId: number,
): Promise<PendingUser[]> => {
  const sharedProducts = await prisma.shared_products.findMany({
    where: {
      shared_by: userId,
      status: {
        in: ["pending", "accepted"],
      },
      permission: "edit",
      deleted_at: null,
    },
    distinct: ["shared_with_email"],
    select: {
      shared_with_email: true,
    },
    orderBy: {
      updated_at: "desc",
    },
  });

  const data = await Promise.all(
    sharedProducts.map(async (item) => {
      const fileCount = await prisma.shared_products.findMany({
        where: {
          shared_by: userId,
          shared_with_email: item.shared_with_email,
          status: {
            in: ["pending", "accepted"],
          },
          permission: "edit",
          deleted_at: null,
        },
        select: {
          share_id: true,
          permission: true,
        },
      });

      const hasEditPermission = fileCount.some((p) => p.permission === "edit");
      const role = hasEditPermission ? "editor" : "viewer";

      const user = await prisma.users.findUnique({
        where: { email: item.shared_with_email },
        select: {
          company_users: {
            where: {
              removed_from_company_at: null,
            },
            select: {
              role: true,
              company_id: true,
            },
          },
          user_id: true,
          full_name: true,
          profile_picture_url: true,
        },
      });

      const collaborator =
        user?.company_users?.find((u: any) => u.company_id === companyId) ??
        null;

      if (collaborator) return null;

      return {
        user_id: user ? user.user_id : null,
        full_name: user ? user.full_name : null,
        email: item.shared_with_email,
        avatar: user ? user.profile_picture_url : null,
        role: collaborator ? collaborator.role : role,
        files_count: fileCount.length,
      } as PendingUser;
    })
  );

  return data.filter((u) => u !== null);
};

const getSubscriptionOfCompany = async (company_id: number) => {
  const subscription = await prisma.subscriptions.findUnique({
    where: { company_id },
    select: {
      seats_used: true,
      plan_name: true,
      company: {
        select: {
          company_name: true,
        },
      },
    },
  });

  const planLimit = await prisma.subscription_limits.findUnique({
    where: { plan_name: subscription.plan_name },
    select: {
      included_seats: true,
    },
  });

  return {
    companyName: subscription.company.company_name,
    seatUsed: subscription.seats_used,
    seatLimit: planLimit.included_seats,
  };
};

const getCompanySubscription = async (companyId: number) => {
  return prisma.subscriptions.findFirst({
    where: { company_id: companyId },
    select: {
      stripe_subscription_id: true,
      trial_end_date: true,
      models_used: true,
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
      allows_view_sharing: true,
      has_export: true,
      has_advanced_analytics: true,
    },
  });
};

const checkUser = async (company_id: number, user_id: number) => {
  return prisma.company_users.findUnique({
    where: {
      company_id_user_id: {
        company_id,
        user_id,
      },
      removed_from_company_at: null,
    },
    select: {
      role: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  });
};

const updateRoleOfUser = async (
  company_id: number,
  user_id: number,
  role: string
) => {
  return prisma.company_users.update({
    where: {
      company_id_user_id: {
        company_id,
        user_id,
      },
    },
    data: {
      role: role,
    },
  });
};

const getCompanySeatsRemaining = async (company_id: number) => {
  const subscription = await prisma.subscriptions.findUnique({
    where: {
      company_id,
    },
    select: {
      plan_name: true,
      seats_used: true,
    },
  });

  const subscriptionLimit = await prisma.subscription_limits.findUnique({
    where: {
      plan_name: subscription.plan_name,
    },
    select: {
      included_seats: true,
    },
  });

  return {
    seats_remaining: subscriptionLimit.included_seats - subscription.seats_used,
  };
};

const deleteCompanyUser = async (
  owner_id: number,
  company_id: number,
  user_id: number
) => {
  return prisma.company_users.update({
    where: {
      company_id_user_id: {
        company_id,
        user_id,
      },
    },
    data: {
      removed_from_company_at: new Date(),
      removed_from_company_by: owner_id,
    },
    select: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });
};

const supportQueries = {
  getAllCompanies,
  getAllUserOfCompany,
  getPendingUsersOfCompany,
  getSubscriptionOfCompany,
  getCompanySubscription,
  getSubscriptionLimits,
  checkUser,
  updateRoleOfUser,
  getCompanySeatsRemaining,
  deleteCompanyUser,
};

export default supportQueries;
