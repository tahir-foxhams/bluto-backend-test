import Joi from "joi";

export const canInviteSchema = Joi.object({
  instanceId: Joi.string().required().messages({
    "string.base": "Instance is invalid",
    "any.required": "Instance is required",
    "string.empty": "Instance is not allowed to be empty",
  }),

  permission: Joi.string().valid("view", "edit").required().messages({
    "any.only": "Permission must be one of view, or edit",
    "string.empty": "Permission is not allowed to be empty",
    "any.required": "Permission is required",
  }),
});

export const featureAccessSchema = Joi.object({
  featureAccess: Joi.string()
    .valid("view", "export", "advanced-analytics", "api-access")
    .required()
    .messages({
      "any.only":
        "Feature access must be one of view, export, advanced-analytics or api-access",
      "string.empty": "Feature access is not allowed to be empty",
      "any.required": "Feature access is required",
    }),
});

export const renameCompanySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "Name is not allowed to be empty",
    "any.required": "Name is required",
    "string.min": "Name must be at least 1 character long",
    "string.max": "Name must not exceed 100 characters",
  }),
});