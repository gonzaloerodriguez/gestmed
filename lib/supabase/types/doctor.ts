export interface Doctor {
  id: string
  email: string
  full_name: string
  cedula: string
  gender: "male" | "female"
  license_number: string
  specialty?: string
  signature_stamp_url?: string 
  document_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
  subscription_status?: "active" | "pending_verification" | "expired"
  last_payment_date?: string
  next_payment_date?: string
  payment_proof_url?: string
  preferred_theme?: string
}