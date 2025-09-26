export interface ProductInstance {
  instance_id: string;
  title: string;
  status: string;
  completion_percentage: number;
  created_at: Date;
  last_modified_at?: Date;
  updated_at?: Date;
  creator: {
    user_id: number;
    full_name: string;
    profile_picture_url: string;
  };
  SharedProducts?: { shared_with: number }[];
}

export interface Favorite {
  instance_id: number;
}

export interface User {
  user_id: number;
  email: string;
  email_verified: boolean;
}
