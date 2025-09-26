import Joi from "joi";

export const createSupportTicketSchema = Joi.object({
  ticket_type: Joi.string()
    .valid(
      "bug",
      "data_issue",
      "account",
      "model_help",
      "feature_request",
      "other"
    )
    .required()
    .messages({
      "any.required": "Ticket type is required",
      "string.empty": "Ticket type is not allowed to be empty",
      "any.only":
        "Ticket type must be one of bug, data_issue, account, model_help, feature_request, or other",
    }),

  subject: Joi.string()
    .trim()
    .min(2)
    .max(255)
    .pattern(/^(?!\d+$).+/)
    .required()
    .messages({
      "string.base": "Subject must be a string",
      "string.empty": "Subject cannot be empty",
      "string.min": "Subject must be at least {#limit} characters long",
      "string.max": "Subject must be at most {#limit} characters long",
      "string.pattern.base": "Subject cannot be only digits",
      "any.required": "Subject is required",
    }),

  description: Joi.string()
    .trim()
    .max(1000)
    .allow("")
    .custom((value, helpers) => {
      const trimmed = value.trim();
      if (value.trim() !== "" && value.trim().length < 2) {
        return helpers.error("string.min", { limit: 2 });
      }
      if (/^\d+$/.test(trimmed)) {
        return helpers.error("string.pattern.base", {
          message: "Description cannot be only numbers",
        });
      }
      return value;
    })
    .messages({
      "string.base": "Description must be a string",
      "string.max": "Description must be at most {#limit} characters long",
      "string.min": "Description must be at least {#limit} characters long",
      "string.pattern.base": "Description cannot be only numbers",
    }),

  company_id: Joi.number().integer().positive().required().messages({
    "number.base": "Company is invalid",
    "number.integer": "Company is invalid",
    "number.positive": "Company is invalid",
    "any.required": "Company is required",
    "any.invalid": "Company is invalid",
  }),

  priority: Joi.string()
    .valid("low", "medium", "high", "urgent")
    .required()
    .messages({
      "any.only": "Priority must be one of low, medium, high, or urgent",
      "string.empty": "Priority is not allowed to be empty",
      "any.required": "Priority is required",
    }),

  page_url: Joi.string().uri().optional().messages({
    "string.uri": "Page URL must be a valid URL",
    "string.empty": "Page URL is not allowed to be empty",
  }),

  browser_info: Joi.object({
    userAgent: Joi.string().required().messages({
      "any.required": "User Agent is required",
      "string.empty": "User Agent is not allowed to be empty",
    }),
    language: Joi.string().required().messages({
      "any.required": "Language is required",
      "string.empty": "Language is not allowed to be empty",
    }),
    platform: Joi.string().required().messages({
      "any.required": "Platform is required",
      "string.empty": "Platform is not allowed to be empty",
    }),
    screenResolution: Joi.string().required().messages({
      "any.required": "Screen resolution is required",
      "string.empty": "Screen resolution is not allowed to be empty",
    }),
  })
    .optional()
    .messages({
      "object.base": "Browser info must be an object",
    }),
});
