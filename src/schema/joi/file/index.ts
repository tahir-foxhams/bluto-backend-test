import Joi from "joi";

export const createProductSchema = Joi.object({
  product_type_id: Joi.number().integer().positive().required().messages({
    "number.base": "Product type is invalid",
    "number.integer": "Product type is invalid",
    "number.positive": "Product type is invalid",
    "any.required": "Product type is required",
    "any.invalid": "Product type is invalid",
  }),

  title: Joi.string().trim().min(2).max(255).required().messages({
    "string.base": "Title must be a string",
    "string.empty": "Title is not allowed to be empty",
    "string.min": "Title must be at least {#limit} characters long",
    "string.max": "Title must be at most {#limit} characters long",
    "any.required": "Title is required",
  }),

  description: Joi.string().allow("").max(1000).messages({
    "string.base": "Description must be a string",
    "string.max": "Description must be at most {#limit} characters long",
  }),
});

export const updateProductSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required().messages({
    "string.base": "Title must be a string",
    "string.empty": "Title is not allowed to be empty",
    "string.min": "Title must be at least {#limit} characters long",
    "string.max": "Title must be at most {#limit} characters long",
    "any.required": "Title is required",
  }),

  description: Joi.string().allow("").max(1000).messages({
    "string.base": "Description must be a string",
    "string.max": "Description must be at most {#limit} characters long",
  }),
});

export const getProductInstancesSchema = Joi.object({
  status: Joi.string()
    .valid("all", "draft", "completed", "template")
    .default("all")
    .messages({
      "string.base": "Status must be a string",
      "string.empty": "Status is not allowed to be empty",
      "any.only":
        "Status must be one of 'all', 'draft', 'completed', or 'template'",
    }),

  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page must be a number",
    "number.integer": "Page must be an integer",
    "number.min": `Page must be at least {#limit}`,
  }),

  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": `Limit must be at least {#limit}`,
    "number.max": `Limit must be at most{#limit}`,
  }),

  sort_by: Joi.string()
    .valid("created_at", "last_modified", "updated_at", "last_modified_by", "file_name")
    .messages({
      "string.base": "Sort By must be a string",
      "string.empty": "Sort By is not allowed to be empty",
      "any.only":
        "Sort By must be one of 'created_at', 'last_modified', 'updated_at', 'last_modified_by', or 'file_name'",
    }),

  sort_direction: Joi.string().valid("asc", "desc").messages({
    "string.base": "Sort Direction must be a string",
    "string.empty": "Sort Direction is not allowed to be empty",
    "any.only": "Sort Direction must be either 'asc' or 'desc'",
  }),
});

export const getProductFormDataQuerySchema = Joi.object({
  section: Joi.string().trim().optional().messages({
    "string.base": "Section must be a string",
    "string.empty": "Section is not allowed to be empty",
  }),
});

export const createProductFormDataSchema = Joi.object({
  form_data: Joi.object().required().messages({
    "object.base": "Form data must be an object",
    "any.required": "Form data is required",
  }),
});

export const generateDashboardSchema = Joi.object({
  model: Joi.string().valid("a", "b", "c").required().messages({
    "any.only": "Model must be one of 'a', 'b', or 'c'",
    "any.required": "Model is required",
    "string.empty": "Model is not allowed to be empty",
    "string.base": "Model must be a string",
  }),
});

export const updateProductStatusSchema = Joi.object({
  status: Joi.string().valid("draft", "completed").required().messages({
    "string.base": "Status must be a string",
    "string.empty": "Status is not allowed to be empty",
    "any.only": "Status must be either 'draft' or 'completed'",
    "any.required": "Status is required",
  }),
});

export const autoSaveFormDataSchema = Joi.object({
  section: Joi.string().trim().required().messages({
    "string.base": "Section must be a string",
    "string.empty": "Section is required",
    "any.required": "Section is required",
  }),

  form_data: Joi.object().required().messages({
    "object.base": "Form data must be an object",
    "any.required": "Form data is required",
  }),
});

export const fileShareSchema = Joi.object({
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

  permission: Joi.string().valid("view", "edit").required().messages({
    "any.only": "Permission must be one of view, or edit",
    "string.empty": "Permission is not allowed to be empty",
    "any.required": "Permission is required",
  }),
});

export const shareParamsSchema = Joi.object({
  shareId: Joi.number().integer().positive().required().messages({
    "number.base": "Shared file Id must be a number",
    "number.integer": "Shared file Id must be an integer",
    "number.positive": "Shared file Id must be a positive number",
    "any.required": "Shared file is required",
  }),
});

export const acceptInvitationQuerySchema = Joi.object({
  access_token: Joi.string().required().messages({
    "any.required": "Token is required",
    "string.empty": "Token is not allowed to be empty",
    "string.base": "Token must be a string",
  }),

  accepted: Joi.boolean().required().messages({
    "boolean.base": "Accepted must be a boolean value",
    "any.required": "Accepted is required",
  }),
});

export const updatePermissionSchema = Joi.object({
  permission: Joi.string().valid("view", "edit").required().messages({
    "any.only": "Permission must be one of view, or edit",
    "string.empty": "Permission is not allowed to be empty",
    "any.required": "Permission is required",
  }),
});

export const lockFileSchema = Joi.object({
  reason: Joi.string().required().messages({
    "string.empty": "Reason is not allowed to be empty",
    "any.required": "Reason is required",
  }),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).messages({
    "number.base": "Page must be a number",
    "number.integer": "Page must be an integer",
    "number.min": `Page must be at least {#limit}`,
  }),

  pageSize: Joi.number().integer().min(1).max(100).messages({
    "number.base": "Page size must be a number",
    "number.integer": "Page size must be an integer",
    "number.min": `Page size must be at least {#limit}`,
    "number.max": `Page size must be at most{#limit}`,
  }),
});

export const autoSaveSessionSchema = Joi.object({
  formData: Joi.object().required().messages({
    "object.base": "Form data must be an object",
    "any.required": "Form data is required",
  }),
});

export const saveSessionSchema = Joi.object({
  formData: Joi.object().required().messages({
    "object.base": "Form data must be an object",
    "any.required": "Form data is required",
  }),

  changelog: Joi.string().trim().required().messages({
    "string.base": "Changelog must be a string",
    "string.empty": "Changelog is required",
    "any.required": "Changelog is required",
  }),
});

export const restoreVersionSchema = Joi.object({
  reason: Joi.string().required().messages({
    "string.empty": "Reason is not allowed to be empty",
    "any.required": "Reason is required",
  }),
});
