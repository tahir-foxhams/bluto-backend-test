import {
  registerUserSchema,
  authTokenSchema,
  loginUserSchema,
  emailChangeSchema,
  profileUpdateSchema,
  passwordUpdateSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  validateTokenSchema,
  socialLoginSchema,
  emailUpdateSchema,
} from "./auth";

import {
  createProductSchema,
  getProductInstancesSchema,
  getProductFormDataQuerySchema,
  createProductFormDataSchema,
  generateDashboardSchema,
  updateProductStatusSchema,
  updateProductSchema,
  autoSaveFormDataSchema,
  fileShareSchema,
  shareParamsSchema,
  acceptInvitationQuerySchema,
  updatePermissionSchema,
  lockFileSchema,
  paginationSchema,
  autoSaveSessionSchema,
  saveSessionSchema,
  restoreVersionSchema,
} from "./file";

import { createSupportTicketSchema } from "./support";

import {
  createDemoRequestSchema,
  validateBookingTokenSchema,
} from "./demo";

import {
  subscriptionSchema,
  customCheckoutSchema,
} from "./stripe";

import {
  canInviteSchema,
  featureAccessSchema,
  renameCompanySchema,
} from "./user";

import {
  updateRoleSchema,
  companyIdParamsSchema,
  userIdParamsSchema,
} from "./company";

export default {
  registerUserSchema,
  authTokenSchema,
  loginUserSchema,
  emailChangeSchema,
  profileUpdateSchema,
  passwordUpdateSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createProductSchema,
  getProductInstancesSchema,
  getProductFormDataQuerySchema,
  createProductFormDataSchema,
  generateDashboardSchema,
  updateProductStatusSchema,
  updateProductSchema,
  autoSaveFormDataSchema,
  fileShareSchema,
  shareParamsSchema,
  acceptInvitationQuerySchema,
  updatePermissionSchema,
  lockFileSchema,
  paginationSchema,
  autoSaveSessionSchema,
  saveSessionSchema,
  restoreVersionSchema,
  validateTokenSchema,
  socialLoginSchema,
  emailUpdateSchema,
  createSupportTicketSchema,
  createDemoRequestSchema,
  validateBookingTokenSchema,
  subscriptionSchema,
  customCheckoutSchema,
  canInviteSchema,
  featureAccessSchema,
  renameCompanySchema,
  updateRoleSchema,
  companyIdParamsSchema,
  userIdParamsSchema,
};
