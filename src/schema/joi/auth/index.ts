import Joi from "joi";

export const registerUserSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ minDomainSegments: 2 })
    .required()
    .messages({
      "string.email": "Enter a valid email address",
      "any.required": "Email is required",
      "string.empty": "Email is not allowed to be empty",
    }),

  full_name: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      "string.base": "Full name must be a string",
      "string.pattern.base": "Full name can only contain letters and spaces",
      "any.required": "Full name is required",
      "string.empty": "Full name is not allowed to be empty",
    }),

  timezone: Joi.string().trim().min(2).optional().messages({
    "string.base": "Timezone must be a string",
    "string.min": "Timezone must be at least 2 characters",
    "string.empty": "Timezone is not allowed to be empty",
  }),

  terms_accepted: Joi.boolean().required().valid(true).messages({
    "boolean.base": "Terms acceptance must be a boolean value",
    "any.only": "You must accept the terms and conditions",
    "any.required": "Terms acceptance is required",
  }),
});

export const authTokenSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ minDomainSegments: 2 })
    .required()
    .messages({
      "string.email": "Enter a valid email address",
      "any.required": "Email is required",
      "string.empty": "Email is not allowed to be empty",
    }),

  token: Joi.string().required().messages({
    "any.required": "Token is required",
    "string.empty": "Token is not allowed to be empty",
  }),
});

export const emailUpdateSchema = Joi.object({
  old_email: Joi.string()
    .trim()
    .lowercase()
    .email({ minDomainSegments: 2 })
    .required()
    .messages({
      "string.email": "Enter a valid email address",
      "any.required": "Email is required",
      "string.empty": "Email is not allowed to be empty",
    }),

  token: Joi.string().required().messages({
    "any.required": "Token is required",
    "string.empty": "Token is not allowed to be empty",
  }),
});

export const loginUserSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ minDomainSegments: 2 })
    .required()
    .messages({
      "string.email": "Enter a valid email address",
      "any.required": "Email is required",
      "string.empty": "Email is not allowed to be empty",
    }),

  password: Joi.string().trim().min(6).required().messages({
    "string.base": "Password must be a string",
    "string.min": "Password must be at least 6 characters",
    "any.required": "Password is required",
    "string.empty": "Password is not allowed to be empty",
  }),
});

export const emailChangeSchema = Joi.object({
  new_email: Joi.string()
    .trim()
    .lowercase()
    .email({ minDomainSegments: 2 })
    .required()
    .messages({
      "string.email": "Enter a valid email address",
      "any.required": "Email is required",
      "string.empty": "Email is not allowed to be empty",
    }),
  device_info: Joi.string().trim().required().messages({
    "string.base": "Device info must be a string",
    "any.required": "Device info is required",
    "string.empty": "Device info is not allowed to be empty",
  }),
  request_time: Joi.date().required().messages({
    "date.base": "Request time must be a valid date",
    "any.required": "Request time is required",
  }),
});

export const profileUpdateSchema = Joi.object({
  full_name: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z\s]+$/)
    .optional()
    .messages({
      "string.base": "Full name must be a string",
      "string.pattern.base": "Full name can only contain letters and spaces",
      "string.empty": "Full name is not allowed to be empty",
    }),

  job_title: Joi.string().trim().optional().messages({
    "string.base": "Job title must be a string",
    "string.empty": "Job title is not allowed to be empty",
  }),
});

export const passwordUpdateSchema = Joi.object({
  old_password: Joi.string().trim().min(6).required().messages({
    "string.base": "Old password must be a string",
    "string.min": "Old password must be at least 6 characters",
    "any.required": "Old password is required",
    "string.empty": "Old password is not allowed to be empty",
  }),

  new_password: Joi.string()
    .trim()
    .min(6)
    .disallow(Joi.ref("old_password"))
    .required()
    .messages({
      "string.base": "New password must be a string",
      "string.min": "New password must be at least 6 characters",
      "any.required": "New password is required",
      "string.empty": "New password is not allowed to be empty",
      "any.invalid": "New password must be different from old password",
    }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ minDomainSegments: 2 })
    .required()
    .messages({
      "string.email": "Enter a valid email address",
      "any.required": "Email is required",
      "string.empty": "Email is not allowed to be empty",
    }),
});

export const resetPasswordSchema = Joi.object({
  password: Joi.string().trim().min(6).required().messages({
    "string.base": "Password must be a string",
    "string.min": "Password must be at least 6 characters",
    "any.required": "Password is required",
    "string.empty": "Password is not allowed to be empty",
  }),

  confirm_password: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "Confirm password must match password",
      "any.required": "Confirm password is required",
      "string.empty": "Confirm password is not allowed to be empty",
    }),
});

export const validateTokenSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "Token is required",
    "string.empty": "Token is not allowed to be empty",
    "string.base": "Token must be a string",
  }),
});

export const socialLoginSchema = Joi.object({
  code: Joi.string().trim().required().messages({
    "string.base": "Code must be a string",
    "string.empty": "Code is not allowed to be empty",
    "any.required": "Code is required",
  }),
});
