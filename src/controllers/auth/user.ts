import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import axios from "axios";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import userQueries from "../../queries/auth/user";
import { configs } from "../../config/config";
import { emailConfigs } from "../../config/email-config";
import { sendMail } from "../../utils/sendMail";
import { uploadFileS3, deleteFileS3 } from "../../utils/uploadFile";

const jwtSecret = configs.jwtSecret;
const salt = parseInt(configs.salt || "10");

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, full_name, timezone, terms_accepted } = req.body;

    const existingUser = await userQueries.getUserByEmail(email);

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
        response: null,
        error: "User already exists",
      });
    }

    const existingSocialUser = await userQueries.getSocialUserByEmail(email);

    if (existingSocialUser) {
      return res.status(409).json({
        message: "This email is already associated with a social login account",
        response: null,
        error: "This email is already associated with a social login account",
      });
    }

    const createCompany = await userQueries.createCompany(
      full_name + `'s Workspace`
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

    const user = await userQueries.createUser({
      email,
      full_name,
      company_id,
      timezone,
      terms_accepted,
      terms_accepted_date: now,
      reset_password_token_expiry: tokenExpiry,
      reset_password_token: token,
      created_at: now,
      email_verified: false,
    });

    await userQueries.createCompanyUser(company_id, user.user_id, "owner");
    await userQueries.assignCompaniesToUser(email, user.user_id);

    function formatDate(date: Date) {
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      });
    }

    const dynamicData = {
      current_date: formatDate(now),
      privacy_url: `${configs.frontendBaseUrl}/privacy`,
      support_email: `${configs.frontendBaseUrl}/support`,
      terms_url: `${configs.frontendBaseUrl}/terms`,
      unsubscribe_url: `${configs.frontendBaseUrl}/unsubscribe`,
      full_name: full_name,
      user_email: email,
      reset_password_expiry: formatDate(tokenExpiry),
      reset_url: resetPasswordUrl,
      to_email: email,
      action: "set",
    };

    await sendMail(emailConfigs.templates.resetPassword, dynamicData);

    return res.status(201).json({
      message: "User created successfully",
      response: null,
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

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const existingUser = await userQueries.loginUser(email);
    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
        response: null,
        error: "User not found",
      });
    }
    if (!existingUser.email_verified) {
      return res.status(403).json({
        error: "Email not verified",
        response: null,
        message: "Email not verified",
      });
    }
    if (!existingUser.password_hash) {
      return res.status(403).json({
        error: "Your password is not set. Please set your password",
        response: null,
        message: "Your password is not set. Please set your password",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password_hash
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Your email or password is not correct",
        response: null,
        error: "Your email or password is not correct",
      });
    }

    const token = jwt.sign({ email: existingUser.email }, jwtSecret, {
      expiresIn: "24h",
    });

    const userData = {
      user_name: existingUser.full_name,
      email: existingUser.email,
      timezone: existingUser.timezone,
      has_password: true,
      profile_picture_url: existingUser.profile_picture_url || null,
    };

    await userQueries.updateLoginTime(existingUser.user_id);

    const data = {
      data: userData,
      token,
    };

    return res.status(200).json({
      message: "User logged in successfully",
      response: data,
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

export const googleLoginUser = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const provider = "google";

    let payload: any;

    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: configs.googleClientId,
      client_secret: configs.googleClientSecret,
      redirect_uri: "postmessage",
      grant_type: "authorization_code",
    });

    const exchangedAccessToken = tokenRes.data.access_token;
    const exchangedIdToken = tokenRes.data.id_token;
    const userInfo = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${exchangedAccessToken}` },
      }
    );

    payload = {
      email: userInfo.data.email,
      name: userInfo.data.name,
      picture: userInfo.data.picture,
      sub: userInfo.data.sub,
      access_token: exchangedAccessToken,
    };

    const {
      email,
      name: full_name,
      picture: profile_picture_url,
      sub: provider_user_id,
    } = payload;

    const tokenToStore = exchangedIdToken;

    const existingSocialAccount =
      await userQueries.getSocialUserByEmailAndProvider(email, provider);

    if (existingSocialAccount) {
      await userQueries.updateGoogleSocialLoginTime(
        existingSocialAccount.user_id,
        provider_user_id,
        tokenToStore,
        profile_picture_url
      );

      await userQueries.updateLoginTime(existingSocialAccount.user_id);

      const token = jwt.sign({ email }, jwtSecret, { expiresIn: "24h" });

      return res.status(200).json({
        message: "User logged in successfully",
        response: {
          data: {
            user_name: existingSocialAccount.full_name,
            email,
            timezone: existingSocialAccount.timezone,
            provider,
            profile_picture_url,
            has_password: !!existingSocialAccount.password_hash,
          },
          token,
        },
        error: null,
      });
    }

    const existingSocialUserViaOtherProvider =
      await userQueries.getSocialUserByEmail(email);

    if (existingSocialUserViaOtherProvider) {
      await userQueries.createSocialAccount({
        user_id: existingSocialUserViaOtherProvider.user_id,
        provider,
        provider_user_id,
        email,
        profile_picture_url,
        id_token: tokenToStore,
      });

      await userQueries.verifyUser(existingSocialUserViaOtherProvider.user_id);

      await userQueries.updateGoogleSocialLoginTime(
        existingSocialUserViaOtherProvider.user_id,
        provider_user_id,
        tokenToStore,
        profile_picture_url
      );

      await userQueries.updateLoginTime(
        existingSocialUserViaOtherProvider.user_id
      );

      const token = jwt.sign({ email }, jwtSecret, { expiresIn: "24h" });

      return res.status(200).json({
        message: "User logged in successfully",
        response: {
          data: {
            user_name: existingSocialUserViaOtherProvider.user.full_name,
            email,
            timezone: existingSocialUserViaOtherProvider.user.timezone,
            provider,
            profile_picture_url,
            has_password:
              !!existingSocialUserViaOtherProvider.user.password_hash,
          },
          token,
        },
        error: null,
      });
    }

    const existingUser = await userQueries.loginUser(email);

    if (!existingUser) {
      const companyName = `${full_name}'s Workspace`;
      const { company_id } = await userQueries.createCompany(companyName);

      const user = await userQueries.createSocialUser({
        email,
        full_name,
        company_id,
        email_verified: true,
      });

      await userQueries.createSocialAccount({
        user_id: user.user_id,
        provider,
        provider_user_id,
        email,
        profile_picture_url,
        id_token: tokenToStore,
      });

      await userQueries.createCompanyUser(company_id, user.user_id, "owner");
      await userQueries.assignCompaniesToUser(email, user.user_id);

      const token = jwt.sign({ email: user.email }, jwtSecret, {
        expiresIn: "24h",
      });

      return res.status(200).json({
        message: "User logged in successfully",
        response: {
          data: {
            user_name: user.full_name,
            email: user.email,
            timezone: user.timezone,
            provider,
            profile_picture_url,
            has_password: false,
          },
          token,
        },
        error: null,
      });
    }

    await userQueries.createSocialAccount({
      user_id: existingUser.user_id,
      provider,
      provider_user_id,
      email,
      profile_picture_url,
      id_token: tokenToStore,
    });

    await userQueries.verifyUser(existingUser.user_id);

    await userQueries.updateGoogleSocialLoginTime(
      existingUser.user_id,
      provider_user_id,
      tokenToStore,
      profile_picture_url
    );

    await userQueries.updateLoginTime(existingUser.user_id);

    const token = jwt.sign({ email: existingUser.email }, jwtSecret, {
      expiresIn: "24h",
    });

    return res.status(200).json({
      message: "User logged in successfully",
      response: {
        data: {
          user_name: existingUser.full_name,
          email: existingUser.email,
          timezone: existingUser.timezone,
          provider,
          profile_picture_url,
          has_password: !!existingUser.password_hash,
        },
        token,
      },
      error: null,
    });
  } catch (error: unknown) {
    let errorMessage = "An unexpected error occurred";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      if (error.response) {
        statusCode = error.response.status;

        switch (error.response.status) {
          case 400:
            errorMessage = "Invalid or expired code";
            break;
          case 401:
            errorMessage = "Invalid or expired code";
            break;
          case 403:
            errorMessage = "Access denied by Google";
            break;
          case 500:
            errorMessage = "Google server error. Try again later";
            break;
          default:
            errorMessage =
              error.response.data?.error_description ||
              error.response.data?.error ||
              "Unexpected error from Google";
            break;
        }
      } else if (error.request) {
        statusCode = 503;
        errorMessage = "No response from Google servers";
      } else {
        errorMessage = error.message || "Google login failed";
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;

      if (
        error.message.includes("Code used too late") ||
        error.message.includes("Invalid code")
      ) {
        statusCode = 400;
        errorMessage = "Invalid or expired Google code";
      }
    }

    return res.status(statusCode).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const linkedinLoginUser = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const clientId = configs.linkedinClientId;
    const clientSecret = configs.linkedinClientSecret;
    const redirectUri = configs.linkedinCallbackUrl;

    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const access_token = tokenResponse.data.access_token;

    if (!access_token) {
      return res.status(400).json({
        message: "Missing LinkedIn access token",
        response: null,
        error: "Missing LinkedIn access token",
      });
    }

    const profileRes = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const profile = profileRes.data;
    const email = profile.email;

    if (!profile || !email) {
      return res.status(400).json({
        message: "Invalid LinkedIn token or unable to fetch profile/email",
        response: null,
        error: "Invalid LinkedIn token or unable to fetch profile/email",
      });
    }

    const full_name = `${profile.given_name} ${profile.family_name}`;
    const provider_user_id = profile.sub;
    const provider = "linkedin";
    const profile_picture_url = profile?.picture || "";

    const existingSocialAccount =
      await userQueries.getSocialUserByEmailAndProvider(email, provider);
    if (existingSocialAccount) {
      await userQueries.updateLinkedInSocialLoginTime(
        existingSocialAccount.user_id,
        provider_user_id,
        access_token,
        profile_picture_url
      );
      await userQueries.updateLoginTime(existingSocialAccount.user_id);

      const token = jwt.sign({ email }, jwtSecret, {
        expiresIn: "24h",
      });

      return res.status(200).json({
        message: "User logged in successfully",
        response: {
          data: {
            user_name: existingSocialAccount.full_name,
            email,
            timezone: existingSocialAccount.timezone,
            provider: "linkedin",
            profile_picture_url,
            has_password: existingSocialAccount?.password_hash ? true : false,
          },
          token,
        },
        error: null,
      });
    }
    const existingSocialUserViaOtherProvider =
      await userQueries.getSocialUserByEmail(email); // This checks any provider
    if (existingSocialUserViaOtherProvider) {
      await userQueries.createSocialAccount({
        user_id: existingSocialUserViaOtherProvider.user_id,
        provider,
        provider_user_id,
        email,
        profile_picture_url,
        id_token: access_token,
      });

      await userQueries.verifyUser(existingSocialUserViaOtherProvider.user_id);
      await userQueries.updateLinkedInSocialLoginTime(
        existingSocialUserViaOtherProvider.user_id,
        provider_user_id,
        access_token,
        profile_picture_url
      );
      await userQueries.updateLoginTime(
        existingSocialUserViaOtherProvider.user_id
      );

      const token = jwt.sign(
        { email: existingSocialUserViaOtherProvider.email },
        jwtSecret,
        {
          expiresIn: "24h",
        }
      );

      return res.status(200).json({
        message: "User logged in successfully",
        response: {
          data: {
            user_name: existingSocialUserViaOtherProvider.user.full_name,
            email: existingSocialUserViaOtherProvider.email,
            timezone: existingSocialUserViaOtherProvider.user.timezone,
            provider: "linkedin",
            profile_picture_url,
            has_password: existingSocialUserViaOtherProvider?.user
              ?.password_hash
              ? true
              : false,
          },
          token,
        },
        error: null,
      });
    }
    
    let existingUser = await userQueries.loginUser(email);

    if (!existingUser) {
      const companyName = `${full_name}'s Workspace`;
      const { company_id } = await userQueries.createCompany(companyName);

      const user = await userQueries.createSocialUser({
        email,
        full_name,
        company_id,
        email_verified: true,
      });

      const user_id = user.user_id;

      await userQueries.createSocialAccount({
        user_id,
        provider,
        provider_user_id,
        email,
        profile_picture_url,
        id_token: access_token, // use access token as placeholder
      });

      await userQueries.createCompanyUser(company_id, user.user_id, "owner");
      await userQueries.assignCompaniesToUser(email, user.user_id);

      const token = jwt.sign({ email: user.email }, jwtSecret, {
        expiresIn: "24h",
      });

      return res.status(200).json({
        message: "User logged in successfully",
        response: {
          data: {
            user_name: user.full_name,
            email: user.email,
            timezone: user.timezone,
            provider: "linkedin",
            profile_picture_url,
            has_password: false,
          },
          token,
        },
        error: null,
      });
    }

    await userQueries.createSocialAccount({
      user_id: existingUser.user_id,
      provider,
      provider_user_id,
      email,
      profile_picture_url,
      id_token: access_token,
    });

    await userQueries.verifyUser(existingUser.user_id);

    await userQueries.updateLinkedInSocialLoginTime(
      existingUser.user_id,
      provider_user_id,
      access_token,
      profile_picture_url
    );
    await userQueries.updateLoginTime(existingUser.user_id);

    const token = jwt.sign({ email: existingUser.email }, jwtSecret, {
      expiresIn: "24h",
    });

    return res.status(200).json({
      message: "User logged in successfully",
      response: {
        data: {
          user_name: existingUser.full_name,
          email: existingUser.email,
          timezone: existingUser.timezone,
          provider: "linkedin",
          profile_picture_url,
          has_password: existingUser?.password_hash ? true : false,
        },
        token,
      },
      error: null,
    });
  } catch (error: unknown) {
    console.log("Error", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    if (
      errorMessage.includes("401") ||
      errorMessage.includes("400") ||
      errorMessage.includes("invalid_token")
    ) {
      return res.status(400).json({
        message: "Invalid or expired LinkedIn access token",
        response: null,
        error: "Invalid or expired LinkedIn access token",
      });
    }

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: "Invalid or expired LinkedIn access token",
    });
  }
};

