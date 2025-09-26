import prisma from "../../config/db";
import { User, ProductInstance } from "../../interfaces/file";

const getUserByEmail = async (email: string): Promise<User | null> => {
  return prisma.users.findUnique({
    where: { email },
    select: {
      user_id: true,
      email: true,
      email_verified: true,
    },
  });
};

const getTotalProductsCount = async (
  whereClause: Record<string, any>,
  companyId: number
): Promise<number> => {
  return prisma.product_instances.count({
    where: {
      ...whereClause,
      company_id: companyId,
      deleted_at: null,
    },
  });
};

const getProductInstances = async (
  whereClause: Record<string, any>,

  sortBy: string,
  sortDirection: string,
  offset: number,
  limit: number,
  companyId: number
): Promise<ProductInstance[]> => {
  return prisma.product_instances.findMany({
    where: {
      ...whereClause,
      company_id: companyId,
      deleted_at: null,
    },
    include: {
      creator: {
        select: {
          user_id: true,
          full_name: true,
          profile_picture_url: true,
        },
      },
    },
    orderBy: {
      [sortBy]: sortDirection,
    },
    skip: offset,
    take: limit,
  });
};

const createProduct = async (
  instanceId: string,
  productTypeId: number,
  companyId: number,
  createdBy: number,
  lastModifiedBy: number,
  title: string,
  description: string,
  status: string,
  modelCount: number,
  createdAt: Date,
  updatedAt: Date
) => {
  const [product] = await prisma.$transaction([
    prisma.product_instances.create({
      data: {
        instance_id: instanceId,
        title,
        description,
        product_type_id: productTypeId,
        company_id: companyId,
        created_by: createdBy,
        last_modified_by: lastModifiedBy,
        status,
        created_at: createdAt,
        updated_at: updatedAt,
      },
      select: {
        instance_id: true,
        title: true,
        description: true,
      },
    }),
    prisma.subscriptions.update({
      where: { company_id: companyId },
      data: {
        models_used: modelCount + 1,
      },
    }),
  ]);

  return {
    ...product,
  };
};

const createVersion = async (
  instanceId: string,
  versionNumber: number,
  createBy: number,
  createdAt: Date
) => {
  return prisma.product_versions.create({
    data: {
      instance_id: instanceId,
      version_number: versionNumber,
      created_by: createBy,
      created_at: createdAt,
    },
  });
};

const updateFileVersion = async (
  currentVersionId: number,
  instanceId: string
) => {
  return prisma.product_instances.update({
    where: {
      instance_id: instanceId,
    },
    data: {
      current_version_id: currentVersionId,
    },
  });
};

const getUserDefaultCompany = async (userId: number) => {
  return prisma.users.findUnique({
    where: { user_id: userId },
    select: {
      user_id: true,
      default_company_id: true,
    },
  });
};

const updateProductStatus = async (
  status: string,
  productId: string,
  userId: number,
  updatedAt: Date
) => {
  return prisma.product_instances.update({
    where: { instance_id: productId },
    data: {
      status,
      last_modified_by: userId,
      updated_at: updatedAt,
    },
  });
};

const getProductById = async (id: string) => {
  return prisma.product_instances.findUnique({
    where: { instance_id: id, deleted_at: null },
    select: {
      title: true,
    },
  });
};

const getProductType = async (id: number) => {
  return prisma.product_types.findUnique({
    where: { product_type_id: id },
    select: {
      product_type_id: true,
      name: true,
      form_config: true,
    },
  });
};

const getProductInstanceById = async (id: string) => {
  return prisma.product_instances.findUnique({
    where: { instance_id: id, deleted_at: null },
    select: {
      product_type_id: true,
      title: true,
      company_id: true,
      sections_completed: true,
      is_locked: true,
      is_archived: true,
    },
  });
};

const createProductFormData = async (
  instanceId: string,
  sectionName: string,
  formData: string,
  createdAt: Date,
  updatedAt: Date
) => {
  const record = await prisma.product_form_data.upsert({
    where: {
      instance_id_section_name: {
        instance_id: instanceId,
        section_name: sectionName,
      },
    },
    update: {
      form_data: formData,
      updated_at: updatedAt,
    },
    create: {
      instance_id: instanceId,
      section_name: sectionName,
      form_data: formData,
      created_at: createdAt,
      updated_at: updatedAt,
    },
  });

  return { record };
};

