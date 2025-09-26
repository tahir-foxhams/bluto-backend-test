import FormData from "form-data";
import Mailgun from "mailgun.js";
import { configs } from "../config/config";

const backendBaseUrl = configs.backendBaseUrl;
const mailgunBaseUrl = backendBaseUrl.includes("localhost")
  ? "https://api.mailgun.net"
  : "https://api.eu.mailgun.net";

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: "api",
  key: configs.mailgunApiKey,
  url: mailgunBaseUrl,
});

interface MailTemplate {
  name: string;
  from: string;
}

interface DynamicData {
  to_email: string;
  [key: string]: any;
}

export const sendMail = async (
  template: MailTemplate,
  dynamicData: DynamicData
): Promise<void> => {
  try {
    const data = {
      from: template.from,
      to: [dynamicData.to_email],
      template: template.name,
      "h:X-Mailgun-Variables": JSON.stringify(dynamicData),
    };
    const mailgunResults = await mg.messages.create(
      `${configs.mailgunDomain}`,
      data
    );
    console.log("mailgunResults", mailgunResults);
  } catch (error) {
    console.error("error", error);
    throw error;
  }
};

module.exports = {
  sendMail,
};
