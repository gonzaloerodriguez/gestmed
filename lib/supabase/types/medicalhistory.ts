import { ConsultationWithPrescriptions } from "./consultations"
import { Patient } from "./patient"
import { Prescription } from "./prescription"

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

export type MedicalHistoryComplete = MedicalHistory & {
  patient: Patient
  consultations?: ConsultationWithPrescriptions[]
  prescriptions?: Prescription[]
}
