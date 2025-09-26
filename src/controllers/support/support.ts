import { Request, Response } from "express";
import userQueries from "../../queries/auth/user";
import ticketQueries from "../../queries/support/support";
import { sendMail } from "../../utils/sendMail";
import { emailConfigs } from "../../config/email-config";

export const createSupportTicket = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.decoded.userId as string);
    const email = req.decoded.email;

    const {
      company_id,
      ticket_type,
      subject,
      description,
      priority,
      page_url,
      browser_info,
    } = req.body;

    const user = await userQueries.checkUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        response: null,
        error: "User not found",
      });
    }

    const company = await userQueries.checkCompany(company_id);
    if (!company) {
      return res.status(404).json({
        message: "Company not found",
        response: null,
        error: "Company not found",
      });
    }

    const ticket = await ticketQueries.createSupportTicket(
      company_id,
      ticket_type,
      subject,
      description,
      priority,
      page_url,
      browser_info,
      userId
    );

    await sendMail(emailConfigs.templates.supportTicketConfirmationUser, {
      subject,
      ticket_number: ticket.ticket_number,
      ticket_type,
      user_email: email,
      user_name: user.full_name,
      to_email: email,
    });

    function formatDate(date: Date) {
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
    await sendMail(emailConfigs.templates.supportTicketAdmin, {
      admin_dashboard_url: page_url,
      browser: browser_info.userAgent,
      company_name: company.company_name,
      description,
      language: browser_info.language,
      page_url: page_url,
      platform: browser_info.platform,
      screen_resolution: browser_info.screenResolution,
      subject,
      submitted_at: formatDate(ticket.created_at),
      ticket_number: ticket.ticket_number,
      ticket_type,
      user_email: email,
      user_id: userId,
      user_name: user.full_name,
      to_email: emailConfigs.adminToEmail,
    });

    return res.status(201).json({
      message: "Support ticket created successfully",
      response: { data: { ticket_number: ticket.ticket_number } },
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
