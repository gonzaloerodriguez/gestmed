import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Crear cliente para el servidor
export const createServerClient = () => {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Tipos actualizados para la base de datos
// Actualizar la interfaz Doctor para reflejar que firma y sello van juntos
export interface Doctor {
  id: string
  email: string
  full_name: string
  cedula: string
  gender: "male" | "female"
  license_number: string
  specialty?: string
  signature_stamp_url?: string // Cambiar de signature_url y stamp_url a una sola imagen
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

export interface Prescription {
  id: string
  consultation_id?: string
  medical_history_id?: string
  doctor_id: string
  patient_name: string
  patient_age?: number
  patient_cedula?: string
  patient_phone?: string
  patient_address?: string
  diagnosis?: string
  medications: string
  instructions: string
  date_prescribed: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
  doctor?: Doctor
   patient_id?: string
}



export interface Admin {
  id: string
  email: string
  full_name: string
  is_super_admin: boolean
  created_at: string
  updated_at: string
}

export interface MedicalSpecialty {
  id: number
  name: string
  description?: string
  created_at: string
}

export interface MedicationType {
  id: number
  name: string
  description?: string
  created_at: string
}

export type Patient = {
  id: string
  doctor_id: string
  full_name: string
  cedula?: string
  phone?: string
  address?: string
  birth_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
    email?: string
  gender?: "male" | "female"
}

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

export interface ExemptedUser {
  id: string
  email: string
  created_by: string
  created_at: string
}

export type MedicalHistory = {
  id: string
  patient_id: string
  doctor_id: string
  blood_type?: string
  allergies?: string
  chronic_conditions?: string
  current_medications?: string
  family_history?: string
  notes?: string
  created_at: string
  updated_at: string
}

export type VitalSigns = {
  weight?: number | null
  height?: number | null
  bp?: string | null
  temp?: number | null
  heart_rate?: number | null
  respiratory_rate?: number | null
}

export type Consultation = {
  id: string
  medical_history_id: string
  doctor_id: string
  consultation_date: string
  reason_for_visit: string
  symptoms?: string
  physical_examination?: string
  diagnosis?: string
  treatment_plan?: string
  follow_up_date?: string
  notes?: string
  vital_signs?: VitalSigns
  created_at: string
  updated_at: string
}


// Tipos compuestos para vistas completas
export type PatientWithRepresentative = Patient & {
  representatives?: PatientRepresentative[]
  medical_history?: MedicalHistory
}

export type ConsultationWithPrescriptions = Consultation & {
  prescriptions?: Prescription[]
}

export type MedicalHistoryComplete = MedicalHistory & {
  patient: Patient
  consultations?: ConsultationWithPrescriptions[]
  prescriptions?: Prescription[]
}

export type PatientForSelector = {
  id: string
  full_name: string
  cedula: string
  phone?: string
  email?: string
  medical_history_id?: string
}