export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  // Make these properties optional or allow null
  updated_at: string | null;
  pushed_at: string | null;
  created_at: string | null;
  // Add other properties you're using
  default_branch: string;
  visibility?: string;
}