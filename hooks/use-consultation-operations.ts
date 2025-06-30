"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/supabase"
import { useToastEnhanced } from "@/hooks/use-toast-enhanced"

export function useConsultationOperations() {
  const [loading, setLoading] = useState(false)
  const { showSuccess, showError } = useToastEnhanced()

  const archiveConsultation = async (consultationId: string, patientName: string) => {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        showError("Error de autenticación", "Debes iniciar sesión para realizar esta acción")
        return false
      }

      const { error } = await supabase
        .from("consultations")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", consultationId)
        .eq("doctor_id", user.id) // Verificar que sea el doctor propietario

      if (error) throw error

      showSuccess("Consulta Archivada", `La consulta de ${patientName} ha sido archivada exitosamente.`)

      return true
    } catch (error: any) {
      console.error("Error archivando consulta:", error)
      showError("Error al Archivar", "No se pudo archivar la consulta. Inténtalo de nuevo.")
      return false
    } finally {
      setLoading(false)
    }
  }

  const restoreConsultation = async (consultationId: string, patientName: string) => {
    try {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        showError("Error de autenticación", "Debes iniciar sesión para realizar esta acción")
        return false
      }

      const { error } = await supabase
        .from("consultations")
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", consultationId)
        .eq("doctor_id", user.id)

      if (error) throw error

      showSuccess("Consulta Restaurada", `La consulta de ${patientName} ha sido restaurada exitosamente.`)

      return true
    } catch (error: any) {
      console.error("Error restaurando consulta:", error)
      showError("Error al Restaurar", "No se pudo restaurar la consulta. Inténtalo de nuevo.")
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (
    consultationId: string,
  ): Promise<{ needsConfirmation: boolean; patientData?: any; consultationData?: any }> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        showError("Error de autenticación", "No se pudo verificar la sesión del usuario")
        return { needsConfirmation: false }
      }

      // Obtener información de la consulta con datos del paciente
      const { data: consultationData, error: consultationError } = await supabase
        .from("consultations")
        .select(`
          *,
          medical_histories!inner(
            id,
            patient_id,
            patients!inner(
              id,
              full_name,
              is_active
            )
          )
        `)
        .eq("id", consultationId)
        .eq("doctor_id", user.id)
        .single()

      if (consultationError || !consultationData) {
        // Si no tiene historia clínica asociada, restaurar directamente
        const success = await restoreConsultation(consultationId, "la consulta")
        return { needsConfirmation: false }
      }

      // Si tiene historia clínica y paciente asociado
      const patient = consultationData.medical_histories.patients

      // Verificar si el paciente está archivado
      if (!patient.is_active) {
        return {
          needsConfirmation: true,
          patientData: patient,
          consultationData: consultationData,
        }
      } else {
        // Si el paciente está activo, solo restaurar la consulta
        const success = await restoreConsultation(consultationId, patient.full_name)
        return { needsConfirmation: false }
      }
    } catch (error: any) {
      showError("Error al verificar", error.message || "No se pudo verificar el estado de la consulta")
      return { needsConfirmation: false }
    }
  }

  const restoreWithPatient = async (
    consultationId: string,
    patientId: string,
    patientName: string,
  ): Promise<boolean> => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        showError("Error de autenticación", "No se pudo verificar la sesión del usuario")
        return false
      }

      // Obtener historia médica
      const { data: medicalHistory } = await supabase
        .from("medical_histories")
        .select("id")
        .eq("patient_id", patientId)
        .single()

      // Restaurar en orden: paciente -> historia médica -> representantes -> consultas -> prescripciones
      // Restaurar paciente
      const { error: patientRestoreError } = await supabase
        .from("patients")
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", patientId)

      if (patientRestoreError) throw patientRestoreError

      if (medicalHistory) {
        // Restaurar historia médica
        const { error: historyError } = await supabase
          .from("medical_histories")
          .update({
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", medicalHistory.id)

        if (historyError) {
          console.error("Error restaurando historia médica:", historyError)
        }

        // Restaurar consultas
        const { error: consultationsError } = await supabase
          .from("consultations")
          .update({
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("medical_history_id", medicalHistory.id)

        if (consultationsError) {
          console.error("Error restaurando consultas:", consultationsError)
        }

        // Restaurar prescripciones
        const { error: prescriptionsError } = await supabase
          .from("prescriptions")
          .update({
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("medical_history_id", medicalHistory.id)

        if (prescriptionsError) {
          console.error("Error restaurando prescripciones:", prescriptionsError)
        }
      }

      // Restaurar representantes
      const { error: representativesError } = await supabase
        .from("patient_representatives")
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("patient_id", patientId)

      if (representativesError) {
        console.error("Error restaurando representantes:", representativesError)
      }

      showSuccess(
        "Paciente y consulta restaurados",
        `${patientName} y toda su historia clínica han sido restaurados correctamente`,
      )
      return true
    } catch (error: any) {
      showError("Error al restaurar", error.message || "No se pudo restaurar el paciente y la consulta")
      return false
    } finally {
      setLoading(false)
    }
  }

  /* 
  NO SE PERMITE ELIMINAR NIGÚN DATO POR CUMPLIMIENTO NORMATIVO

  const deleteConsultationPermanently = async (consultationId: string, patientName: string): Promise<boolean> => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        showError("Error de autenticación", "Debes iniciar sesión para realizar esta acción")
        return false
      }

      const { error } = await supabase.from("consultations").delete().eq("id", consultationId).eq("doctor_id", user.id)

      if (error) throw error

      showSuccess("Consulta eliminada", `La consulta de ${patientName} ha sido eliminada permanentemente`)
      return true
    } catch (error: any) {
      showError("Error al eliminar", error.message || "No se pudo eliminar la consulta")
      return false
    } finally {
      setLoading(false)
    }
  } */

  // Opción 2: Mantener como alias de archiveConsultation
  const deleteConsultation = archiveConsultation

  const duplicateConsultation = async (consultationId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      showError("Error de autenticación", "Debes iniciar sesión para realizar esta acción")
      return null
    }

    try {
      setLoading(true)

      const { data: originalConsultation, error: fetchError } = await supabase
        .from("consultations")
        .select("*")
        .eq("id", consultationId)
        .eq("doctor_id", user.id) // Verificar propiedad
        .single()

      if (fetchError) throw fetchError
      if (!originalConsultation) {
        showError("Error", "Consulta no encontrada")
        return null
      }

      const { data: newConsultation, error: insertError } = await supabase
        .from("consultations")
        .insert([{ ...originalConsultation, id: undefined, created_at: undefined, updated_at: undefined }])
        .select()
        .single()

      if (insertError) throw insertError

      showSuccess("Consulta Duplicada", "La consulta ha sido duplicada exitosamente.")
      return newConsultation
    } catch (error: any) {
      console.error("Error duplicando consulta:", error)
      showError("Error al Duplicar", "No se pudo duplicar la consulta. Inténtalo de nuevo.")
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    archiveConsultation,
    restoreConsultation,
    handleRestore,
    restoreWithPatient,
    deleteConsultation, 
    duplicateConsultation,
  }
}

