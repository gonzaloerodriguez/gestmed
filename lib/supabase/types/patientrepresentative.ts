export type PatientRepresentative = {
  id: string
  patient_id: string
  full_name: string
  relationship: string
  cedula?: string
  phone?: string
  email?: string
  address?: string
  is_primary: boolean
  created_at: string
  updated_at: string
}