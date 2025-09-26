import Joi from "joi";

export const updateRoleSchema = Joi.object({
  role: Joi.string().valid("viewer", "editor").required().messages({
    "any.only": "Role must be one of viewer, or editor",
    "string.empty": "Role is not allowed to be empty",
    "any.required": "Role is required",
  }),
});

export const companyIdParamsSchema = Joi.object({
  companyId: Joi.number().integer().positive().required().messages({
    "number.base": "Company Id must be a number",
    "number.integer": "Company Id must be an integer",
    "number.positive": "Company Id must be a positive number",
    "any.required": "Company Id is required",
  }),
});

export const userIdParamsSchema = Joi.object({
  userId: Joi.number().integer().positive().required().messages({
    "number.base": "User Id must be a number",
    "number.integer": "User Id must be an integer",
    "number.positive": "User Id must be a positive number",
    "any.required": "User Id is required",
  }),
});