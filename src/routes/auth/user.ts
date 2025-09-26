import { Router } from "express";
import {
  registerUser,
  loginUser,
  googleLoginUser,
  emailChange,
  emailChangeConfirmation,
  verifyUserEmail,
  updateProfile,
  updateProfilePicture,
  updatePassword,
  forgotPassword,
  resetPassword,
  validatePasswordToken,
  linkedinLoginUser
} from "../../controllers/auth/user";
import { bodyValidator, queryValidator } from "../../middlewares/joiValidator";
import { verifyJwt } from "../../middlewares/verifyJwt";
import upload from "../../config/multer";
import { validateFile } from "../../middlewares/fileValidation";

const router = Router();

router.post("/user/register", bodyValidator("registerUserSchema"), registerUser);

router.post("/user/login", bodyValidator("loginUserSchema"), loginUser);

router.post("/callback/google", bodyValidator("socialLoginSchema"), googleLoginUser);
router.post("/callback/linkedin", bodyValidator("socialLoginSchema"), linkedinLoginUser);

router.put(
  "/user/email-change",
  verifyJwt,
  bodyValidator("emailChangeSchema"),
  emailChange
);

router.get(
  "/user/email-change-confirm",
  verifyJwt,
  queryValidator("emailUpdateSchema"),
  emailChangeConfirmation
);

router.get(
  "/user/verify-email",
  queryValidator("authTokenSchema"),
  verifyUserEmail
);

router.put(
  "/user/profile",
  verifyJwt,
  upload.single("profile_picture"),
  validateFile(false),
  bodyValidator("profileUpdateSchema"),
  updateProfile
);

router.put(
  "/user/profile-picture",
  verifyJwt,
  upload.single("profile_picture"),
  validateFile(true),
  updateProfilePicture
);

router.put(
  "/user/password",
  verifyJwt,
  bodyValidator("passwordUpdateSchema"),
  updatePassword
);

router.post(
  "/user/forgot-password",
  bodyValidator("forgotPasswordSchema"),
  forgotPassword
);

router.post(
  "/user/reset-password",
  queryValidator("authTokenSchema"),
  bodyValidator("resetPasswordSchema"),
  resetPassword
);

router.get(
  "/user/validate-password-token",
  queryValidator("validateTokenSchema"),
  validatePasswordToken
);

export default router;
