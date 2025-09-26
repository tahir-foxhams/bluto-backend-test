export interface NewUser {
  email: string;
  full_name: string;
  password_hash?: string;
  phone_number?: string;
  job_title?: string;
  company_id?: number;
  timezone?: string;
  terms_accepted: boolean;
  terms_accepted_date?: Date;
  reset_password_token_expiry?: Date;
  reset_password_token?: string;
  created_at?: Date;
  email_verified?: boolean;
}

export interface SocialUser {
  email: string;
  full_name: string;
  company_id?: number;
  email_verified?: boolean;
}

export interface SocialAccount {
  user_id?: number;
  provider?: string;
  provider_user_id?: string;
  email?: string;
  profile_picture_url?: string;
  id_token?: string;
}

export interface EmailChange {
  userId: number;
  new_email: string;
  email_change_token?: string;
  email_change_token_expiry?: Date;
  email_change_attempted_at?: Date;
}

export interface UserProfileUpdate {
  userId: number;
  full_name: string;
  job_title?: string;
  email?: string;
  country?: string;
  timezone?: string;
  profile_picture_url?: string;
}

export interface UserPasswordUpdate {
  userId: number;
  password: string;
}

export interface ForgotPassword {
  email: string;
  reset_password_token?: string;
  reset_password_token_expiry?: Date;
}
