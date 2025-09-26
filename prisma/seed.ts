import { PrismaClient } from "@prisma/client";
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;
const dbName = 'test';

// const dbUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
const dbUrl = process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  const existingCompany = await prisma.companies.findFirst({
    where: { company_name: "Default Company" },
  });

  if (!existingCompany) {
    await prisma.companies.create({
      data: {
        company_name: "Default Company",
        industry: "Software",
        company_size: "10-50",
        website: "https://defaultcompany.com",
        logo_url: "https://defaultcompany.com/logo.png",
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log("Default company inserted");
  } else {
    console.log("Default company already exists");
  }

  const plans = [
    {
      plan_name: "Free",
      max_models: 1,
      included_seats: 1,
      has_export: false,
      has_advanced_analytics: false,
      has_api_access: false,
      allows_view_sharing: true,
    },
    {
      plan_name: "Founder's Choice",
      max_models: 5,
      included_seats: 2,
      has_export: true,
      has_advanced_analytics: true,
      has_api_access: false,
      allows_view_sharing: true,
    },
    {
      plan_name: "Growth Engine",
      max_models: 10,
      included_seats: 5,
      has_export: true,
      has_advanced_analytics: true,
      has_api_access: false,
      allows_view_sharing: true,
    },
  ];

  for (const plan of plans) {
    await prisma.subscription_limits.upsert({
      where: { plan_name: plan.plan_name },
      update: {
        max_models: plan.max_models,
        included_seats: plan.included_seats,
        has_export: plan.has_export,
        has_advanced_analytics: plan.has_advanced_analytics,
        has_api_access: plan.has_api_access,
        allows_view_sharing: plan.allows_view_sharing,
        updated_at: new Date(),
      },
      create: {
        ...plan,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  console.log("Subscription limits seeded/updated");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
