import type { MedicalHistory } from "./medicalhistory"
import type { PatientRepresentative } from "./patientrepresentative"

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

export type PatientSelectorItem = Pick<
  Patient,
  "id" | "full_name" | "cedula" | "phone" | "email" | "birth_date" | "address"
>

export type PatientForSelector = {
  id: string
  full_name: string
  cedula: string
  phone?: string
  email?: string
  birth_date?: string
  address?: string
  medical_history_id?: string
}

export type PatientWithRepresentative = Patient & {
  representatives?: PatientRepresentative[]
  medical_history?: MedicalHistory
}


// import type { MedicalHistory } from "./medicalhistory"
// import type { PatientRepresentative } from "./patientrepresentative"

// export type Patient = {
//   id: string
//   doctor_id: string
//   full_name: string
//   cedula?: string
//   phone?: string
//   address?: string
//   birth_date?: string
//   is_active: boolean
//   created_at: string
//   updated_at: string
//     email?: string
//   gender?: "male" | "female"
// }
// export type PatientSelectorItem = Pick<
//   Patient,
//   "id" | "full_name" | "cedula" | "phone" | "email" | "birth_date" | "address"
// >;


// export type PatientForSelector = {
//   id: string
//   full_name: string
//   cedula: string
//   phone?: string
//   email?: string
//   medical_history_id?: string
// }

// export type PatientWithRepresentative = Patient & {
//   representatives?: PatientRepresentative[]
//   medical_history?: MedicalHistory
// }


