import Joi from "joi";

export const createDemoRequestSchema = Joi.object({
  user_type: Joi.string()
    .min(2)
    .max(255)
    .pattern(/[a-zA-Z]/)
    .required()
    .messages({
      "any.required": "User type is required",
      "string.empty": "User type cannot be empty",
      "string.min": "User type must be at least {#limit} characters",
      "string.max": "User type must be at most {#limit} characters",
      "string.pattern.base": "User type must contain at least one letter",
    }),

  full_name: Joi.string()
    .trim()
    .min(2)
    .max(255)
    .pattern(/[a-zA-Z]/)
    .required()
    .messages({
      "any.required": "Full name is required",
      "string.empty": "Full name cannot be empty",
      "string.min": "Full name must be at least {#limit} characters",
      "string.max": "Full name must be at most {#limit} characters",
      "string.pattern.base": "Full name must contain at least one letter",
    }),

  is_qualified: Joi.boolean().required().messages({
    "any.required": "Qualification status is required",
    "boolean.base": "isQualified must be true or false",
  }),

  email: Joi.string().email().required().messages({
    "string.email": "Email must be a valid email address",
    "any.required": "Email is required",
    "string.empty": "Email cannot be empty",
  }),

  company: Joi.string().allow("").max(255).pattern(/[a-zA-Z]/).messages({
    "string.pattern.base": "Company name must contain at least one letter",
    "string.max": "Company name must be at most {#limit} characters",
  }),

  phone: Joi.string()
    .allow("")
    .pattern(/^[+]?[\d\s\-()]{6,20}$/)
    .messages({
      "string.pattern.base": "Phone must be a valid format",
    }),

  requirements: Joi.string().allow("").max(1000).pattern(/[a-zA-Z]/).messages({
    "string.pattern.base": "Requirements must contain at least one letter",
    "string.max": "Requirements must be at most {#limit} characters",
  }),

  browser_info: Joi.object().optional().messages({
    "object.base": "Browser info must be an object",
  }),

  metadata: Joi.object({
    sourceUrl: Joi.string().uri().allow("").optional().messages({
      "string.uri": "Source URL must be a valid URI",
    }),
    utmSource: Joi.string().max(100).allow("").optional().messages({
      "string.max": "UTM Source must be at most {#limit} characters",
    }),
    utmMedium: Joi.string().max(100).allow("").optional().messages({
      "string.max": "UTM Medium must be at most {#limit} characters",
    }),
    utmCampaign: Joi.string().max(100).allow("").optional().messages({
      "string.max": "UTM Campaign must be at most {#limit} characters",
    }),
  }).optional(),

  form_data: Joi.object().min(1).required().messages({
    "object.base": "Form data must be an object",
    "object.min": "Form data must contain at least one field",
    "any.required": "Form data is required",
  }),
});

export const validateBookingTokenSchema = Joi.object({
  booking_token: Joi.string()
    .guid({ version: ["uuidv4", "uuidv5"] })
    .required()
    .messages({
      "string.guid": "Booking token is not valid",
      "any.required": "Booking token is required",
      "string.empty": "Booking token cannot be empty",
    }),
});
