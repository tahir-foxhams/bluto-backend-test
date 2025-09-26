interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  pdf_url: string;
  hosted_invoice_url: string;
}

export interface StripeData {
  payment_method: object | null;
  invoices: Invoice[];
}

export interface TrialInfo {
  isActiveTrial: boolean;
  trialDaysRemaining: number | null;
}