export const emailChange = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.decoded.userId as string);
    const oldEmail = req.decoded?.email ?? null;
    const { new_email, device_info, request_time } = req.body;
    const ipAddress = req.ip;

    if (new_email === oldEmail) {
      return res.status(400).json({
        message: "You're already using this email address",
        response: null,
        error: "You're already using this email address",
      });
    }

    const existingUser = await userQueries.getUserByEmail(new_email);
    if (existingUser) {
      return res.status(409).json({
        message: "Another account with the same email already exist",
        response: null,
        error: "Another account with the same email already exist",
      });
    }

    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const now = new Date();
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 3);
    const emailChangeUrl = `${configs.frontendBaseUrl}/auth/confirm-change-email?token=${token}&new_email=${new_email}&old_email=${oldEmail}`;

    const changeEmail = await userQueries.changeEmail({
      userId,
      new_email,
      email_change_token_expiry: tokenExpiry,
      email_change_token: token,
      email_change_attempted_at: now,
    });

    const dynamicData = {
      user_full_name: changeEmail.full_name,
      old_email: oldEmail,
      new_email: new_email,
      email_change_url: emailChangeUrl,
      device_info,
      ip_address: ipAddress,
      request_time,
      to_email: oldEmail,
    };

    await sendMail(emailConfigs.templates.emailUpdateConfirm, dynamicData);

    return res.status(200).json({
      message: "Email change request sent successfully",
      response: null,
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

export const emailChangeConfirmation = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.decoded.userId as string);
    const oldEmail = req.query.old_email as string;
    const token = req.query.token as string;

    const existingUser = await userQueries.getUserByEmail(oldEmail);
    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
        response: null,
        error: "User not found",
      });
    }

    const newEmail = existingUser.pending_new_email;
    if (!newEmail) {
      return res.status(400).json({
        message: "Invalid email or token",
        response: null,
        error: "Invalid email or token",
      });
    }

    const existingNewEmail = await userQueries.getUserByEmail(newEmail);
    if (existingNewEmail) {
      return res.status(409).json({
        message: "Another account with the same email already exist",
        response: null,
        error: "Another account with the same email already exist",
      });
    }

    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const verifyToken = Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 3);

    const validToken = await userQueries.emailChangeConfirmation(
      oldEmail,
      token
    );
    if (!validToken) {
      return res.status(400).json({
        message: "Invalid token or expired",
        response: null,
        error: "Invalid token or expired",
      });
    }

    const user = await userQueries.emailChange(
      userId,
      newEmail,
      verifyToken,
      tokenExpiry
    );
    if (!user) {
      return res.status(400).json({
        message: "Invalid token or expired",
        response: null,
        error: "Invalid token or expired",
      });
    }

    const successDynamicData = {
      user_full_name: user.full_name,
      old_email: oldEmail,
      new_email: user.email,
      to_email: oldEmail,
    };
    await sendMail(
      emailConfigs.templates.emailUpdateSuccess,
      successDynamicData
    );

    const verifyEmailUrl = `${configs.frontendBaseUrl}/auth/verify-email-change?token=${verifyToken}&email=${user.email}`;
    const verifyDynamicData = {
      user_full_name: user.full_name,
      old_email: oldEmail,
      new_email: user.email,
      email_verification_link: verifyEmailUrl,
      to_email: user.email,
    };
    await sendMail(emailConfigs.templates.emailUpdateVerify, verifyDynamicData);

    return res.status(200).json({
      message: "Email updated successfully. Please verify your new email",
      response: null,
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

export const verifyUserEmail = async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    const token = req.query.token as string;

    const existingUser = await userQueries.getUserByEmail(email);
    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
        response: null,
        error: "User not found",
      });
    }

    const user = await userQueries.verifyUserEmail(email, token);
    if (!user) {
      return res.status(400).json({
        message: "Invalid token or expired",
        response: null,
        error: "Invalid token or expired",
      });
    }

    return res.status(200).json({
      message: "Email verified successfully",
      response: null,
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

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.decoded.userId as string);
    const { full_name, job_title } = req.body;

    const profilePictureUrl = req.file
      ? await uploadFileS3({ documentFile: req.file, folderName: "users" })
      : null;

    const getUser = await userQueries.getUserProfilePicture(userId);
    if (getUser.profile_picture_url && profilePictureUrl) {
      await deleteFileS3(getUser.profile_picture_url);
    }

    const updateProfile = await userQueries.updateProfile({
      userId,
      full_name,
      job_title,
      profile_picture_url: profilePictureUrl,
    });

    if (!updateProfile) {
      return res.status(400).json({
        message: "Failed to update profile",
        response: null,
        error: "Failed to update profile",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      response: null,
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

export const updateProfilePicture = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.decoded.userId as string);

    const getUser = await userQueries.getUserProfilePicture(userId);
    if (getUser.profile_picture_url) {
      await deleteFileS3(getUser.profile_picture_url);
    }

    const fileUrl = req.file
      ? await uploadFileS3({ documentFile: req.file, folderName: "users" })
      : null;

    await userQueries.updateProfilePicture(userId, fileUrl);

    return res.status(200).json({
      message: "Profile picture updated successfully",
      response: null,
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

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.decoded.userId as string);
    const { old_password, new_password } = req.body;

    const user = await userQueries.getUserPassword(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        response: null,
        error: "User not found",
      });
    }

    const isOldPasswordValid = await bcrypt.compare(
      old_password,
      user.password_hash
    );

    if (!isOldPasswordValid) {
      return res.status(400).json({
        message: "Invalid Old password",
        response: null,
        error: "Invalid Old password",
      });
    }

    const hashedNewPassword = await bcrypt.hash(new_password, salt);
    const updatePasswordResult = await userQueries.updatePassword({
      userId,
      password: hashedNewPassword,
    });

    if (!updatePasswordResult) {
      return res.status(400).json({
        message: "Failed to update password",
        response: null,
        error: "Failed to update password",
      });
    }

    return res.status(200).json({
      message: "Password updated successfully",
      response: null,
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

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await userQueries.checkUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        response: null,
        error: "User not found",
      });
    }

    let passwordAction = "reset";
    let passwordActionUrl = "reset-password";

    if (!user.email_verified) {
      passwordAction = "set";
      passwordActionUrl = "create-password";
    }

    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const now = new Date();
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 3);

    const resetPasswordUrl = `${configs.frontendBaseUrl}/auth/${passwordActionUrl}?token=${token}&email=${email}`;

    await userQueries.forgotPassword({
      email,
      reset_password_token: token,
      reset_password_token_expiry: tokenExpiry,
    });

    function formatDate(date: Date) {
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      });
    }

    const dynamicData = {
      current_date: formatDate(now),
      privacy_url: `${configs.frontendBaseUrl}/privacy`,
      support_email: `${configs.frontendBaseUrl}/support`,
      terms_url: `${configs.frontendBaseUrl}/terms`,
      unsubscribe_url: `${configs.frontendBaseUrl}/unsubscribe`,
      full_name: user.full_name,
      user_email: email,
      reset_password_expiry: formatDate(tokenExpiry),
      reset_url: resetPasswordUrl,
      to_email: email,
      action: passwordAction,
    };
    await sendMail(emailConfigs.templates.resetPassword, dynamicData);

    return res.status(200).json({
      message: `Email has been sent successfully for ${passwordAction} password`,
      response: null,
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

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    const token = req.query.token as string;
    const { password } = req.body;

    const existingUser = await userQueries.getUserByEmail(email);
    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
        response: null,
        error: "User not found",
      });
    }

    const changedDate = new Date();
    const hashPassword = await bcrypt.hash(password, salt);
    const user = await userQueries.resetPassword(email, token, hashPassword);
    if (!user) {
      return res.status(400).json({
        message: "Invalid token or expired",
        response: null,
        error: "Invalid token or expired",
      });
    }

    const now = new Date();
    function formatDate(date: Date) {
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
      });
    }

    if (existingUser.email_verified) {
      const dynamicData = {
        changed_date: formatDate(changedDate),
        current_date: formatDate(now),
        dashboard_url: `${configs.frontendBaseUrl}/dashboard`,
        device_info: `${configs.frontendBaseUrl}/device-info`,
        privacy_url: `${configs.frontendBaseUrl}/privacy`,
        support_email: `${configs.frontendBaseUrl}/support`,
        terms_url: `${configs.frontendBaseUrl}/terms`,
        unsubscribe_url: `${configs.frontendBaseUrl}/unsubscribe`,
        full_name: user.full_name,
        user_email: email,
        to_email: email,
      };
      await sendMail(
        emailConfigs.templates.resetPasswordConfirmation,
        dynamicData
      );
    } else {
      const dynamicData = {
        current_date: formatDate(now),
        dashboard_url: `${configs.frontendBaseUrl}/dashboard`,
        privacy_url: `${configs.frontendBaseUrl}/privacy`,
        support_email: `${configs.frontendBaseUrl}/support`,
        terms_url: `${configs.frontendBaseUrl}/terms`,
        unsubscribe_url: `${configs.frontendBaseUrl}/unsubscribe`,
        full_name: user.full_name,
        to_email: email,
      };
      await sendMail(emailConfigs.templates.welcomeEmail, dynamicData);
    }

    const userInfo = await userQueries.getUserData(email);
    const jwtToken = jwt.sign({ email: email }, jwtSecret, {
      expiresIn: "24h",
    });

    await userQueries.updateLoginTime(userInfo.user_id);
    const userData = {
      user_name: userInfo.full_name,
      email: email,
      timezone: userInfo.timezone,
      profile_picture_url: existingUser?.profile_picture_url || null,
      has_password: true,
    };

    const data = {
      data: userData,
      token: jwtToken,
    };

    return res.status(200).json({
      message: "User logged in successfully",
      response: data,
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

export const validatePasswordToken = async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;

    const validateToken = await userQueries.validatePasswordToken(token);
    if (!validateToken) {
      return res.status(400).json({
        message: "Invalid token or expired",
        response: null,
        error: "Invalid token or expired",
      });
    }
    return res.status(200).json({
      message: "The token is valid",
      response: null,
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
