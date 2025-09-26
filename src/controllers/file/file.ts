import { Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid';
import productQueries from "../../queries/file/file";
import userQueries from "../../queries/auth/user";
import { ProductInstance } from "../../interfaces/file";
import { financialResponseA, financialResponseB, financialResponseC } from './financialResponses';
import { checkCanCreateModel, checkCanInvite, checkCanRestoreModel } from "../../utils/userLimits";
import { configs } from "../../config/config";
import { emailConfigs } from "../../config/email-config";
import { sendMail } from "../../utils/sendMail";

type FormConfig = {
  sections?: Record<string, any>;
};

const generateUniqueInstanceId = async (): Promise<string> => {
  const instanceId = uuidv4();
  const existing = await productQueries.getProductInstanceById(instanceId);

  if (existing) {
    return await generateUniqueInstanceId();
  }

  return instanceId;
};


export const createProduct = async (req: Request, res: Response) => {
  try {
    const { product_type_id, title, description = "" } = req.body;
    const userId = parseInt(req.decoded.userId as string);
    const companyId = parseInt(req.decoded.companyId as string);

    const result = await checkCanCreateModel(companyId);
    if (!result.can_create) {
      return res.status(403).json({
        message: result.message,
        response: null,
        error: result,
      });
    };

    const userDefaultCompany = await productQueries.getUserDefaultCompany(userId);
    if (!userDefaultCompany) {
      return res.status(403).json({
        message: "You do not have access to any company",
        response: null,
        error: "User is not associated with any company",
      });
    }

    const productType = await productQueries.getProductType(product_type_id);
    if (!productType) {
      return res.status(404).json({
        message: "Product type not found",
        response: null,
        error: "Product type not found",
      });
    }

    const formConfig = productType.form_config as FormConfig;
    const validSections = Object.keys(formConfig.sections ?? {});

    const currentDate = new Date();
    const instanceId = await generateUniqueInstanceId();
    const createProduct = await productQueries.createProduct(
      instanceId, 
      product_type_id,
      userDefaultCompany.default_company_id,
      userId,
      userId,
      title || `New ${productType.name}`,
      description,
      "draft",
      result.models_active,
      currentDate,
      currentDate
    );

    const createVersion = await productQueries.createVersion(
      createProduct.instance_id,
      1,
      userId,
      currentDate
    );

    await productQueries.updateFileVersion(
      createVersion.version_id,
      createProduct.instance_id
    );

    await updateCompletedSections(
      createProduct.instance_id,
      validSections
    );
    const data = {
      instanceId: createProduct.instance_id,
    };
    return res.status(201).json({
      message: "File created successfully",
      response: { data },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const getAllProducts = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { status, page, limit } = req.query;

    // Default values for empty or null query params
    const safeStatus = status && status !== "" ? status : "all";
    const safePage = page && !isNaN(Number(page)) ? Number(page) : 1;
    const safeLimit = limit && !isNaN(Number(limit)) ? Number(limit) : 20;

    let sortByField = null;
    let sortDirection = null;

    sortByField = req.query.sort_by;
    sortDirection = req.query.sort_direction;

    if (sortByField === "file_name") {
      if (!sortDirection) {
        sortDirection = "asc";
      }
      sortByField = "title";
    }

    if (sortByField === "last_modified") {
      if (!sortDirection) {
        sortDirection = "desc";
      }
      sortByField = "updated_at";
    }
    if (!sortByField) {
      sortByField = "updated_at";
    }
    if (!sortDirection) {
      sortDirection = "desc";
    }
    const userId = parseInt(req.decoded.userId as string);
    const userDefaultCompany = await productQueries.getUserDefaultCompany(
      userId
    );
    if (!userDefaultCompany) {
      return res.status(403).json({
        message: "You do not have access to any company",
        response: null,
        error: "User is not associated with any company",
      });
    }

    const offset = (safePage - 1) * safeLimit;

    const whereClause =
      safeStatus !== "all"
        ? { status: safeStatus }
        : { status: { not: "archived" } };

    const [totalCount, productInstances] = await Promise.all([
      productQueries.getTotalProductsCount(
        whereClause,
        userDefaultCompany.default_company_id
      ),
      productQueries.getProductInstances(
        whereClause,
        sortByField as string,
        sortDirection as string,
        offset,
        safeLimit,
        userDefaultCompany.default_company_id
      ),
    ]);

    const files = productInstances.map((file: ProductInstance) => ({
      instance_id: file.instance_id,
      title: file.title,
      status: file.status,
      completion_percentage:
        file.status === "draft" ? file.completion_percentage : 100,
      created_at: file.created_at,
      last_modified_at: file.last_modified_at,
      updated_at: file.updated_at,
      created_by: {
        user_id: file.creator.user_id,
        full_name: file.creator.full_name,
        profile_picture_url: file.creator.profile_picture_url,
      },
      shared_count: file.SharedProducts?.length || 0,
      thumbnail_url: `/api/thumbnails/${file.instance_id}`,
    }));

    return res.status(200).json({
      message: "Files retrieved successfully",
      response: {
        data: files,
        pagination: {
          total: totalCount,
          page: safePage,
          limit: safeLimit,
          pages: Math.ceil(totalCount / safeLimit),
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const updateProductStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    const userId = Number(req.decoded.userId);

    const product = await productQueries.getProductInstanceById(id);
    if (!product) {
      return res.status(404).json({
        message: "File not found",
        response: null,
        error: "File not found",
      });
    }

    // Ensure user has access (same company)
    const userDefaultCompany = await productQueries.getUserDefaultCompany(userId);
    if (!userDefaultCompany || product.company_id !== userDefaultCompany.default_company_id) {
      return res.status(403).json({
        message: "Access denied",
        response: null,
        error: "User is not authorized",
      });
    }
    if(product.is_locked){
      return res.status(403).json({
        message: "Cannot edit locked file",
        response: null,
        error: "Cannot edit locked file",
      });
    }

    if (status === "completed") {
      const sectionsCompleted = product?.sections_completed || {};
      const allComplete = Object.values(sectionsCompleted).every(Boolean);

      if (!allComplete) {
        return res.status(400).json({
          message: "Cannot mark as completed - some sections are incomplete",
          response: sectionsCompleted,
          error: "Incomplete sections",
        });
      }
    }

    const updated = await productQueries.updateProductStatus(
      status,
      id,
      userId,
      new Date()
    );

    if (!updated) {
      return res.status(400).json({
        message: "Product status update failed",
        response: null,
        error: "Status unchanged or product missing",
      });
    }

    return res.status(200).json({
      message: `File status updated to '${status}' successfully`,
      response: null,
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const getProduct = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    const userId = parseInt(req.decoded.userId as string);

    const userDefaultCompany = await productQueries.getUserDefaultCompany(userId);
    if (!userDefaultCompany) {
      return res.status(403).json({
        message: "You do not have access to any company",
        response: null,
        error: "User is not associated with any company",
      });
    }

    const product = await productQueries.getProductInstanceById(id);
    if (!product) {
      return res.status(404).json({
        message: "File not found",
        response: null,
        error: "File not found",
      });
    }

    if (!userDefaultCompany || product.company_id !== userDefaultCompany.default_company_id) {
      return res.status(403).json({
        message: "Access denied",
        response: null,
        error: "User is not authorized",
      });
    }

    const formData = await productQueries.getAllFormSectionById(id);

    const formDataBySections: { [key: string]: any } = {};

    formData.forEach((section: any) => {
      formDataBySections[section.section_name] = section.form_data;
    });

    const productType = await productQueries.getProductType(
      product.product_type_id
    );
    if (!productType) {
      return res.status(404).json({
        message: "Product type not found",
        response: null,
        error: "Product type not found",
      });
    }

    // Track this file access in recent_accesses
    await productQueries.updateRecentAccess(userId, id, new Date());

    return res.status(200).json({
      message: "File retrieved successfully",
      response: {
        data: {
          file: product,
          form_data: formDataBySections,
          product_type: {
            name: productType.name,
            form_config: productType.form_config,
          },
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;

    const userId = parseInt(req.decoded.userId as string);
    const companyId = parseInt(req.decoded.companyId as string);

    const userDefaultCompany = await productQueries.getUserDefaultCompany(userId);
    if (!userDefaultCompany) {
      return res.status(403).json({
        message: "You do not have access to any company",
        response: null,
        error: "User is not associated with any company",
      });
    }

    const product = await productQueries.getProductInstanceById(id);
    if (!product) {
      return res.status(404).json({
        message: "File not found",
        response: null,
        error: "File not found",
      });
    }

    if (!userDefaultCompany || product.company_id !== userDefaultCompany.default_company_id) {
      return res.status(403).json({
        message: "Access denied",
        response: null,
        error: "User is not authorized",
      });
    }

    await productQueries.deleteProduct(id, userId, companyId);

    return res.status(200).json({
      message: "File deleted successfully",
      response: null,
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const userId = Number(req.decoded.userId as string);

    const product = await productQueries.getProductInstanceById(id);
    if (!product) {
      return res.status(404).json({
        message: "File not found",
        response: null,
        error: "File not found",
      });
    }

    const userDefaultCompany = await productQueries.getUserDefaultCompany(userId);
    if (!userDefaultCompany || product.company_id !== userDefaultCompany.default_company_id) {
      return res.status(403).json({
        message: "Access denied",
        response: null,
        error: "User not authorized to update this file",
      });
    }
    if(product.is_locked){
      return res.status(403).json({
        message: "Cannot edit locked file",
        response: null,
        error: "Cannot edit locked file",
      });
    }
    const currentDate = new Date();

    const updated = await productQueries.updateProductMetadata(
      id,
      title,
      description,
      currentDate
    );

    if (!updated) {
      return res.status(400).json({
        message: "Product status update failed",
        response: null,
        error: "Status unchanged or product missing",
      });
    }
    return res.status(200).json({
      message: "File updated successfully",
      response: null,
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const updateProductAutosave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { section, form_data } = req.body;
    const userId = parseInt(req.decoded.userId as string, 10);

    const userDefaultCompany = await productQueries.getUserDefaultCompany(userId);
    if (!userDefaultCompany) {
      return res.status(403).json({
        message: "You do not have access to any company",
        response: null,
        error: "User is not associated with any company",
      });
    }

    const product = await productQueries.getProductInstanceById(id);
    if (!product) {
      return res.status(404).json({
        message: "File not found",
        response: null,
        error: "File not found",
      });
    }

    if (product.company_id !== userDefaultCompany.default_company_id) {
      return res.status(403).json({
        message: "Access denied",
        response: null,
        error: "Access denied",
      });
    }
    if(product.is_locked){
      return res.status(403).json({
        message: "Cannot edit locked file",
        response: null,
        error: "Cannot edit locked file",
      });
    }

    const productType = await productQueries.getProductType(
      product.product_type_id
    );
    if (!productType) {
      return res.status(404).json({
        message: "Product type not found",
        response: null,
        error: "Product type not found",
      });
    }

    const formConfig = productType.form_config as FormConfig;
    const validSections = Object.keys(formConfig.sections ?? {});

    if (!validSections.includes(section)) {
      return res.status(400).json({
        message: `Invalid section: ${section}`,
        response: null,
        error: "Invalid section name provided",
      });
    }

    const currentDate = new Date();
    const record = await productQueries.createProductFormData(
      id,
      section,
      form_data,
      currentDate,
      currentDate
    );

    await productQueries.lastModifiedUserUpdate(
      id,
      userId,
      currentDate
    );

    await updateCompletedSections(id, validSections);

    return res.status(200).json({
      message: "Section auto saved successfully",
      response: null,
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const getProductFormData = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const rawSection = req.query?.section as string;
    const section = rawSection?.replace(/-/g, " ");

    const userId = parseInt(req.decoded.userId as string);

    const userDefaultCompany = await productQueries.getUserDefaultCompany(
      userId
    );
    if (!userDefaultCompany) {
      return res.status(403).json({
        message: "You do not have access to any company",
        response: null,
        error: "User is not associated with any company",
      });
    }

    const product = await productQueries.getProductInstanceById(id);
    if (!product) {
      return res.status(404).json({
        message: "File not found",
        response: null,
        error: "File not found",
      });
    }

    if (
      !userDefaultCompany ||
      product.company_id !== userDefaultCompany.default_company_id
    ) {
      return res.status(403).json({
        message: "Access denied",
        response: null,
        error: "User is not authorized",
      });
    }

    let message = "File sections retrieved successfully";
    let data = {};
    if (section) {
      const productType = await productQueries.getProductType(
        product.product_type_id
      );
      if (!productType) {
        return res.status(404).json({
          message: "Product type not found",
          response: null,
          error: "Product type not found",
        });
      }

      const formConfig = productType.form_config as FormConfig;
      const validSections = Object.keys(formConfig.sections ?? {});
      if (!validSections.includes(section)) {
        return res.status(400).json({
          message: `Invalid section: ${rawSection}`,
          response: null,
          error: "Invalid section name provided",
        });
      }

      const formData = await productQueries.getFormSectionByIdAndName(
        id,
        section
      );
      if (!formData) {
        return res.status(404).json({
          message: "Section not found",
          response: null,
          error: "Section not found",
        });
      }

      message = "File section retrieved successfully";
      data = {
        form_data: formData,
      };
    } else {
      const formData = await productQueries.getAllFormSectionById(id);
      data = {
        title: product.title,
        form_data: formData.length > 0 ? formData : null,
      };
    }

    await productQueries.updateRecentAccess(userId, id, new Date());
    return res.status(200).json({
      message,
      response: {
        data,
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const createProductFormData = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const rawSection = req.params.sectionName as string;
    const section = rawSection?.replace(/-/g, " ");
    const { form_data } = req.body;
    const userId = parseInt(req.decoded.userId as string, 10);

    const userDefaultCompany = await productQueries.getUserDefaultCompany(userId);
    if (!userDefaultCompany) {
      return res.status(403).json({
        message: "You do not have access to any company",
        response: null,
        error: "User is not associated with any company",
      });
    }

    const product = await productQueries.getProductInstanceById(id);
    if (!product) {
      return res.status(404).json({
        message: "File not found",
        response: null,
        error: "File not found",
      });
    }

    if (product.company_id !== userDefaultCompany.default_company_id) {
      return res.status(403).json({
        message: "Access denied",
        response: null,
        error: "Access denied",
      });
    }
    if(product.is_locked){
      return res.status(403).json({
        message: "Cannot edit locked file",
        response: null,
        error: "Cannot edit locked file",
      });
    }

    const productType = await productQueries.getProductType(
      product.product_type_id
    );
    if (!productType) {
      return res.status(404).json({
        message: "Product type not found",
        response: null,
        error: "Product type not found",
      });
    }

    const formConfig = productType.form_config as FormConfig;
    const validSections = Object.keys(formConfig.sections ?? {});

    if (!validSections.includes(section)) {
      return res.status(400).json({
        message: `Invalid section: ${rawSection}`,
        response: null,
        error: "Invalid section name provided",
      });
    }
    const currentDate = new Date();
    await productQueries.createProductFormData(
      id,
      section,
      form_data,
      currentDate,
      currentDate
    );

    await productQueries.lastModifiedUserUpdate(
      id,
      userId,
      currentDate
    );

    await updateCompletedSections(id, validSections);

    return res.status(200).json({
      message: "File section updated successfully",
      response: null,
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const generateDashboard = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { model } = req.body;

    const product = await productQueries.getProductInstanceById(id);
    if (!product) {
      return res.status(404).json({
        message: "File not found",
        response: null,
        error: "File not found",
      });
    }
    const userInputs = await productQueries.getFormAllSectionsData(id);

    const formData = {
      "version": "1.0.0",
      "timestamp": "2025-06-16T14:07:41.601Z",
      "company_info": {
        "name": "foxhams",
        "business_model": "b2b2c",
        "industry": "payment_processing",
        "stage": "building"
      },
      "user_inputs": {userInputs},
      "applied_defaults": {
        "revenue_recognition": "accrual",
        "payment_terms": "net_30",
        "contract_billing": "monthly",
        "collection_days": 35,
        "monthly_churn_rate": 5,
        "benefits_overhead": 30,
        "office_type": "hybrid",
        "infrastructure_scaling": "stepped",
        "opex_percentage": 20
      },
      "assumptions": [
        {
          "field": "revenue_recognition",
          "value": "accrual",
          "source": "industry_benchmark",
          "confidence": 0.8
        },
        {
          "field": "payment_terms",
          "value": "net_30",
          "source": "industry_benchmark",
          "confidence": 0.8
        },
        {
          "field": "contract_billing",
          "value": "monthly",
          "source": "industry_benchmark",
          "confidence": 0.8
        },
        {
          "field": "collection_days",
          "value": 35,
          "source": "industry_benchmark",
          "confidence": 0.8
        },
        {
          "field": "monthly_churn_rate",
          "value": 5,
          "source": "industry_benchmark",
          "confidence": 0.8
        },
        {
          "field": "benefits_overhead",
          "value": 30,
          "source": "industry_benchmark",
          "confidence": 0.8
        },
        {
          "field": "office_type",
          "value": "hybrid",
          "source": "industry_benchmark",
          "confidence": 0.8
        },
        {
          "field": "infrastructure_scaling",
          "value": "stepped",
          "source": "industry_benchmark",
          "confidence": 0.8
        },
        {
          "field": "opex_percentage",
          "value": 20,
          "source": "industry_benchmark",
          "confidence": 0.8
        }
      ],
      "metadata": {
        "form_completion_percentage": 69,
        "advanced_options_used": false,
        "industry_template": "b2b2c_payment_processing",
        "total_assumptions_applied": 9,
        "growth_modeling_template": "profitable_scaling"
      }
    };
    // send this form-data to python-api

    let apiResponse = null;
    if(model == "a"){
      apiResponse = financialResponseA
    } else if(model == "b"){
      apiResponse = financialResponseB
    } else {
      apiResponse = financialResponseC
    }


    const data = {
      data: apiResponse
    };

    return res.status(200).json({
      message: "Dashboard generated successfully",
      response: data,
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const sendInvitation = async (req: Request, res: Response) => {
  try {
    const instanceId = req.params.id;
    const { email, permission } = req.body;
    const { userId, companyId, email: userEmail } = req.decoded;

    const result = await checkCanInvite(instanceId, userId, permission, email);
    if (!result.can_invite) {
      const { status, ...payload } = result;
      return res.status(status).json({
        message: result.message,
        response: null,
        error: payload,
      });
    }

    const file = await productQueries.getProductInstanceById(instanceId);
    if (email === userEmail) {
      return res.status(400).json({
        message: "You cannot send an invitation to yourself",
        response: null,
        error: "You cannot send an invitation to yourself",
      });
    }

    const duplicateShare = await productQueries.checkDuplicateShare(
      instanceId,
      email
    );
    if (duplicateShare && duplicateShare.status !== "declined") {
      return res.status(400).json({
        message: "File already shared with this user",
        response: null,
        error: "File already shared with this user",
      });
    }

    const user = await productQueries.checkUser(email);
    const collaborator =
      user?.company_users?.find((u: any) => u.company_id === companyId) ?? null;

      
    const activeEditInvitations =
      await productQueries.findActiveEditInvitations(
        Number(userId),
        email,
      );

    let seatAdd = false;
    if (permission === "edit") {
      if (
        (!user || !collaborator || collaborator.role !== "editor") &&
        activeEditInvitations.length < 1
      ) {
        seatAdd = true;
      }
    }

    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const now = new Date();
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 14);
    const acceptInvitationUrl = `${configs.frontendBaseUrl}/shared-file?accepted=true&file_name=${file.title}&access_token=${token}`;
    const declineInvitationUrl = `${configs.frontendBaseUrl}/shared-file?accepted=false&file_name=${file.title}&access_token=${token}`;

    const sharedRow = await productQueries.sharedFile(
      instanceId,
      Number(userId),
      email,
      permission,
      token,
      tokenExpiry,
      now
    );

    if (seatAdd) {
      await productQueries.consumeSeat(companyId);
    }
    const role = permission === "edit" ? "editor" : "viewer";
    if (user) {
      if (!collaborator) {
        await userQueries.createCompanyUser(companyId, user.user_id, role);
      }

      if (
        collaborator &&
        collaborator.role !== "editor" &&
        permission === "edit"
      ) {
        await userQueries.updateCompanyUser(
          companyId,
          user.user_id,
          "editor"
        );
      }
    }

    const ownerName = await productQueries.getOwnerName(Number(userId));
    const dynamicData = {
      accept_url: acceptInvitationUrl,
      decline_url: declineInvitationUrl,
      invitation_expiry: _formatDate(tokenExpiry),
      owner_name: ownerName.full_name,
      permission: role,
      file_title: file.title,
      to_email: email,
    };
    await sendMail(emailConfigs.templates.fileSharedInvitation, dynamicData);

    return res.status(201).json({
      message: "File shared invitation sent successfully",
      response: {
        data: {
          share_id: sharedRow.share_id, // <--- here you return it
        }
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const resendInvitation = async (req: Request, res: Response) => {
  try {
    const shareId = Number(req.params.shareId);
    const userId = Number(req.decoded.userId);

    const shareFile = await productQueries.getSharedFile(shareId, userId);
    if (!shareFile) {
      return res.status(404).json({
        message: "Invitation not found",
        response: null,
        error: "Invitation not found",
      });
    }

    const sharedRecently =
      new Date().getTime() - new Date(shareFile.updated_at).getTime() <
      60 * 60 * 1000;
    if (sharedRecently) {
      return res.status(400).json({
        message:
          "You can resend this invitation once 1 hour has passed since the last time it was sent",
        response: null,
        error: "You can resend this invitation once 1 hour has passed since the last time it was sent",
      });
    }

    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const now = new Date();
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 14);

    const fileTitle = shareFile.product_instance?.title;
    const acceptInvitationUrl = `${configs.frontendBaseUrl}/shared-file?accepted=true&file_name=${fileTitle}&access_token=${token}`;
    const declineInvitationUrl = `${configs.frontendBaseUrl}/shared-file?accepted=false&file_name=${fileTitle}&access_token=${token}`;

    await productQueries.resendFileInvite(shareId, token, tokenExpiry, now);

    const ownerName = await productQueries.getOwnerName(Number(userId));
    const role = shareFile.permission === "edit" ? "editor" : "viewer";

    const dynamicData = {
      accept_url: acceptInvitationUrl,
      decline_url: declineInvitationUrl,
      invitation_expiry: _formatDate(tokenExpiry),
      owner_name: ownerName.full_name,
      permission: role,
      file_title: fileTitle,
      to_email: shareFile.shared_with_email,
    };
    await sendMail(emailConfigs.templates.fileSharedInvitation, dynamicData);

    return res.status(200).json({
      message: "File shared invitation resent successfully",
      response: null,
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const updateInvitationPermission = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId, companyId } = req.decoded;
    const shareId = Number(req.params.shareId);
    const { permission } = req.body;

    const shareFile = await productQueries.getSharedFileDetail(
      shareId,
      Number(userId)
    );
    if (!shareFile) {
      return res.status(404).json({
        message: "Invitation not found",
        response: null,
        error: "Invitation not found",
      });
    }
    if (permission === shareFile.permission) {
      return res.status(409).json({
        message: `User already has '${permission}' permission for this file`,
        response: null,
        error: `User already has '${permission}' permission for this file`,
      });
    }

    const user = await productQueries.checkUser(shareFile.shared_with_email);
    const collaborator =
      user?.company_users?.find((u: any) => u.company_id === companyId) ?? null;

    const activeEditInvitations =
      await productQueries.findActiveEditInvitations(
        Number(userId),
        shareFile.shared_with_email,
        shareId
      );

    let seatAdd = false;
    let seatRemove = false;
    if (permission === "edit") {
      if (
        (!user || !collaborator || collaborator.role !== "editor") &&
        activeEditInvitations.length < 1
      ) {
        seatAdd = true;
        const result = await checkCanInvite(
          shareFile.instance_id,
          userId,
          permission
        );
        if (!result.can_invite) {
          const { status, ...payload } = result;
          return res.status(status).json({
            message: result.message,
            response: null,
            error: payload,
          });
        }
      }
    } else if (permission === "view") {
      if (
        (!user || !collaborator || collaborator.role !== "editor") &&
        activeEditInvitations.length < 1
      ) {
        seatRemove = true;
      }
    }

    await productQueries.updateInvitationPermission(shareId, permission);

    if (seatAdd) {
      await productQueries.consumeSeat(companyId);
    } else if (seatRemove) {
      await productQueries.releaseSeat(companyId);
    }

    const role = permission === "edit" ? "editor" : "viewer";
    if (user) {
      if (!collaborator) {
        await userQueries.createCompanyUser(companyId, user.user_id, role);
      }
      if (
        collaborator &&
        collaborator.role !== "editor" &&
        permission === "edit"
      ) {
        await userQueries.updateCompanyUser(
          companyId,
          user.user_id,
          "editor"
        );
      }
    }

    const data = {
      share_id: shareId,
      user_id: user ? user.user_id : null,
      old_permission: shareFile.permission,
      new_permission: permission,
      seat_released: seatRemove,
      seat_added: seatAdd,
    };

    return res.status(200).json({
      message: "Share permission updated successfully",
      response: {
        data: data,
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const { accepted, access_token } = req.query;
    const share = await productQueries.getSharedFileByToken(
      access_token as string
    );
    if (!share) {
      return res.status(400).json({
        message: "Invalid token or expired",
        response: null,
        error: "Invalid token or expired",
      });
    }

    const newStatus = accepted ? "accepted" : "declined";
    const updateStatus = await productQueries.updateInvitationStatus(
      share.share_id,
      newStatus,
      new Date()
    );

    const ownerCompany = updateStatus?.sharedBy?.default_company_id;
    const user = await productQueries.checkUser(updateStatus.shared_with_email);
    const collaborator =
      user?.company_users?.find((u: any) => u.company_id === ownerCompany) ??
      null;

    if (!accepted) {
      const activeEditInvitations =
        await productQueries.findActiveEditInvitations(
          share.shared_by,
          share.shared_with_email,
          share.share_id
        );
      if (
        (!user || !collaborator || collaborator.role !== "editor") &&
        updateStatus.permission === "edit" &&
        activeEditInvitations.length < 1
      ) {
        await productQueries.releaseSeat(ownerCompany);
      }
    }

    return res.status(200).json({
      message: `File invitation ${newStatus} successfully`,
      response: null,
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const getSharedFilesInvitations = async (req: Request, res: Response) => {
  try {
    const { userId } = req.decoded;

    const result = await productQueries.getSharedFilesInvitations(Number(userId));
    if (result.length < 1) {
      return res.status(404).json({
        message: "File share invitations not found",
        response: null,
        error: "File share invitations not found",
      });
    }

    const sharedProduct = result.map((item) => ({
      share_id: item.share_id,
      title: item.product_instance?.title,
      shared_with_email: item.shared_with_email,
      permission: item.permission,
      status: item.status,
      invitation_time: item.updated_at,
    }));

    return res.status(200).json({
      message: "File share invitations retrieved successfully",
      response: {
        data : sharedProduct,
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const getSharedFilesWithMe = async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const { userId, email } = req.decoded;

    const userCompany = await productQueries.getUserCompanyAccess(companyId, Number(userId))
    if (!userCompany) {
      return res.status(403).json({
        message: "You are not associated with the given company",
        response: null,
        error: "You are not associated with the given company",
      });
    }
    const ownerId = userCompany.company.users[0].user_id;

    const result = await productQueries.getSharedFilesWithMe(email, ownerId);
    if (result.length < 1) {
      return res.status(404).json({
        message: "No shared files found for the given company",
        response: null,
        error: "No shared files found for the given company",
      });
    }

    const sharedProduct = result.map((item) => ({
      share_id: item.share_id,
      instance_id: item.product_instance?.instance_id,
      title: item.product_instance?.title,
      shared_by: item.sharedBy.full_name,
      shared_by_company_id: item.sharedBy.default_company_id,
      permission: item.permission,
      accepted_time: item.accepted_at,
    }));

    return res.status(200).json({
      message: "Shared files retrieved successfully",
      response: {
        data : sharedProduct,
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const getFileCollaborators = async (req: Request, res: Response) => {
  try {
    const instanceId = req.params.id;
    const { companyId } = req.decoded;

    const file = await productQueries.getProductInstanceById(instanceId);
    if (!file) {
      return res.status(404).json({
        message: "File not found",
        response: null,
        error: "File not found",
      });
    };
    if (file.company_id !== companyId) {
      return res.status(403).json({
        message: "Access denied",
        response: null,
        error: "Access denied",
      });
    };

    const sharedFile = await productQueries.getSharedFiles(instanceId);
    if (sharedFile.length < 1) {
      return res.status(404).json({
        message: "No collaborators found for this file",
        response: null,
        error: "No collaborators found for this file",
      });
    }
    const users = (
      await Promise.all(
        sharedFile.map(async (sf) => {
          let user = {};
          const result = await productQueries.getUserDetails(sf.shared_with_email);
          if (!result) {
            user = {
              share_id: sf.share_id,
              user_id: null,
              full_name: null,
              email: sf.shared_with_email,
              avatar_url: null,
              permission: sf.permission,
              role: null,
              status: sf.status,
            }  
          } else {
            const userRole = await productQueries.getUserCompanyRole(result.user_id, companyId);
            user = {
              share_id: sf.share_id,
              user_id: result.user_id,
              full_name: result.full_name,
              email: result.email,
              avatar_url: result.profile_picture_url,
              permission: sf.permission,
              role: userRole ? userRole.role : null,
              status: sf.status,
            }  
          }
          return user;
        })
      )
    ).filter(Boolean);

    const data = {
      file_id: instanceId,
      file_name: file.title,
      users: users,
      total: users.length,
    }

    return res.status(200).json({
      message: "File users retrieved successfully",
      response: {
        data: data,
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const deleteInvitation = async (req: Request, res: Response) => {
  try {
    const { userId, companyId } = req.decoded;
    const shareId = Number(req.params.shareId);

    const shareFile = await productQueries.getSharedFileDetail(
      shareId,
      Number(userId)
    );
    if (!shareFile) {
      return res.status(404).json({
        message: "Invitation not found",
        response: null,
        error: "Invitation not found",
      });
    }

    let seatReleased = false;
    const user = await productQueries.checkUser(shareFile.shared_with_email);
    const collaborator =
      user?.company_users?.find((u: any) => u.company_id === companyId) ?? null;
    const activeEditInvitations =
      await productQueries.findActiveEditInvitations(
        Number(userId),
        shareFile.shared_with_email,
        shareId
      );

    if (
      (!user || !collaborator || collaborator.role !== "editor") &&
      shareFile.permission === "edit" &&
      activeEditInvitations.length < 1
    ) {
      seatReleased = true;
      await productQueries.releaseSeat(companyId);
    }

    await productQueries.deleteInvitation(shareId);

    const data = {
      share_id: shareId,
      user_id: user?.user_id || null,
      email: shareFile.shared_with_email,
      seat_released: seatReleased,
      files_affected: 1,
    }

    return res.status(200).json({
      message: "User access removed successfully",
      response: {
        data: data
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const lockFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = parseInt(req.decoded.userId as string);
    const companyId = parseInt(req.decoded.companyId as string);

    if (!companyId) {
      return res.status(403).json({
        message: "You do not have access to any company",
        response: null,
        error: "User is not associated with any company",
      });
    }

    const file = await productQueries.getProductInstanceById(id);
    if (!file) {
      return res.status(404).json({
        message: "File not found",
        response: null,
        error: "File not found",
      });
    }
    if (!companyId || file.company_id !== companyId) {
      return res.status(403).json({
        message: "Access denied",
        response: null,
        error: "Only workspace owner can lock files",
      });
    }
    if (file.is_locked) {
      return res.status(409).json({
        message: "File is already locked",
        response: null,
        error: "File is already locked",
      });
    }

    const lockData = await productQueries.lockFile(id, userId, reason);

    return res.status(200).json({
      message: "File locked successfully",
      response: {
        data: {
          instance_id: lockData.instance_id,
          locked_at: lockData.locked_at,
          locked_by: lockData.locked_by,
          locked_reason: lockData.locked_reason,
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const unlockFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = parseInt(req.decoded.companyId as string);

    if (!companyId) {
      return res.status(403).json({
        message: "You do not have access to any company",
        response: null,
        error: "User is not associated with any company",
      });
    }

    const file = await productQueries.getProductInstanceById(id);
    if (!file) {
      return res.status(404).json({
        message: "File not found",
        response: null,
        error: "File not found",
      });
    }
    if (!companyId || file.company_id !== companyId) {
      return res.status(403).json({
        message: "Access denied",
        response: null,
        error: "Only workspace owner can unlock files",
      });
    }
    if (!file.is_locked) {
      return res.status(409).json({
        message: "File is already unlocked",
        response: null,
        error: "File is already unlocked",
      });
    }

    await productQueries.unlockFile(id);

    return res.status(200).json({
      message: "File unlocked successfully",
      response: null,
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const cloneFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(req.decoded.userId as string);
    const companyId = parseInt(req.decoded.companyId as string);

    if (!companyId) {
      return res.status(403).json({
        message: "You do not have access to any company",
        response: null,
        error: "User is not associated with any company",
      });
    }

    const file = await productQueries.getProductInstanceById(id);
    if (!file) {
      return res.status(404).json({
        message: "File not found",
        response: null,
        error: "File not found",
      });
    }

    if (!companyId || file.company_id !== companyId) {
      return res.status(403).json({
        message: "Access denied",
        response: null,
        error: "Only workspace owner can clone the files",
      });
    }

    const result = await checkCanCreateModel(companyId);
    if (!result.can_create) {
      return res.status(403).json({
        message: result.message,
        response: null,
        error: result,
      });
    }

    const instanceId = await generateUniqueInstanceId();
    const cloneData = await productQueries.cloneFile(
      id,
      instanceId,
      companyId,
      userId
    );

    return res.status(200).json({
      message: "File cloned successfully",
      response: {
        data: {
          original_id: id,
          new_instance_id: cloneData.instance_id,
          title: cloneData.title,
          created_at: cloneData.created_at,
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const listArchivedFile = async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.decoded.companyId as string);
    const archivedFiles = await productQueries.listArchivedFile(companyId);

    const data = {
      archived_files: archivedFiles,
      can_restore: true,
      requires_plan: archivedFiles[0]?.was_from_plan || null,
      total: archivedFiles.length,
    }

    return res.status(200).json({
      message: "Archived files retrieved successfully",
      response: {
        data: data,
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const restoreFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = parseInt(req.decoded.companyId as string);

    if (!companyId) {
      return res.status(403).json({
        message: "You do not have access to any company",
        response: null,
        error: "User is not associated with any company",
      });
    }

    const file = await productQueries.getProductInstanceById(id);
    if (!file) {
      return res.status(404).json({
        message: "File not found",
        response: null,
        error: "File not found",
      });
    }
    if (!companyId || file.company_id !== companyId) {
      return res.status(403).json({
        message: "Access denied",
        response: null,
        error: "Only workspace owner can restore files",
      });
    }
    if (!file.is_archived) {
      return res.status(403).json({
        message: "File is not archived",
        response: null,
        error: "File is not archived",
      });
    }

    const result = await checkCanRestoreModel(companyId);
    if (!result.can_create) {
      return res.status(403).json({
        message: result.message,
        response: null,
        error: result,
      });
    }

    const now = new Date();
    await productQueries.restoreFile(companyId, id, now);

    return res.status(200).json({
      message: "File restored successfully",
      response: {
        data: {
          instance_id: id,
          title: file.title,
          restored_at: now,
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const getFileAccessStatus = async (req: Request, res: Response) => {
  try {
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
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const getFileEditors = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({
      message: "Active editors retrieved successfully",
      response: {
        data: {
          active_editors: [
            {
              user_id: 2,
              full_name: "Sarah Chen",
              email: "sarah@example.com",
              avatar:
                "https://ui-avatars.com/api/?name=Sarah+Chen&background=0958d9&color=fff",
              started_at: "2025-01-15T10:30:00Z",
              last_activity: "2025-01-15T10:45:30Z",
              session_id: "session-abc-456",
            },
            {
              user_id: 3,
              full_name: "Tom Wilson",
              email: "tom@example.com",
              avatar: null,
              started_at: "2025-01-15T10:35:00Z",
              last_activity: "2025-01-15T10:46:00Z",
              session_id: "session-def-789",
            },
          ],
          count: 2,
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const startEditSession = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({
      message: "Edit session started successfully",
      response: {
        data: {
          session: {
            session_id: "session-xyz-890",
            instance_id: 123,
            user_id: 1,
            user_name: "John Doe",
            started_at: "2025-01-15T11:00:00Z",
            last_activity: "2025-01-15T11:00:00Z",
            is_active: true,
            has_unsaved_changes: false,
            base_version_id: 5,
          },
          form_data: {
            model_name: "Q1 Financial Forecast",
            revenue: 250000,
            costs: 180000,
            growth_rate: 15,
            notes: "Initial projections based on current pipeline",
          },
          active_editors: [
            {
              user_id: 2,
              full_name: "Sarah Chen",
              email: "sarah@example.com",
              started_at: "2025-01-15T10:30:00Z",
              session_id: "session-abc-456",
            },
          ],
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const autoSaveEditSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { formData } = req.body;
    return res.status(200).json({
      message: "Draft saved successfully",
      response: {
        data: {
          saved_at: "2025-01-15T11:05:30Z",
          session_id: "session-xyz-890",
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const saveEditSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { formData, changelog } = req.body;
    return res.status(200).json({
      message: "Version saved successfully",
      response: {
        data: {
          version: {
            version_id: 6,
            version_number: 6,
            created_by: {
              user_id: 1,
              full_name: "John Doe",
              email: "john@example.com",
            },
            created_at: "2025-01-15T11:10:00Z",
            changelog: "Updated revenue projections based on new contracts",
            is_current: true,
            engine_status: "processing",
          },
          had_conflict: false,
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const discardSession = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({
      message: "Changes discarded successfully",
      response: {
        data: {
          session_id: "session-xyz-890",
          discarded_at: "2025-01-15T11:15:00Z",
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const getVersionHistory = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({
      message: "Version history retrieved successfully",
      response: {
        data: {
          versions: [
            {
              version_id: 5,
              version_number: 5,
              created_by: {
                user_id: 1,
                full_name: "John Owner",
                email: "john@example.com",
              },
              created_at: "2025-01-15T09:00:00Z",
              changelog: "Updated growth projections",
              is_current: true,
              engine_status: "completed",
              form_data: {
                revenue: 280000,
                costs: 190000,
                growth_rate: 18,
              },
            },
            {
              version_id: 4,
              version_number: 4,
              created_by: {
                user_id: 2,
                full_name: "Sarah Editor",
                email: "sarah@example.com",
              },
              created_at: "2025-01-15T08:00:00Z",
              changelog: "Adjusted cost assumptions",
              is_current: false,
              engine_status: "completed",
            },
            {
              version_id: 3,
              version_number: 3,
              created_by: {
                user_id: 1,
                full_name: "John Owner",
                email: "john@example.com",
              },
              created_at: "2025-01-14T16:00:00Z",
              changelog: "Initial model creation",
              is_current: false,
              engine_status: "completed",
            },
          ],
          total_count: 5,
          active_editors: [],
          can_restore: true,
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

export const versionRestore = async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    return res.status(200).json({
      message: "Version restored successfully",
      response: {
        data: {
          new_version: {
            version_id: 8,
            version_number: 8,
            created_by: {
              user_id: 1,
              full_name: "John Owner",
              email: "john@example.com",
            },
            created_at: "2025-01-15T11:30:00Z",
            changelog:
              "Restored from version 5: Reverting to stable version before changes",
            is_current: true,
            engine_status: "completed",
            restored_from_version_id: 5,
          },
        },
      },
      error: null,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(500).json({
      message: errorMessage,
      response: null,
      error: errorMessage,
    });
  }
};

async function updateCompletedSections(
  fileId: string,
  allSections: string[]
): Promise<Record<string, boolean>> {
  try {
    const formData = await productQueries.getAllFormSectionById(fileId);
    let completedSections = 0;
    const sectionsCompleted: Record<string, boolean> = {}; // Define type here

    allSections.forEach((section) => {
      const sectionData = formData.find(
        (fd: any) => fd.section_name === section
      );

      const isComplete =
        sectionData && isSectionComplete(sectionData.form_data);
      if (isComplete) {
        completedSections++;
        sectionsCompleted[section] = isComplete;
      } else {
        sectionsCompleted[section] = false;
      }
    });

    const percentage = Math.round(
      (completedSections / Object.keys(allSections).length) * 100
    );

    await productQueries.lastAutosaveFileUpdate(
      fileId,
      sectionsCompleted,
      new Date(),
      percentage
    );

    return sectionsCompleted;
  } catch (error) {
    console.error("Error updating completed sections:", error);
    throw error;
  }
}

function isSectionComplete(formData: any): boolean {
  return formData && Object.keys(formData).length > 0;
}

function _formatDate(date: Date) {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}
