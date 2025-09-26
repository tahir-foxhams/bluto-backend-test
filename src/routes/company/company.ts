import { Router } from "express";
import {
  getAllCompanies,
  getAllUserOfCompany,
  getCompanyLimits,
  checkCompanyLimits,
  updateRoleOfUser,
  deleteCompanyUser,
} from "../../controllers/company/company";
import { verifyJwt } from "../../middlewares/verifyJwt";
import { bodyValidator, paramsValidator } from "../../middlewares/joiValidator";

const router = Router();

router.get("/all", verifyJwt, getAllCompanies);

router.get("/users/all", verifyJwt, getAllUserOfCompany);

router.get("/limits", verifyJwt, getCompanyLimits);

router.get("/limits/checks", verifyJwt, checkCompanyLimits);

router.put(
  "/:userId/role",
  verifyJwt,
  paramsValidator("userIdParamsSchema"),
  bodyValidator("updateRoleSchema"),
  updateRoleOfUser
);

router.delete(
  "/users/:userId",
  verifyJwt,
  paramsValidator("userIdParamsSchema"),
  deleteCompanyUser
);

export default router;
