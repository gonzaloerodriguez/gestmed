import { supabase } from "@/lib/supabase/supabase"

export async function updatePatient(patientId: string, updates: any) {
  const { error } = await supabase.from("patients").update(updates).eq("id", patientId)
  if (error) throw new Error(error.message)
}
export async function softDeletePatient(patientId: string) {
  const { error } = await supabase.from("patients").update({ is_active: false }).eq("id", patientId)
  if (error) throw new Error(error.message)
}

export async function softDeleteConsultation(consultationId: string) {
  const { error } = await supabase
    .from("medical_records")
    .update({ is_active: false })
    .eq("id", consultationId)
  if (error) throw new Error(error.message)
}
