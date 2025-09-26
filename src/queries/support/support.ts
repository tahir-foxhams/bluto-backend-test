import { Prisma, TicketType, TicketPriority } from "@prisma/client";
import prisma from "../../config/db";

const createSupportTicket = async (
  company_id: number,
  ticket_type: TicketType,
  subject: string,
  description: string,
  priority: TicketPriority,
  page_url: string | null,
  browser_info: object | null,
  user_id: number,
) => {
  return prisma.support_tickets.create({
    data: {
      ticket_type,
      subject,
      description,
      company_id,
      user_id,
      priority,
      page_url,
      browser_info: browser_info as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      ticket_number: true,
      subject: true,
      status: true,
      priority: true,
      created_at: true,
    },
  });
};

const supportQueries = {
  createSupportTicket,
};

export default supportQueries;
