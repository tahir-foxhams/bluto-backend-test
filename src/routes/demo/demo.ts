import { Router } from "express";
import {
  createDemoRequest,
  validateBookingToken,
  calendlyWebhook,
} from "../../controllers/demo/demo";
import { bodyValidator } from "../../middlewares/joiValidator";

const router = Router();

router.post("/request", bodyValidator("createDemoRequestSchema"), createDemoRequest);

router.post(
  "/validate-booking-token",
  bodyValidator("validateBookingTokenSchema"),
  validateBookingToken
);

router.post("/webhook/calendly", calendlyWebhook);

export default router;
