export interface Admin {
  id: string
  email: string
  full_name: string
  is_super_admin: boolean
  created_at: string
  updated_at: string
}

export interface AdminActivity {
  id: string;
  action: string;
  timestamp: string;
  details: string;
  ip_address?: string;
}