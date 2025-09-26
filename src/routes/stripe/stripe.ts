import { Router } from "express";
import {
  subscriptionStatus,
  createSubscriptionCheckout,
  createCustomCheckout,
  createPortalSession,
} from "../../controllers/stripe/stripe";
import { verifyJwt, verifyJwtOptional } from "../../middlewares/verifyJwt";
import { bodyValidator } from "../../middlewares/joiValidator";

const router = Router();

router.get("/subscription-status", verifyJwt, subscriptionStatus);

router.post(
  "/create-subscription-checkout",
  verifyJwtOptional,
  bodyValidator("subscriptionSchema"),
  createSubscriptionCheckout
);

router.post(
  "/create-custom-checkout",
  verifyJwtOptional,
  bodyValidator("customCheckoutSchema"),
  createCustomCheckout
);

router.post("/create-portal-session", verifyJwt, createPortalSession);

export default router;
