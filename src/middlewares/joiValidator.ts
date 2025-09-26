import Joi from "joi";
import { ParsedQs } from "qs";
import { Request, Response, NextFunction } from "express";
import Validators from "../schema/joi/index";

type Validator = keyof typeof Validators;

const _validate = async (
  data: unknown,
  validator: Validator
): Promise<unknown> => {
  try {
    let schema = Validators[validator];
    const validated = await schema.validateAsync(data, { abortEarly: false });
    return validated;
  } catch (err: unknown) {
    if (err instanceof Joi.ValidationError) {
      const errors = err.details.reduce(
        (acc: Record<string, string[]>, detail) => {
          const key = detail.path[0]?.toString() ?? "unknown";
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(detail.message);
          return acc;
        },
        {}
      );

      throw { status: 400, message: "Invalid format", error: errors };
    }

    throw {
      status: 500,
      message: "Internal server error",
      error: err instanceof Error ? err.message : err,
    };
  }
};

const bodyValidator = (validator: Validator) => {
  if (!Validators?.hasOwnProperty(validator)) {
    throw new Error(`'${validator}' validator doesn't exist`);
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await _validate(req.body, validator);
      next();
    } catch (error: unknown) {
      const status =
        typeof error === "object" && error && "status" in error
          ? (error as any).status
          : 500;
      const message =
        typeof error === "object" && error && "message" in error
          ? (error as any).message
          : "Unexpected error";
      const err =
        typeof error === "object" && error && "error" in error
          ? (error as any).error
          : error;

      return res.status(status).json({
        message,
        error: err,
        response: null,
      });
    }
  };
};

const queryValidator = (validator: Validator) => {
  if (!Validators?.hasOwnProperty(validator)) {
    throw new Error(`'${validator}' validator doesn't exist`);
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.query.email && typeof req.query.email === "string") {
        req.query.email = req.query.email.replace(/ /g, "+");
      }
      if (req.query.old_email && typeof req.query.old_email === "string") {
        req.query.old_email = req.query.old_email.replace(/ /g, "+");
      }
      req.query = await _validate(req.query, validator) as ParsedQs;
      next();
    } catch (error: unknown) {
      const status =
        typeof error === "object" && error && "status" in error
          ? (error as any).status
          : 500;
      const message =
        typeof error === "object" && error && "message" in error
          ? (error as any).message
          : "Unexpected error";
      const err =
        typeof error === "object" && error && "error" in error
          ? (error as any).error
          : error;

      return res.status(status).json({
        message,
        error: err,
        response: null,
      });
    }
  };
};

const paramsValidator = (validator: Validator) => {
  if (!Validators?.hasOwnProperty(validator)) {
    throw new Error(`'${validator}' validator doesn't exist`);
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = (await _validate(req.params, validator)) as typeof req.params;
      next();
    } catch (error: unknown) {
      const status =
        typeof error === "object" && error && "status" in error
          ? (error as any).status
          : 500;
      const message =
        typeof error === "object" && error && "message" in error
          ? (error as any).message
          : "Unexpected error";
      const err =
        typeof error === "object" && error && "error" in error
          ? (error as any).error
          : error;

      return res.status(status).json({
        message,
        error: err,
        response: null,
      });
    }
  };
};

export { bodyValidator, queryValidator, paramsValidator };
