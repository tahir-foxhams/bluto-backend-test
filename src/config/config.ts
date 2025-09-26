const jwtSecret = process.env.JWT_SECRET_KEY;
const salt = process.env.USER_PASSWORD_SALT;
const frontendBaseUrl = process.env.FRONTEND_BASE_URL || "https://dev.bluto.ai";
const mailgunDomain = process.env.MAILGUN_DOMAIN;
const mailgunApiKey = process.env.MAILGUN_API_KEY;
const backendBaseUrl = process.env.BACKEND_BASE_URL || "https://dev-api.bluto.ai";
const adminEmail = process.env.ADMIN_EMAIL || "tahir@foxhams.com";
const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const awsRegion = process.env.AWS_REGION;
const awsBucketName = "ph3-user-profile-image";
// const googleClientId = process.env.GOOGLE_CLIENT_ID;    GOOGLE_CLINET_ID
const googleClientId = process.env.GOOGLE_CLINET_ID; // renamed to wrong spelling because it is typo on server
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const linkedinClientId = process.env.LINKEDIN_CLIENT_ID;
const linkedinClientSecret = process.env.LINKEDIN_CLIENT_SECRET;
const linkedinCallbackUrl = process.env.LINKEDIN_CALLBACK_URL;

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const gracePeriodDays = process.env.GRACE_PERIOD_DAYS;
const foundersChoicePriceId = process.env.PRICE_ID_FOUNDERS_CHOICE;
const growthEnginePriceId = process.env.PRICE_ID_GROWTH_ENGINE;
const pitchDeckPriceId = process.env.PRICE_ID_PITCH_DECK;
const forecastPriceId = process.env.PRICE_ID_FORECAST;
const completePriceId = process.env.PRICE_ID_COMPLETE;
const calendlyLink = process.env.CALENDLY_LINK;
const oneoffRequirementFormLink = process.env.ONEOFF_REQUIREMENT_FORM_LINK;

export const configs = {
  jwtSecret,
  salt,
  frontendBaseUrl,
  mailgunDomain,
  mailgunApiKey,
  backendBaseUrl,
  adminEmail,
  awsAccessKey,
  awsSecretAccessKey,
  awsRegion,
  awsBucketName,
  googleClientId,
  googleClientSecret,
  linkedinClientId,
  linkedinClientSecret,
  linkedinCallbackUrl,
  stripeSecretKey,
  stripeWebhookSecret,
  gracePeriodDays,
  foundersChoicePriceId,
  growthEnginePriceId,
  pitchDeckPriceId,
  forecastPriceId,
  completePriceId,
  calendlyLink,
  oneoffRequirementFormLink,
};
