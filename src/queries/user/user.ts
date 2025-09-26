import prisma from "../../config/db";

const getCompanySubscription = async (companyId: number) => {
  return prisma.subscriptions.findFirst({
    where: { company_id: companyId },
    select: {
      stripe_subscription_id: true,
      cancel_at_period_end: true,
      stripe_customer_id: true,
      last_payment_error: true,
      subscription_id: true,
      trial_end_date: true,
      billing_email: true,
      billing_cycle: true,
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
      has_export: true,
      has_advanced_analytics: true,
      allows_view_sharing: true,
      has_api_access: true,
    },
  });
};

const getInstance = async (instanceId: string) => {
  return prisma.product_instances.findUnique({
    where: { instance_id: instanceId, deleted_at: null },
    select : {
      company : {
        select: {
          subscriptions: {
            select: {
              trial_end_date: true,
              seats_used: true,
              plan_name: true,
              status: true,
            }
          },
          company_users: {
            where: {
               removed_from_company_at: null
            },
            select: {
              company_id: true,
              user_id: true,
              role: true,
            }
          },
        }
      },
      company_id: true,
    }
  });
};

const getSubscriptionName = async (companyId: number) => {
  return prisma.subscriptions.findFirst({
    where: { company_id: companyId },
    select: {
      plan_name: true,
    },
  });
};

const checkCompanySubscription = async (company_id: number) => {
  return prisma.subscriptions.findFirst({
    where: { company_id },
    select: {
      trial_end_date: true,
      seats_used: true,
      plan_name: true,
      status: true,
    },
  });
};

const getUserRole = async (userId: number, companyId: number) => {
  return await prisma.company_users.findFirst({
    where: {
      user_id: userId,
      company_id: companyId,
      removed_from_company_at: null,
    },
    select: {
      role: true,
    },
  });
};

const getUserAllCompanies = async (userId: number) => {
  const ownWorkspace = await prisma.company_users.findFirst({
    where: {
      user_id: userId,
      role: "owner",
    },
    select: {
      company: {
        select: {
          product_instances: {
            select: {
              deleted_at: true,
              is_archived: true,
            },
          },
          subscriptions: {
            where: { status: "active" },
            select: {
              plan_name: true,
            },
          },
          company_id: true,
          company_name: true,
        },
      },
      user_id: true,
      user: {
        select: {
          full_name: true,
          email: true,
        },
      },
    },
  });

  let owned = null;
  if (ownWorkspace) {
    const company = ownWorkspace.company;
    const productInstances = company.product_instances;

    const file_count = productInstances.length;
    const modelCount = productInstances.filter(
      (pi) =>
        pi.deleted_at === null &&
        (pi.is_archived === false || pi.is_archived === null)
    ).length;

    const subscriptionLimits = await getSubscriptionLimits(
      company.subscriptions[0].plan_name
    );
    const modelLimit = subscriptionLimits.max_models ?? 1;

    owned = {
      company_id: company.company_id,
      company_name: company.company_name,
      is_owned_company: true,
      owner_id: ownWorkspace.user_id,
      owner_name: ownWorkspace.user.full_name,
      role: "owner",
      file_count: file_count,
      model_count: modelCount,
      model_limit: modelLimit,
    };
  }

  const sharedProducts = await prisma.shared_products.findMany({
    where: {
      shared_with_email: ownWorkspace?.user.email,
      deleted_at: null,
      status: "accepted",
    },
    select: {
      product_instance: {
        where: {
          deleted_at: null,
          is_archived: false,
        },
        select: {
          company: {
            select: {
              company_users: {
                where: { role: "owner" },
                select: {
                  user: {
                    select: {
                      full_name: true,
                      email: true,
                    },
                  },
                  user_id: true,
                  company_id: true,
                },
              },
              company_id: true,
              company_name: true,
            },
          },
        },
      },
      share_id: true,
    },
  });
  const sharedMap = new Map();

  await Promise.all(
    sharedProducts.map(async (sp) => {

      const company = sp.product_instance.company;
      if (!company || company.company_id === owned?.company_id) return;
      const role = await getUserRole(userId, company.company_id);

      if (!sharedMap.has(company.company_id)) {
        const owner = company.company_users[0];
        sharedMap.set(company.company_id, {
          company_id: company.company_id,
          company_name: company.company_name,
          is_owned_company: false,
          owner_id: owner?.user_id,
          owner_name: owner?.user.full_name,
          role: role.role ?? null,
          owner_email: owner?.user.email,
          file_count: 0,
        });
      }

      const ws = sharedMap.get(company.company_id);
      ws.file_count++;
    })
  );

  const shared = Array.from(sharedMap.values()).filter((w) => w.file_count > 0);

  const workspaces = [];
  if (owned) workspaces.push(owned);
  workspaces.push(...shared);
  const data = {
    workspaces: workspaces,
    current_workspace_id: owned?.company_id ?? null,
    total: workspaces.length,
  };

  return data;
};

const getCompanyName = async (companyId: number) => {
  return await prisma.companies.findUnique({
    where: {
      company_id: companyId,
    },
    select: {
      company_name: true,
    },
  });
};

const updateCompanyName = async (companyId: number, companyName: string) => {
  return await prisma.companies.update({
    where: {
      company_id: companyId,
    },
    data: {
      company_name: companyName,
    },
  });
};

const getCompanyCollaborators = async (ownerId: number, companyId: number) => {
  const collaborators = await prisma.company_users.findMany({
    where: {
      company_id: companyId,
      role: {
        not: "owner"
      }
    },
    select: {
      role: true,
      user: {
        select: {
          user_id: true,
          full_name: true,
          email: true,
          profile_picture_url: true,
        }
      }
    },
  });

  return await Promise.all(
    collaborators.map(async (c) => {
      const fileCount = await prisma.shared_products.count({
        where: {
          shared_by: ownerId,
          shared_with_email: c.user.email,
          deleted_at: null,
          status: "accepted",
          product_instance: {
            deleted_at: null,
            is_archived: false,
          }
        },
      });

      return {
        ...c.user,
        permission: c.role,
        file_count: fileCount,
      };
    })
  );
};

const userQueries = {
  getCompanySubscription,
  getSubscriptionLimits,
  getInstance,
  getSubscriptionName,
  checkCompanySubscription,
  getUserAllCompanies,
  getCompanyName,
  updateCompanyName,
  getCompanyCollaborators,
};

export default userQueries;
