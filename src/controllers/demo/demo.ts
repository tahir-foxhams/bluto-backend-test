import { Request, Response } from "express";
import cron from "node-cron";
import demoRequestQueries from "../../queries/demo/demo";
import { sendMail } from "../../utils/sendMail";
import { emailConfigs } from "../../config/email-config";
import { configs } from "../../config/config";

const formatFormDataAsPlainText = (data: Record<string, any>): string => {
  if (!data || typeof data !== "object") return "";

  return Object.entries(data)
    .filter(
      ([_, value]) => value !== "" && value !== null && value !== undefined
    )
    .map(([key, value]) => {
      const label = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return `${label}: ${value}`;
    })
    .join("\n");
};

export const createDemoRequest = async (req: Request, res: Response) => {
  try {
    const {
      user_type,
      is_qualified,
      full_name,
      email,
      company,
      phone,
      requirements,
      form_data,
      browser_info,
      metadata,
    } = req.body;

    const demo = await demoRequestQueries.createDemoRequest(
      user_type,
      is_qualified,
      full_name,
      email,
      company,
      phone,
      requirements,
      form_data,
      browser_info,
      metadata
    );

    if (!is_qualified) {
      await sendMail(emailConfigs.templates.demoRequestReceived, {
        name: full_name,
        request_number: demo.request_number,
        to_email: email,
      });
    }

    const dashboardLink = `${configs.frontendBaseUrl}/dashboard`;
    const formattedTime = new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date());

    await sendMail(emailConfigs.templates.demoAdminNotification, {
      company,
      current_time: formattedTime,
      dashboard_link: dashboardLink,
      email,
      form_responses: formatFormDataAsPlainText(form_data),
      name: full_name,
      request_number: demo.request_number,
      status: is_qualified ? "QUALIFIED" : "REVIEW",
      user_type: user_type,
      to_email: emailConfigs.adminToEmail,
    });

    return res.status(201).json({
      message: "Demo request has been submitted successfully",
      response: null,
      error: null,
    });
  } catch (error) {
    console.error("Error in demo request:", error);
    return res.status(500).json({
      message: "Internal server error",
      response: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const validateBookingToken = async (req: Request, res: Response) => {
  try {
    const { booking_token } = req.body;

    const result = await demoRequestQueries.validateBookingToken(booking_token);
    if (!result) {
      return res.status(400).json({
        message: "Booking token is invalid or has expired",
        response: null,
        error: "Invalid or expired token",
      });
    }

    return res.status(200).json({
      message: "Booking token is valid",
      response: null,
      error: null,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      response: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const calendlyWebhook = async (req: Request, res: Response) => {
  try {
    const { event, payload } = req.body;

    if (event === "invitee.created") {
      const email = payload.email;

      const result = await demoRequestQueries.markCalendlyScheduled(email);
      if (!result) {
        return res.status(400).json({
          message: "Email is not valid or token has expired",
          response: null,
          error: "Email is not valid or token has expired",
        });
      }

      return res.status(200).json({
        message: "Calendly scheduled status updated",
        response: null,
        error: null,
      });
    }

    return res.status(403).json({
      message: "Invalid event",
      response: null,
      error: "Forbidden",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      response: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const sendFollowups = async () => {
  try {
    const pendingFollowups = await demoRequestQueries.getPendingFollowups();

    for (const demo of pendingFollowups) {
      try {
        const { email, full_name, company_name, booking_token } = demo;
        const bookingLink = `${configs.frontendBaseUrl}/demo-follow-up?demo-token=${booking_token}&full_name=${full_name}&email=${email}`;

        await sendMail(emailConfigs.templates.demoFollowUp, {
          booking_link: bookingLink,
          name: full_name,
          company: company_name,
          to_email: email,
        });

        await demoRequestQueries.markFollowUpSent(booking_token);
      } catch (err) {
        console.error(`❌ Failed to process follow-up for ${demo.email}:`, err);
      }
    }
  } catch (error) {
    console.error("Error in sending followups:", error);
  }
};

// cron.schedule("0 * * * *", async () => { //Create a 1 hrs ago time
cron.schedule("*/5 * * * *", async () => { //for testing  //Create a 5 minutes time, so our 5 minutes cron job run
  console.log("⏰ Running hourly follow-up job...");
  await sendFollowups();
});
