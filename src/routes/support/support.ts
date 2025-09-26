import { Router } from "express";
import { createSupportTicket } from "../../controllers/support/support";
import { verifyJwt } from "../../middlewares/verifyJwt";
import { bodyValidator } from "../../middlewares/joiValidator";

const router = Router();

router.post(
  "/ticket",
  verifyJwt,
  bodyValidator("createSupportTicketSchema"),
  createSupportTicket
);

export default router;
