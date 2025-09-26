import Joi from "joi";

export const subscriptionSchema = Joi.object({
  subscriptionType: Joi.string()
    .valid("founders_choice", "growth_engine")
    .required()
    .messages({
      "any.only": "Subscription type must be one of founders_choice, or growth_engine",
      "string.empty": "Subscription type is not allowed to be empty",
      "any.required": "Subscription type is required",
    }),
});

export const customCheckoutSchema = Joi.object({
  product_type: Joi.string()
    .valid("pitch_deck", "forecast", "complete")
    .required()
    .messages({
      "any.only": "Product type must be one of pitch_deck, forecast, or complete",
      "string.empty": "Product type is not allowed to be empty",
      "any.required": "Product type is required",
    }),
});
