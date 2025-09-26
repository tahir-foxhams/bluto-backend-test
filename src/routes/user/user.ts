import { Router } from "express";
import {
  getUserBillingInfo,
  canCreateModal,
  canInvite,
  hasFeatureAccess,
  getUserAllCompanies,
  renameCompany,
  getCompanyCollaborators,
} from "../../controllers/user/user";
import { verifyJwt } from "../../middlewares/verifyJwt";
import { bodyValidator, paramsValidator, queryValidator } from "../../middlewares/joiValidator";

const router = Router();

router.get("/billing-info", verifyJwt, getUserBillingInfo);

router.get("/can-create", verifyJwt, canCreateModal);

router.post(
  "/can-invite",
  verifyJwt,
  bodyValidator("canInviteSchema"),
  canInvite
);

router.get(
  "/features",
  verifyJwt,
  queryValidator("featureAccessSchema"),
  hasFeatureAccess
);

router.get("/companies", verifyJwt, getUserAllCompanies);

router.put(
  "/companies/rename",
  verifyJwt,
  bodyValidator("renameCompanySchema"),
  renameCompany
);

router.get(
  "/companies/collaborators",
  verifyJwt,
  queryValidator("paginationSchema"),
  getCompanyCollaborators
);

export default router;
