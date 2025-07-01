import { Doctor } from "./doctor"

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
  diagnosis: string //le saque el ?
  allergies: string //le saque el ?
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
