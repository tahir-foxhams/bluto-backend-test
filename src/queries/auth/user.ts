import prisma from "../../config/db";
import {
  NewUser,
  SocialUser,
  SocialAccount,
  EmailChange,
  UserProfileUpdate,
  UserPasswordUpdate,
  ForgotPassword,
} from "../../interfaces/auth";

const getUserByEmail = async (email: string) => {
  return prisma.users.findUnique({
    where: { email },
    select: {
      user_id: true,
      email: true,
      email_verified: true,
      pending_new_email: true,
      profile_picture_url: true,
      companies: {
        select : {
          company_id: true,
        }
      }
    },
  });
};

const checkUserByEmail = async (email: string) => {
  return prisma.users.findUnique({
    where: { email },
    select: {
      user_id: true,
      email: true,
      email_verified: true,
      full_name: true,
    },
  });
};

const getUserProfilePicture = async (userId: number) => {
  return prisma.users.findUnique({
    where: { user_id: userId },
    select: {
      profile_picture_url: true,
    },
  });
};

const createCompany = async (user_name: string) => {
  return prisma.companies.create({
    data: {
      company_name: `${user_name}`,
    },
    select: {
      company_id: true,
    },
  });
};

const createCompanyUser = async (
  company_id: number,
  user_id: number,
  role: string
) => {
  return prisma.company_users.upsert({
    where: {
      company_id_user_id: {
        company_id,
        user_id,
      },
    },
    update: {
      role,
      removed_from_company_by: null,
      removed_from_company_at: null,
    },
    create: {
      company_id,
      user_id,
      role,
    },
    select: {
      company_id: true,
    },
  });
};

const assignCompaniesToUser = async (userEmail: string, userId: number): Promise<any> => {
  const shares = await prisma.shared_products.findMany({
    where: {
      shared_with_email: userEmail,
      status: "accepted",
      deleted_at: null,
    },
    select: {
      permission: true,
      sharedBy: {
        select: {
          default_company_id: true,
        },
      },
    },
  })
  if (!shares.length) return [];

  const data = shares.map((share) => ({
    company_id: share.sharedBy.default_company_id,
    user_id: userId,
    role: share.permission === "view" ? "viewer" : "editor",
  }));
  if (!data.length) return [];

  const finalData = Object.values(
    data.reduce((acc, curr) => {
      const key = `${curr.company_id}-${curr.user_id}`;
      if (!acc[key] || curr.role === "editor") {
        acc[key] = curr;
      }
      return acc;
    }, {} as Record<string, (typeof data)[number]>)
  );

  return prisma.company_users.createMany({
    data: finalData,
    skipDuplicates: true,
  });
};

const updateCompanyUser = async (
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
      role,
    },
    select: {
      company_id: true,
    },
  });
};

const checkCompany = async (company_id: number) => {
  return prisma.companies.findUnique({
    where: { company_id },
    select: {
      company_name: true,
    },
  });
};

const loginUser = async (email: string) => {
  return prisma.users.findUnique({
    where: { email },
    select: {
      user_id: true,
      email: true,
      full_name: true,
      default_company_id: true,
      password_hash: true,
      timezone: true,
      email_verified: true,
      profile_picture_url: true
    },
  });
};

