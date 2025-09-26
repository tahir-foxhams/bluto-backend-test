import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import userQueries from "../queries/auth/user";
import { configs } from "../config/config";

const verifyToken =
  () => async (req: Request, res: Response, next: NextFunction) => {
    try {
      let token = req.headers.authorization;
      if (token) {
        if (token.startsWith("Bearer ")) {
          token = token.slice(7, token.length);
        }

        let decoded = jwt.verify(token, configs.jwtSecret!) as JwtPayload;
        if (!decoded.exp || Date.now() >= decoded.exp * 1000) {
          return res.status(401).json({
            error: "Access denied. Token has expired",
            response: null,
            message: "Access denied. Token has expired",
          });
        }

        const email = decoded.email;
        const userData = await userQueries.getUserByEmail(email);
        if (!userData) {
          return res.status(404).json({
            error: "Access denied. User not found",
            response: null,
            message: "Access denied. User not found",
          });
        }

        const userId = String(userData.user_id);
        const companyId = userData.companies.company_id;
        req.decoded = {
          ...decoded,
          userId,
          companyId,
        };
      } else {
        return res.status(401).json({
          error: "Access denied. Authorization token is missing",
          response: null,
          message: "Access denied. Authorization token is missing",
        });
      }
      next();
    } catch (error) {
      return res.status(401).json({
        error: error.message || error,
        response: null,
        message: "Authorization failed",
      });
    }
  };

export const verifyJwt = verifyToken();

const verifyTokenOptional =
  () => async (req: Request, res: Response, next: NextFunction) => {
    try {
      let token = req.headers.authorization;
      if (token) {
        if (token.startsWith("Bearer ")) {
          token = token.slice(7, token.length);
        }

        let decoded = jwt.verify(token, configs.jwtSecret!) as JwtPayload;

        const email = decoded.email;
        const userData = await userQueries.getUserByEmail(email);
        if (!userData) {
          return res.status(404).json({
            error: "Access denied. User not found",
            response: null,
            message: "Access denied. User not found",
          });
        }
        req.decoded = {
          email: userData.email,
        };
      } else {
        req.decoded = {
          email: null,
        };
      }
      next();
    } catch (error) {
      return res.status(401).json({
        error: error.message || error,
        response: null,
        message: "Authorization failed",
      });
    }
  };

export const verifyJwtOptional = verifyTokenOptional();
