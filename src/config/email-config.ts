import { configs } from "./config";
const noreplyEmail = configs.adminEmail;

export const emailConfigs = {
  adminToEmail: noreplyEmail,
  mailgunConfig: {
    domain: configs.mailgunDomain,
    apiKey: configs.mailgunApiKey,
  },
  templates: {
    emailVerification: {
      from: noreplyEmail,
      name: "bluto-a-verify-your-account-email-1",
    },
    welcomeEmail: {
      from: noreplyEmail,
      name: "ph3_welcome_email",
    },
    resetPassword: {
      from: noreplyEmail,
      name: "bluto-b-password change-request-update",
    },
    emailUpdateConfirm: {
      from: noreplyEmail,
      name: "bluto-d-email-update-confirm",
    },
    emailUpdateSuccess: {
      from: noreplyEmail,
      name: "bluto-e-email-update-success",
    },
    emailUpdateVerify: {
      from: noreplyEmail,
      name: "bluto-f-email-update-verify",
    },
    resetPasswordConfirmation: {
      from: noreplyEmail,
      name: "bluto-c-password-changed-confirmation-update",
    },
    supportTicketConfirmationUser: {
      from: noreplyEmail,
      name: "support ticket confirmation sent to user",
    },
    supportTicketAdmin: {
      from: noreplyEmail,
      name: "support ticket internal admin: sent to admin",
    },
    demoRequestReceived: {
      from: noreplyEmail,
      name: "book a demo request received: user",
    },
    demoFollowUp: {
      from: noreplyEmail,
      name: "book a demo qualified did not book: user",
    },
    demoAdminNotification: {
      from: noreplyEmail,
      name: "book a demo: admin",
    },
    stripeSubscriptionNewAccount: {
      from: noreplyEmail,
      name: "stripe-subscription-new-account-setup",
    },
    stripeSubscriptionUpgrade: {
      from: noreplyEmail,
      name: "stripe-subscription-upgrade-success",
    },
    stripeOneOffOrderEmail: {
      from: noreplyEmail,
      name: "stripe-oneoff-order-confirmation",
    },
    stripeSubscriptionCancelled: {
      from: noreplyEmail,
      name: "stripe-subscription-cancelled",
    },
    stripePaymentConvertedToCredit: {
      from: noreplyEmail,
      name: "stripe-payment-converted-to-credit",
    },
    stripeDiscardCancelSubscriptionRequest: {
      from: noreplyEmail,
      name: "stripe-discard-cancel-subscription-request",
    },
    stripeSubscriptionPaymentFailed: {
      from: noreplyEmail,
      name: "stripe-subscription-payment-failed",
    },
    fileSharedInvitation: {
      from: noreplyEmail,
      name: "file-shared-invitation",
    },
  },
};