const createUser = async (userData: NewUser) => {
  return prisma.$transaction(async (tx) => {
    const user = await tx.users.create({
      data: {
        email: userData.email,
        full_name: userData.full_name,
        default_company_id: userData.company_id,
        timezone: userData.timezone,
        terms_accepted: userData.terms_accepted,
        terms_accepted_date: userData.terms_accepted_date,
        reset_password_token_expiry: userData.reset_password_token_expiry,
        reset_password_token: userData.reset_password_token,
        created_at: userData.created_at,
        email_verified: userData.email_verified,
      },
    });

    await tx.subscriptions.create({
      data: {
        company_id: userData.company_id,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
        plan_name: "Free",
        status: "active",
        seats_used: 1,
        start_date: null,
        renewal_date: null,
        billing_email: null,
        billing_cycle: null,
        trial_end_date: null,
        is_manual_trial: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return user;
  });
};

const changeEmail = async (userData: EmailChange) => {
  const {
    userId,
    new_email,
    email_change_token,
    email_change_token_expiry,
    email_change_attempted_at,
  } = userData;

  return prisma.users.update({
    where: { user_id: userId },
    data: {
      pending_new_email: new_email,
      email_change_token,
      email_change_token_expiry,
      email_change_attempted_at,
    },
    select: {
      full_name: true,
    },
  });
};

const emailChangeConfirmation = async (email: string, token: string) => {
  return prisma.users.findFirst({
    where: {
      email,
      email_change_token: token,
      email_change_token_expiry: {
        gte: new Date(),
      },
    },
  });
};

const emailChange = async (
  userId: number,
  newEmail: string,
  verifyToken: string,
  tokenExpiry: Date
) => {
  return prisma.users.update({
    where: {
      user_id: userId,
    },
    data: {
      email_change_token: null,
      email_change_token_expiry: null,
      email: newEmail,
      email_verified: false,
      email_verification_token: verifyToken,
      email_verification_token_expiry: tokenExpiry,
      pending_new_email: null,
      email_updated_at: new Date(),
      updated_at: new Date(),
    },
    select: {
      full_name: true,
      email: true,
    },
  });
};

const verifyUserEmail = async (
  email: string,
  token: string
) => {
  const user = await prisma.users.findFirst({
    where: {
      email,
      email_verification_token: token,
      email_verification_token_expiry: {
        gte: new Date(),
      },
    },
  });

  if (!user) return null;

  return prisma.users.update({
    where: {
      user_id: user.user_id,
    },
    data: {
      email_verification_token: null,
      email_verification_token_expiry: null,
      email_verified: true,
      updated_at: new Date(),
    }
  });
};

const createSocialUser = async (userData: SocialUser) => {
  return prisma.$transaction(async (tx) => {
    const user = await tx.users.create({
      data: {
        email: userData.email,
        full_name: userData.full_name,
        default_company_id: userData.company_id,
        created_at: new Date(),
        email_verified: userData.email_verified,
        last_login: new Date(),
      },
    });

    await tx.subscriptions.create({
      data: {
        company_id: userData.company_id,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
        plan_name: "Free",
        status: "active",
        seats_used: 1,
        start_date: null,
        renewal_date: null,
        billing_email: null,
        billing_cycle: null,
        trial_end_date: null,
        is_manual_trial: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return user;
  });
};

const createSocialAccount = async (userData: SocialAccount) => {
  return prisma.user_social_accounts.create({
    data: {
      user_id: userData.user_id,
      provider: userData.provider,
      provider_user_id: userData.provider_user_id,
      profile_picture_url: userData.profile_picture_url,
      email: userData.email,
      id_token: userData.id_token,
      created_at: new Date(),
      last_login_at: new Date(),
    },
  });
};

const checkGoogleSocialAccount = async (user_id: number) => {
  return prisma.user_social_accounts.findFirst({
    where: { user_id, provider: "google" },
    select: {
      provider_user_id: true,
    },
  });
};

const checkLinkedInSocialAccount = async (user_id: number) => {
  return prisma.user_social_accounts.findFirst({
    where: { user_id, provider: "linkedin" },
    select: {
      provider_user_id: true,
    },
  });
};

const updateGoogleSocialLoginTime = async (
  user_id: number,
  provider_user_id: string,
  id_token: string,
  profile_picture_url: string
) => {
  return prisma.user_social_accounts.update({
    where: {
      user_id_provider_provider_user_id: {
        user_id: user_id,
        provider: "google",
        provider_user_id: provider_user_id,
      },
    },
    data: {
      last_login_at: new Date(),
      id_token: id_token,
      profile_picture_url: profile_picture_url,
    },
  });
};

const updateLinkedInSocialLoginTime = async (
  user_id: number,
  provider_user_id: string,
  id_token: string,
  profile_picture_url: string
) => {
  return prisma.user_social_accounts.update({
    where: {
      user_id_provider_provider_user_id: {
        user_id: user_id,
        provider: "linkedin",
        provider_user_id: provider_user_id,
      },
    },
    data: {
      last_login_at: new Date(),
      id_token: id_token,
      profile_picture_url: profile_picture_url,
    },
  });
};

const verifyUser = async (user_id: number) => {
  return prisma.users.update({
    where: { user_id },
    data: {
      email_verified: true,
      last_login: new Date(),
      updated_at: new Date(),
    },
  });
};

const updateVerifyEmail = async (email: string, token: string) => {
  const user = await prisma.users.findFirst({
    where: {
      email,
      email_verification_token: token,
      email_verification_token_expiry: {
        gte: new Date(),
      },
    },
  });

  if (!user) return null;

  return prisma.users.update({
    where: {
      user_id: user.user_id,
    },
    data: {
      email_verification_token: null,
      email_verification_token_expiry: null,
      email_verified: true,
    },
  });
};

const updateProfile = async (updateprofile: UserProfileUpdate) => {
  const {
    userId,
    full_name,
    job_title,
    email,
    timezone,
    country,
    profile_picture_url,
  } = updateprofile;

  return prisma.users.update({
    where: { user_id: userId },
    data: {
      ...(full_name && { full_name }),
      ...(job_title && { job_title }),
      ...(email && { email }),
      ...(timezone && { timezone }),
      // ...(country && { country }),
      ...(profile_picture_url && { profile_picture_url }),
      updated_at: new Date(),
    },
  });
};

const updateProfilePicture = async (userId: number, fileUrl: string) => {
  return prisma.users.update({
    where: { user_id: userId },
    data: {
      profile_picture_url: fileUrl,
    },
  });
};

const getUserPassword = async (userId: number) => {
  return prisma.users.findUnique({
    where: { user_id: userId },
    select: {
      password_hash: true,
    },
  });
};

const updatePassword = async (updatePassword: UserPasswordUpdate) => {
  return prisma.users.update({
    where: { user_id: updatePassword.userId },
    data: {
      password_hash: updatePassword.password,
    },
  });
};

const forgotPassword = async (forgotPassword: ForgotPassword) => {
  return prisma.users.update({
    where: { email: forgotPassword.email },
    data: {
      reset_password_token: forgotPassword.reset_password_token,
      reset_password_token_expiry: forgotPassword.reset_password_token_expiry,
    },
  });
};

const resetPassword = async (
  email: string,
  token: string,
  password: string
) => {
  const user = await prisma.users.findFirst({
    where: {
      email,
      reset_password_token: token,
      reset_password_token_expiry: {
        gte: new Date(),
      },
    },
  });

  if (!user) return null;

  return prisma.users.update({
    where: {
      user_id: user.user_id,
    },
    data: {
      password_hash: password,
      reset_password_token: null,
      reset_password_token_expiry: null,
      email_verified: true,
    },
  });
};

const updateLoginTime = async (userId: number) => {
  return prisma.users.update({
    where: { user_id: userId },
    data: {
      last_login: new Date(),
    },
  });
};

const getUserData = async (email: string) => {
  return prisma.users.findUnique({
    where: { email },
    select: {
      user_id: true,
      email: true,
      full_name: true,
      timezone: true,
    },
  });
};

const validatePasswordToken = async (token: string) => {
  return await prisma.users.findFirst({
    where: {
      reset_password_token: token,
      reset_password_token_expiry: {
        gte: new Date(),
      },
    },
  });
};

const getSocialUserByEmail = async (email: string) => {
  return prisma.user_social_accounts.findFirst({
    where: { email },
    select: {
      email: true,
      user_id: true,
      user: {
        select: {
          full_name: true,
          user_id : true,
          timezone: true,
          password_hash: true
        },
      },
    },
  });
};

const getSocialUserByEmailAndProvider = async (email: string, provider: string) => {
  const result = await prisma.user_social_accounts.findFirst({
    where: {
      email,
      provider,
    },
    select: {
      user: {
        select: {
          full_name: true,
          user_id : true,
          timezone: true,
          password_hash: true
        },
      },
    },
  });

  return result?.user;
};



const userQueries = {
  getUserByEmail,
  getUserProfilePicture,
  createCompany,
  createCompanyUser,
  assignCompaniesToUser,
  updateCompanyUser,
  checkCompany,
  loginUser,
  createUser,
  changeEmail,
  emailChangeConfirmation,
  emailChange,
  verifyUserEmail,
  createSocialUser,
  createSocialAccount,
  checkGoogleSocialAccount,
  updateGoogleSocialLoginTime,
  verifyUser,
  updateVerifyEmail,
  updateProfile,
  updateProfilePicture,
  getUserPassword,
  updatePassword,
  forgotPassword,
  resetPassword,
  updateLoginTime,
  checkUserByEmail,
  getUserData,
  validatePasswordToken,
  checkLinkedInSocialAccount,
  updateLinkedInSocialLoginTime,
  getSocialUserByEmail,
  getSocialUserByEmailAndProvider
};

export default userQueries;
