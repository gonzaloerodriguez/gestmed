import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Crear cliente para el servidor
export const createServerClient = () => {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Re-exportar todos los tipos de tu archivo original
export type {
  Doctor,
  Prescription,
  Admin,
  MedicalSpecialty,
  MedicationType,
  Patient,
  PatientRepresentative,
  ExemptedUser,
  MedicalHistory,
  VitalSigns,
  Consultation,
  PatientWithRepresentative,
  ConsultationWithPrescriptions,
  MedicalHistoryComplete,
  PatientForSelector,
} from "@/lib/supabase"