const lastModifiedUserUpdate = async (
  instanceId: string,
  userId: number,
  updatedAt: Date
) => {
  await prisma.product_instances.update({
    where: {
      instance_id: instanceId, // Ensure this field is unique
    },
    data: {
      last_modified_by: userId,
      updated_at: updatedAt,
    },
  });
};

const getAllFormSectionById = async (id: string) => {
  return prisma.product_form_data.findMany({
    where: { instance_id: id },
  });
};

const getFormAllSectionsData = async (id: string) => {
  const sections = await prisma.product_form_data.findMany({
    where: { instance_id: id },
    select: { form_data: true },
  });

  const mergedFormData = sections.reduce((acc, section) => {
    const formData = section.form_data;
    if (formData && typeof formData === "object" && !Array.isArray(formData)) {
      return { ...acc, ...(formData as Record<string, unknown>) };
    }

    return acc;
  }, {});

  return mergedFormData;
};

const lastAutosaveFileUpdate = async (
  instanceId: string,
  sectionsCompleted: Record<string, boolean>,
  lastAutosaveAt: Date,
  completionPercentage: number
) => {
  return await prisma.product_instances.update({
    where: {
      instance_id: instanceId, // Ensure this field is unique
    },
    data: {
      sections_completed: sectionsCompleted,
      last_autosave_at: lastAutosaveAt,
      completion_percentage: completionPercentage,
    },
  });
};

const updateRecentAccess = async (
  userId: number,
  instanceId: string,
  accessAt: Date
) => {
  return await prisma.recent_accesses.upsert({
    where: {
      user_id_instance_id: {
        user_id: userId,
        instance_id: instanceId,
      },
    },
    update: {
      accessed_at: accessAt,
    },
    create: {
      user_id: userId,
      instance_id: instanceId,
      accessed_at: accessAt,
    },
  });
};

const updateProductMetadata = async (
  productId: string,
  title: string,
  description: string,
  currentDate: Date
) => {
  return prisma.product_instances.update({
    where: { instance_id: productId },
    data: {
      title,
      description,
      updated_at: currentDate,
    },
  });
};

