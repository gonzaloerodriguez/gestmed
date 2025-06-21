import { supabase } from "@/lib/supabase/supabase"

interface MedicalRecordInput {
  patient_id: string
  date: string
  observations?: string
  is_active?: boolean
}

export async function createMedicalRecord(record: MedicalRecordInput) {
  const { error } = await supabase.from("medical_records").insert({
    ...record,
    is_active: true,
  })

  if (error) throw new Error(error.message)
}

export async function updateMedicalRecord(recordId: string, updates: Partial<MedicalRecordInput>) {
  const { error } = await supabase
    .from("medical_records")
    .update(updates)
    .eq("id", recordId)

  if (error) throw new Error(error.message)
}

export async function getMedicalRecordsByPatient(patientId: string) {
  const { data, error } = await supabase
    .from("medical_records")
    .select("*")
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .order("date", { ascending: false })

  if (error) throw new Error(error.message)
  return data
}
