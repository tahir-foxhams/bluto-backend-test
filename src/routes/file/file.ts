import { Router } from "express";
import {
  createProduct,
  getAllProducts,
  updateProduct,
  updateProductAutosave,
  updateProductStatus,
  getProduct,
  deleteProduct,
  getProductFormData,
  createProductFormData,
  generateDashboard,
  sendInvitation,
  resendInvitation,
  updateInvitationPermission,
  acceptInvitation,
  getSharedFilesInvitations,
  getSharedFilesWithMe,
  getFileCollaborators,
  deleteInvitation,
  lockFile,
  unlockFile,
  cloneFile,
  listArchivedFile,
  restoreFile,
  getFileEditors,
  startEditSession,
  autoSaveEditSession,
  saveEditSession,
  discardSession,
  getVersionHistory,
  versionRestore,
} from "../../controllers/file/file";
import { verifyJwt } from "../../middlewares/verifyJwt";
import {
  bodyValidator,
  paramsValidator,
  queryValidator,
} from "../../middlewares/joiValidator";

const router = Router();

router.post(
  "/",
  verifyJwt,
  bodyValidator("createProductSchema"),
  createProduct
);

router.get(
  "/",
  verifyJwt,
  queryValidator("getProductInstancesSchema"),
  getAllProducts
);

router.put(
  "/:id/status",
  verifyJwt,
  bodyValidator("updateProductStatusSchema"),
  updateProductStatus
);

router.get("/:id", verifyJwt, getProduct);

router.delete("/:id", verifyJwt, deleteProduct);

router.put(
  "/:id",
  verifyJwt,
  bodyValidator("updateProductSchema"),
  updateProduct
);

router.post(
  "/:id/autosave",
  verifyJwt,
  bodyValidator("autoSaveFormDataSchema"),
  updateProductAutosave
);

router.get(
  "/:id/sections",
  verifyJwt,
  queryValidator("getProductFormDataQuerySchema"),
  getProductFormData
);

router.post(
  "/:id/sections/:sectionName",
  verifyJwt,
  bodyValidator("createProductFormDataSchema"),
  createProductFormData
);

router.post(
  "/:id/generate-dashboard",
  verifyJwt,
  bodyValidator("generateDashboardSchema"),
  generateDashboard
);

router.post(
  "/:id/share",
  verifyJwt,
  bodyValidator("fileShareSchema"),
  sendInvitation
);

router.post(
  "/share/:shareId/resend",
  verifyJwt,
  paramsValidator("shareParamsSchema"),
  resendInvitation
);

router.put(
  "/share/:shareId",
  verifyJwt,
  paramsValidator("shareParamsSchema"),
  bodyValidator("updatePermissionSchema"),
  updateInvitationPermission
);

router.post(
  "/share",
  queryValidator("acceptInvitationQuerySchema"),
  acceptInvitation
);

router.get("/share/invitations", verifyJwt, getSharedFilesInvitations);

router.get(
  "/companies/:companyId/shared-with-me",
  verifyJwt,
  paramsValidator("companyIdParamsSchema"),
  getSharedFilesWithMe
);

router.get("/:id/users", verifyJwt, getFileCollaborators);

router.delete(
  "/share/:shareId",
  verifyJwt,
  paramsValidator("shareParamsSchema"),
  deleteInvitation
);

router.post("/:id/lock", verifyJwt, bodyValidator("lockFileSchema"), lockFile);

router.post("/:id/unlock", verifyJwt, unlockFile);

router.post("/:id/clone", verifyJwt, cloneFile);

router.get(
  "/archived/all",
  verifyJwt,
  queryValidator("paginationSchema"),
  listArchivedFile
);

router.post("/archived/:id/restore", verifyJwt, restoreFile);

router.get("/:id/access", verifyJwt, (req, res) => {
  return res.status(200).json({
    message: "File access status retrieved successfully",
    response: {
      data: {
        instance_id: 22,
        user_id: 5,
        user_role: "owner",
        file_status: {
          is_locked: false,
          is_archived: false,
          locked_by: null,
          locked_reason: null,
          archive_delete_at: null,
        },
        permissions: {
          can_view: true,
          can_edit: true,
          can_share: true,
          can_lock: true,
          can_clone: true,
        },
        access_reason: "Full owner access",
      },
    },
    error: null,
  });
});


router.get("/:id/editors", verifyJwt, getFileEditors);

router.post("/:id/edit/start", verifyJwt, startEditSession);

router.post(
  "/:id/edit/session/:sessionId/autosave",
  verifyJwt,
  bodyValidator("autoSaveSessionSchema"),
  autoSaveEditSession
);

router.post(
  "/:id/edit/session/:sessionId/save",
  verifyJwt,
  bodyValidator("saveSessionSchema"),
  saveEditSession
);

router.post("/:id/edit/session/:sessionId/discard", verifyJwt, discardSession);

router.get("/:id/version", verifyJwt, getVersionHistory);

router.post(
  "/:id/version/:versionId/restore",
  verifyJwt,
  bodyValidator("restoreVersionSchema"),
  versionRestore
);

export default router;