const deleteProduct = async (
  productId: string,
  userId: number,
  companyId: number
) => {
  return await prisma.$transaction(async (tx) => {
    // Delete recent accesses
    await tx.recent_accesses.deleteMany({
      where: { instance_id: productId },
    });

    // Delete user favorites
    await tx.user_favorites.deleteMany({
      where: { instance_id: productId },
    });

    const updated = await tx.product_instances.update({
      where: { instance_id: productId },
      data: {
        status: "deleted",
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });

    const shareProductsToDelete = await tx.shared_products.findMany({
      where: {
        instance_id: productId,
        status: { in: ["accepted", "pending"] },
        deleted_at: null,
      },
      select: {
        share_id: true,
        shared_with_email: true,
        permission: true,
      },
    });

    await tx.shared_products.updateMany({
      where: {
        instance_id: productId,
        status: {
          in: ["accepted", "pending"],
        },
        deleted_at: null,
      },
      data: {
        status: "deleted",
        deleted_at: new Date(),
      },
    });

    const deletedEditShareProducts = shareProductsToDelete
      .filter((p) => p.permission === "edit")
      .map((p) => ({ shared_with_email: p.shared_with_email }));

    const uniqueEmails = [
      ...new Set(deletedEditShareProducts.map((s) => s.shared_with_email)),
    ];
    for (const email of uniqueEmails) {
      const user = await checkUser(email);
      const collaborator =
        user?.company_users?.find((u: any) => u.company_id === companyId) ??
        null;

      const activeEditInvitations = await findActiveEditInvitations(
        Number(userId),
        email
      );
      const deleteIds = shareProductsToDelete.map((p) => p.share_id);
      const filteredActiveInvitations = activeEditInvitations.filter(
        (inv) => !deleteIds.includes(inv.share_id)
      );

      if (
        (!user || !collaborator || collaborator.role !== "editor") &&
        filteredActiveInvitations.length < 1
      ) {
        await productQueries.releaseSeat(companyId);
      }
    }

    const subscription = await tx.subscriptions.findUnique({
      where: { company_id: companyId },
      select: { models_used: true },
    });

    if (subscription && subscription.models_used > 0) {
      await tx.subscriptions.update({
        where: { company_id: companyId },
        data: {
          models_used: {
            decrement: 1,
          },
        },
      });
    }

    return updated;
  });
};

const getFormSectionByIdAndName = async (id: string, section: string) => {
  return prisma.product_form_data.findFirst({
    where: {
      instance_id: id,
      section_name: section,
    },
  });
};

const checkDuplicateShare = async (instanceId: string, email: string) => {
  return prisma.shared_products.findFirst({
    where: {
      instance_id: instanceId,
      shared_with_email: email,
      deleted_at: null,
    },
    select: {
      updated_at: true,
      status: true,
    },
  });
};

const checkUser = async (email: string) => {
  return prisma.users.findUnique({
    where: { email },
    select: {
      company_users: {
        where: {
          removed_from_company_at: null,
        },
        select: {
          role: true,
          company_id: true,
        },
      },
      user_id: true,
    },
  });
};

const findActiveEditInvitations = async (
  shared_by: number,
  shared_with_email: string,
  share_id?: number
) => {
  return prisma.shared_products.findMany({
    where: {
      shared_by,
      shared_with_email,
      ...(share_id !== undefined && {
        share_id: { not: share_id },
      }),
      permission: "edit",
      status: {
        in: ["accepted", "pending"],
      },
      deleted_at: null,
    },
    select: {
      share_id: true,
    },
  });
};

const sharedFile = async (
  instanceId: string,
  userId: number,
  collaboratorEmail: string,
  permission: string,
  token: string,
  tokenExpiry: Date,
  now: Date
) => {
  return prisma.shared_products.upsert({
    where: {
      instance_id_shared_with_email: {
        instance_id: instanceId,
        shared_with_email: collaboratorEmail,
      },
    },
    update: {
      permission: permission,
      access_token: token,
      expiration: tokenExpiry,
      status: "pending",
      updated_at: now,
      deleted_at: null,
    },
    create: {
      instance_id: instanceId,
      shared_by: userId,
      shared_with_email: collaboratorEmail,
      permission: permission,
      access_token: token,
      expiration: tokenExpiry,
      status: "pending",
      created_at: now,
      updated_at: now,
    },
  });
};

const consumeSeat = async (companyId: number) => {
  return prisma.subscriptions.update({
    where: { company_id: companyId },
    data: {
      seats_used: { increment: 1 },
    },
  });
};

const getOwnerName = async (userId: number) => {
  return prisma.users.findUnique({
    where: { user_id: userId },
    select: {
      full_name: true,
    },
  });
};

const getSharedFile = async (shareId: number, userId: number) => {
  return prisma.shared_products.findUnique({
    where: {
      share_id: shareId,
      shared_by: userId,
      status: "pending",
      deleted_at: null,
    },
    select: {
      permission: true,
      status: true,
      product_instance: {
        select: {
          title: true,
        },
      },
      shared_with_email: true,
      updated_at: true,
    },
  });
};

const resendFileInvite = async (
  shareId: number,
  token: string,
  tokenExpiry: Date,
  now: Date
) => {
  return prisma.shared_products.update({
    where: { share_id: shareId },
    data: {
      access_token: token,
      expiration: tokenExpiry,
      status: "pending",
      updated_at: now,
    },
  });
};

const getSharedFileDetail = async (shareId: number, userId: number) => {
  return prisma.shared_products.findUnique({
    where: {
      share_id: shareId,
      shared_by: userId,
      deleted_at: null,
    },
    select: {
      permission: true,
      instance_id: true,
      shared_with_email: true,
    },
  });
};

const updateInvitationPermission = async (
  shareId: number,
  permission: string
) => {
  return prisma.shared_products.update({
    where: {
      share_id: shareId,
    },
    data: {
      permission: permission,
    },
  });
};

const updateInvitationPermissionToView = async (
  sharedById: number,
  sharedWithEmail: string
) => {
  return prisma.shared_products.updateMany({
    where: {
      shared_by: sharedById,
      shared_with_email: sharedWithEmail,
      permission: "edit",
      deleted_at: null,
      status: {
        in: ["accepted", "pending"],
      },
    },
    data: {
      permission: "view",
    },
  });
};

const deleteSharedFile = async (
  sharedById: number,
  sharedWithEmail: string
) => {
  return prisma.shared_products.updateMany({
    where: {
      shared_by: sharedById,
      shared_with_email: sharedWithEmail,
      deleted_at: null,
      status: {
        in: ["accepted", "pending"],
      },
    },
    data: {
      status: "deleted",
      deleted_at: new Date(),
    },
  });
};

const getSharedFileByToken = async (token: string) => {
  return prisma.shared_products.findFirst({
    where: {
      access_token: token,
      expiration: { gt: new Date() },
      status: "pending",
      deleted_at: null,
    },
    select: {
      share_id: true,
      shared_by: true,
      shared_with_email: true,
    },
  });
};

const updateInvitationStatus = async (
  shareId: number,
  status: string,
  now: Date
) => {
  return prisma.shared_products.update({
    where: { share_id: shareId },
    data: {
      status,
      updated_at: now,
      accepted_at: status === "accepted" ? now : null,
      declined_at: status === "declined" ? now : null,
      access_token: null,
      expiration: null,
    },
    select: {
      shared_with_email: true,
      permission: true,
      sharedBy: {
        select: {
          default_company_id: true,
        },
      },
    },
  });
};

const releaseSeat = async (companyId: number) => {
  return prisma.subscriptions.update({
    where: { company_id: companyId },
    data: {
      seats_used: { decrement: 1 },
    },
  });
};

const getSharedFilesInvitations = async (userId: number) => {
  return prisma.shared_products.findMany({
    where: { shared_by: userId, status: "pending", deleted_at: null },
    orderBy: {
      updated_at: "desc",
    },
    select: {
      share_id: true,
      product_instance: {
        select: {
          title: true,
        },
      },
      shared_with_email: true,
      permission: true,
      status: true,
      updated_at: true,
    },
  });
};

const getSharedFilesWithMe = async (email: string, userId: number) => {
  return prisma.shared_products.findMany({
    where: {
      shared_with_email: email,
      status: "accepted",
      shared_by: userId,
      deleted_at: null,
    },
    orderBy: {
      updated_at: "desc",
    },
    select: {
      share_id: true,
      product_instance: {
        select: {
          instance_id: true,
          title: true,
        },
      },
      sharedBy: {
        select: {
          full_name: true,
          default_company_id: true,
        },
      },
      permission: true,
      accepted_at: true,
    },
  });
};

const getSharedFiles = async (instanceId: string) => {
  return prisma.shared_products.findMany({
    where: {
      instance_id: instanceId,
      status: {
        in: ["accepted", "pending"],
      },
      deleted_at: null,
    },
    select: {
      share_id: true,
      shared_with_email: true,
      permission: true,
      status: true,
    },
    orderBy: {
      updated_at: "desc",
    },
  });
};

const getUserDetails = async (email: string) => {
  return prisma.users.findUnique({
    where: { email },
    select: {
      user_id: true,
      full_name: true,
      email: true,
      profile_picture_url: true,
    },
  });
};

const getUserCompanyRole = async (user_id: number, company_id: number) => {
  return prisma.company_users.findUnique({
    where: {
      company_id_user_id: {
        company_id,
        user_id,
      },
    },
    select: {
      role: true,
    },
  });
};

const getUserCompanyAccess = async (companyId: number, userId: number) => {
  return prisma.company_users.findUnique({
    where: {
      company_id_user_id: {
        company_id: companyId,
        user_id: userId,
      },
      removed_from_company_at: null,
    },
    select: {
      company: {
        select: {
          users: {
            select: {
              user_id: true,
            },
          },
        },
      },
    },
  });
};

const deleteInvitation = async (shareId: number) => {
  return prisma.shared_products.update({
    where: {
      share_id: shareId,
    },
    data: {
      status: "deleted",
      deleted_at: new Date(),
    },
  });
};

const lockFile = async (fileId: string, userId: number, reason: string) => {
  return prisma.product_instances.update({
    where: { instance_id: fileId },
    data: {
      is_locked: true,
      locked_by: userId,
      locked_reason: reason,
      locked_at: new Date(),
      updated_at: new Date(),
    },
    select: {
      instance_id: true,
      locked_at: true,
      locked_by: true,
      locked_reason: true,
    },
  });
};

const unlockFile = async (fileId: string) => {
  return prisma.product_instances.update({
    where: { instance_id: fileId },
    data: {
      is_locked: false,
      locked_by: null,
      locked_reason: null,
      locked_at: null,
      updated_at: new Date(),
    },
  });
};

const cloneFile = async (
  fileId: string,
  instanceId: string,
  companyId: number,
  userId: number
) => {
  return await prisma.$transaction(async (tx) => {
    const data = await getProductInstanceById(fileId);

    const cloneData = await tx.product_instances.create({
      data: {
        instance_id: instanceId,
        title: `${data.title} (Copy)`,
        product_type_id: data.product_type_id,
        company_id: companyId,
        created_by: userId,
        is_clone: true,
        status: "draft",
        cloned_from: fileId,
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: {
        instance_id: true,
        title: true,
        created_at: true,
      },
    });

    await tx.product_instances.update({
      where: { instance_id: fileId },
      data: {
        clone_count: {
          increment: 1,
        },
      },
    });

    await tx.subscriptions.update({
      where: { company_id: companyId },
      data: {
        models_used: {
          increment: 1,
        },
      },
    });

    return cloneData;
  });
};

const listArchivedFile = async (companyId: number) => {
  const files = await prisma.product_instances.findMany({
    where: { company_id: companyId, deleted_at: null, is_archived: true },
    select: {
      instance_id: true,
      title: true,
      archived_at: true,
      archived_deleted_at: true,
      was_from_plan: true,
      archived_reason: true,
    },
  });

  const now = new Date();

  return files.map((f) => {
    let daysRemaining: number | null = null;
    if (f.archived_deleted_at) {
      const diff = f.archived_deleted_at.getTime() - now.getTime();
      daysRemaining = Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
    }
    return {
      instance_id: f.instance_id,
      title: f.title,
      archived_at: f.archived_at ?? null,
      delete_at: f.archived_deleted_at ?? null,
      days_until_deletion: daysRemaining,
      was_from_plan: f.was_from_plan,
      archive_reason: f.archived_reason,
    };
  });
};

const restoreFile = async (companyId: number, fileId: string, now: Date) => {
  await prisma.$transaction(async (tx) => {
    const restoreData = await prisma.product_instances.update({
      where: {
        instance_id: fileId,
        company_id: companyId,
        is_archived: true,
      },
      data: {
        is_archived: false,
        archived_at: null,
        archived_deleted_at: null,
        archived_reason: null,
        was_from_plan: null,
        updated_at: now,
      },
    });

    await tx.subscriptions.update({
      where: { company_id: companyId },
      data: {
        models_used: {
          increment: 1,
        },
      },
    });

    return restoreData;
  });
};

const productQueries = {
  getUserByEmail,
  getTotalProductsCount,
  getProductInstances,
  createProduct,
  getUserDefaultCompany,
  updateProductStatus,
  getProductById,
  createVersion,
  updateFileVersion,
  getProductType,
  getProductInstanceById,
  createProductFormData,
  lastModifiedUserUpdate,
  getAllFormSectionById,
  getFormAllSectionsData,
  lastAutosaveFileUpdate,
  updateRecentAccess,
  updateProductMetadata,
  deleteProduct,
  getFormSectionByIdAndName,
  checkDuplicateShare,
  checkUser,
  findActiveEditInvitations,
  sharedFile,
  consumeSeat,
  getOwnerName,
  getSharedFile,
  resendFileInvite,
  getSharedFileDetail,
  updateInvitationPermission,
  updateInvitationPermissionToView,
  deleteSharedFile,
  getSharedFileByToken,
  updateInvitationStatus,
  releaseSeat,
  getSharedFilesInvitations,
  getSharedFilesWithMe,
  getSharedFiles,
  getUserDetails,
  getUserCompanyAccess,
  deleteInvitation,
  getUserCompanyRole,
  lockFile,
  unlockFile,
  cloneFile,
  listArchivedFile,
  restoreFile,
};

export default productQueries;
