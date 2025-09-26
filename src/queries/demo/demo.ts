import prisma from "../../config/db";

interface Metadata {
  sourceUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

const createDemoRequest = async (
  user_type: string,
  is_qualified: boolean,
  full_name: string,
  email: string,
  company: string,
  phone: string,
  requirements: string,
  form_data: object,
  browserInfo: object | null,
  metadata: Metadata | null
) => {
  return prisma.demo_requests.create({
    data: {
      user_type,
      is_qualified,
      full_name,
      email,
      company_name: company,
      phone,
      additional_info: requirements,
      calendly_shown_at: is_qualified ? new Date() : null,
      form_data,
      browser_info: browserInfo,
      source_url: metadata?.sourceUrl,
      utm_source: metadata?.utmSource,
      utm_medium: metadata?.utmMedium,
      utm_campaign: metadata?.utmCampaign,
    },
  });
};

const validateBookingToken = async (bookingToken: string) => {
  return await prisma.demo_requests.findFirst({
    where: {
      booking_token: bookingToken,
      token_expires_at: {
        gt: new Date(),
      },
    },
  });
};

const markCalendlyScheduled = async (email: string) => {
  const existing = await prisma.demo_requests.findFirst({
    where: {
      email,
      is_qualified: true,
      calendly_scheduled: false,
      token_expires_at: {
        gt: new Date(),
      },
    },
  });

  if (!existing) {
    return null;
  }

  return prisma.demo_requests.update({
    where: { id: existing.id },
    data: {
      calendly_scheduled: true,
    },
  });
};

const getPendingFollowups = async () => {
  // const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); //Create a 2 hrs ago time
  const twoHoursAgo = new Date(Date.now() - 5 * 60 * 1000); //for testing //Create a 5 minutes ago time, so our 5 minutes ago recodrs are updated quickly for testing

  return prisma.demo_requests.findMany({
    where: {
      is_qualified: true,
      calendly_shown_at: {
        lt: twoHoursAgo,
      },
      calendly_scheduled: false,
      follow_up_sent: false,
    },
    select: {
      email: true,
      full_name: true,
      company_name: true,
      booking_token: true,
    },
  });
};

const markFollowUpSent = async (booking_token: string) => {
  return prisma.demo_requests.update({
    where: { booking_token },
    data: {
      follow_up_sent: true,
      follow_up_sent_at: new Date(),
    },
  });
};

const demoRequestQueries = {
  createDemoRequest,
  validateBookingToken,
  markCalendlyScheduled,
  getPendingFollowups,
  markFollowUpSent,
};

export default demoRequestQueries;
