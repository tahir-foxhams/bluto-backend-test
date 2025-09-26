import { Request, Response, NextFunction } from "express";

export const validateFile = (isRequired: boolean) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file && isRequired) {
      return res.status(400).json({
        message: "File is required",
        response: null,
        error: "File is required",
      });
    }

    if ((req as any).fileValidationError) {
      return res.status(400).json({
        message: (req as any).fileValidationError,
        response: null,
        error: (req as any).fileValidationError,
      });
    }

    next();
  };
};