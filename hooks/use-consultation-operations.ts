"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/supabase"
import { useToastEnhanced } from "@/hooks/use-toast-enhanced"

export function useConsultationOperations() {
  const [loading, setLoading] = useState(false)
  const { showSuccess, showError } = useToastEnhanced()

  const archiveConsultation = async (consultationId: string, patientName: string): Promise<boolean> => {
    setLoading(true)
    try {
      const { error } = await supabase.from("consultations").update({ is_active: false }).eq("id", consultationId)

      if (error) throw error

      showSuccess("Consulta archivada", `La consulta de ${patientName} ha sido archivada correctamente`)
      return true
    } catch (error: any) {
      showError("Error al archivar", error.message || "No se pudo archivar la consulta")
      return false
    } finally {
      setLoading(false)
    }
  }

  const restoreConsultation = async (consultationId: string, patientName: string): Promise<boolean> => {
    setLoading(true)
    try {
      const { error } = await supabase.from("consultations").update({ is_active: true }).eq("id", consultationId)

      if (error) throw error

      showSuccess("Consulta restaurada", `La consulta de ${patientName} ha sido restaurada correctamente`)
      return true
    } catch (error: any) {
      showError("Error al restaurar", error.message || "No se pudo restaurar la consulta")
      return false
    } finally {
      setLoading(false)
    }
  }

  const deleteConsultation = async (consultationId: string, patientName: string): Promise<boolean> => {
    setLoading(true)
    try {
      const { error } = await supabase.from("consultations").update({ is_active: false }).eq("id", consultationId)

      if (error) throw error

      showSuccess("Consulta eliminada", `La consulta de ${patientName} ha sido archivada correctamente`)
      return true
    } catch (error: any) {
      showError("Error al eliminar", error.message || "No se pudo eliminar la consulta")
      return false
    } finally {
      setLoading(false)
    }
  }

  const duplicateConsultation = async (consultationId: string): Promise<string | null> => {
    setLoading(true)
    try {
      // Obtener la consulta original
      const { data: originalConsultation, error: fetchError } = await supabase
        .from("consultations")
        .select("*")
        .eq("id", consultationId)
        .single()

      if (fetchError) throw fetchError

      // Crear nueva consulta basada en la original
      const newConsultationData = {
        ...originalConsultation,
        id: undefined, // Remover ID para crear nueva
        consultation_date: new Date().toISOString(),
        created_at: undefined,
        updated_at: undefined,
      }

      const { data: newConsultation, error: createError } = await supabase
        .from("consultations")
        .insert(newConsultationData)
        .select()
        .single()

      if (createError) throw createError

      showSuccess("Consulta duplicada", "Se ha creado una nueva consulta basada en la original")
      return newConsultation.id
    } catch (error: any) {
      showError("Error al duplicar", error.message || "No se pudo duplicar la consulta")
      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    archiveConsultation,
    restoreConsultation,
    deleteConsultation,
    duplicateConsultation,
  }
}


// "use client"

// import { useState } from "react"
// import { supabase } from "@/lib/supabase/supabase"
// import { useToastEnhanced } from "@/hooks/use-toast-enhanced"

// export function useConsultationOperations() {
//   const [loading, setLoading] = useState(false)
//   const { showSuccess, showError } = useToastEnhanced()

//   const archiveConsultation = async (consultationId: string, patientName: string): Promise<boolean> => {
//     setLoading(true)
//     try {
//       // Verificar autenticación
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()
//       if (!user) {
//         showError("Error de autenticación", "No se pudo verificar la sesión del usuario")
//         return false
//       }

//       // Archivar la consulta (soft delete)
//       const { error } = await supabase
//         .from("consultations")
//         .update({
//           is_active: false,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", consultationId)
//         .eq("doctor_id", user.id) // Verificar que sea el doctor propietario

//       if (error) throw error

//       showSuccess(
//         "Consulta Archivada",
//         `La consulta de ${patientName} ha sido archivada correctamente. Puedes restaurarla desde la sección de archivados.`,
//       )
//       return true
//     } catch (error: any) {
//       console.error("Error archivando consulta:", error)
//       showError("Error al Archivar", error.message || "No se pudo archivar la consulta")
//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   const restoreConsultation = async (consultationId: string, patientName: string): Promise<boolean> => {
//     setLoading(true)
//     try {
//       // Verificar autenticación
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()
//       if (!user) {
//         showError("Error de autenticación", "No se pudo verificar la sesión del usuario")
//         return false
//       }

//       // Restaurar la consulta
//       const { error } = await supabase
//         .from("consultations")
//         .update({
//           is_active: true,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", consultationId)
//         .eq("doctor_id", user.id) // Verificar que sea el doctor propietario

//       if (error) throw error

//       showSuccess(
//         "Consulta Restaurada",
//         `La consulta de ${patientName} ha sido restaurada correctamente y ya está disponible en la lista principal.`,
//       )
//       return true
//     } catch (error: any) {
//       console.error("Error restaurando consulta:", error)
//       showError("Error al Restaurar", error.message || "No se pudo restaurar la consulta")
//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   const deleteConsultation = async (consultationId: string, patientName: string): Promise<boolean> => {
//     setLoading(true)
//     try {
//       // Verificar autenticación
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()
//       if (!user) {
//         showError("Error de autenticación", "No se pudo verificar la sesión del usuario")
//         return false
//       }

//       // Eliminar permanentemente (solo para casos especiales)
//       const { error } = await supabase.from("consultations").delete().eq("id", consultationId).eq("doctor_id", user.id) // Verificar que sea el doctor propietario

//       if (error) throw error

//       showSuccess("Consulta Eliminada", `La consulta de ${patientName} ha sido eliminada permanentemente`)
//       return true
//     } catch (error: any) {
//       console.error("Error eliminando consulta:", error)
//       showError("Error al Eliminar", error.message || "No se pudo eliminar la consulta")
//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   const duplicateConsultation = async (consultationId: string): Promise<string | null> => {
//     setLoading(true)
//     try {
//       // Verificar autenticación
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()
//       if (!user) {
//         showError("Error de autenticación", "No se pudo verificar la sesión del usuario")
//         return null
//       }

//       // Obtener la consulta original
//       const { data: originalConsultation, error: fetchError } = await supabase
//         .from("consultations")
//         .select("*")
//         .eq("id", consultationId)
//         .eq("doctor_id", user.id)
//         .single()

//       if (fetchError) throw fetchError

//       // Crear nueva consulta basada en la original
//       const newConsultationData = {
//         medical_history_id: originalConsultation.medical_history_id,
//         doctor_id: user.id,
//         consultation_date: new Date().toISOString(),
//         reason_for_visit: originalConsultation.reason_for_visit,
//         symptoms: originalConsultation.symptoms,
//         physical_examination: originalConsultation.physical_examination,
//         diagnosis: originalConsultation.diagnosis,
//         treatment_plan: originalConsultation.treatment_plan,
//         notes: originalConsultation.notes,
//         vital_signs: originalConsultation.vital_signs,
//         status: "in_progress", // Nueva consulta empieza como pendiente
//         is_active: true,
//       }

//       const { data: newConsultation, error: createError } = await supabase
//         .from("consultations")
//         .insert(newConsultationData)
//         .select()
//         .single()

//       if (createError) throw createError

//       showSuccess("Consulta Duplicada", "Se ha creado una nueva consulta basada en la original")
//       return newConsultation.id
//     } catch (error: any) {
//       console.error("Error duplicando consulta:", error)
//       showError("Error al Duplicar", error.message || "No se pudo duplicar la consulta")
//       return null
//     } finally {
//       setLoading(false)
//     }
//   }

//   return {
//     loading,
//     archiveConsultation,
//     restoreConsultation,
//     deleteConsultation,
//     duplicateConsultation,
//   }
// }


// "use client"

// import { useState } from "react"
// import { supabase } from "@/lib/supabase/supabase"
// import { useToastEnhanced } from "@/hooks/use-toast-enhanced"

// export function useConsultationOperations() {
//   const [loading, setLoading] = useState(false)
//   const { showSuccess, showError } = useToastEnhanced()

//   const archiveConsultation = async (consultationId: string, patientName: string): Promise<boolean> => {
//     setLoading(true)
//     try {
//       // Verificar autenticación
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()
//       if (!user) {
//         showError("Error de autenticación", "Debes iniciar sesión para realizar esta acción")
//         return false
//       }

//       // Archivar la consulta
//       const { error } = await supabase
//         .from("consultations")
//         .update({
//           is_active: false,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", consultationId)
//         .eq("doctor_id", user.id) // Verificar propiedad

//       if (error) throw error

//       showSuccess("Consulta archivada", `La consulta de ${patientName} ha sido archivada correctamente`)
//       return true
//     } catch (error: any) {
//       showError("Error al archivar", error.message || "No se pudo archivar la consulta")
//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   const restoreConsultation = async (consultationId: string, patientName: string): Promise<boolean> => {
//     setLoading(true)
//     try {
//       // Verificar autenticación
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()
//       if (!user) {
//         showError("Error de autenticación", "Debes iniciar sesión para realizar esta acción")
//         return false
//       }

//       // Restaurar la consulta
//       const { error } = await supabase
//         .from("consultations")
//         .update({
//           is_active: true,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", consultationId)
//         .eq("doctor_id", user.id) // Verificar propiedad

//       if (error) throw error

//       showSuccess("Consulta restaurada", `La consulta de ${patientName} ha sido restaurada correctamente`)
//       return true
//     } catch (error: any) {
//       showError("Error al restaurar", error.message || "No se pudo restaurar la consulta")
//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   const duplicateConsultation = async (consultationId: string): Promise<string | null> => {
//     setLoading(true)
//     try {
//       // Verificar autenticación
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()
//       if (!user) {
//         showError("Error de autenticación", "Debes iniciar sesión para realizar esta acción")
//         return null
//       }

//       // Obtener la consulta original
//       const { data: originalConsultation, error: fetchError } = await supabase
//         .from("consultations")
//         .select("*")
//         .eq("id", consultationId)
//         .eq("doctor_id", user.id) // Verificar propiedad
//         .single()

//       if (fetchError) throw fetchError

//       // Crear nueva consulta basada en la original
//       const newConsultationData = {
//         medical_history_id: originalConsultation.medical_history_id,
//         doctor_id: user.id,
//         consultation_date: new Date().toISOString(),
//         reason_for_visit: originalConsultation.reason_for_visit,
//         symptoms: originalConsultation.symptoms,
//         physical_examination: originalConsultation.physical_examination,
//         diagnosis: originalConsultation.diagnosis,
//         treatment_plan: originalConsultation.treatment_plan,
//         notes: originalConsultation.notes,
//         vital_signs: originalConsultation.vital_signs,
//         is_active: true,
//       }

//       const { data: newConsultation, error: createError } = await supabase
//         .from("consultations")
//         .insert(newConsultationData)
//         .select()
//         .single()

//       if (createError) throw createError

//       showSuccess("Consulta duplicada", "Se ha creado una nueva consulta basada en la original")
//       return newConsultation.id
//     } catch (error: any) {
//       showError("Error al duplicar", error.message || "No se pudo duplicar la consulta")
//       return null
//     } finally {
//       setLoading(false)
//     }
//   }

//   // Mantener compatibilidad con el nombre anterior
//   const deleteConsultation = archiveConsultation

//   return {
//     loading,
//     archiveConsultation,
//     restoreConsultation,
//     duplicateConsultation,
//     deleteConsultation, // Para compatibilidad
//   }
// }


// "use client"

// import { useState } from "react"
// import { supabase } from "@/lib/supabase/supabase"
// import { useToastEnhanced } from "@/hooks/use-toast-enhanced"

// export function useConsultationOperations() {
//   const [loading, setLoading] = useState(false)
//   const { showSuccess, showError } = useToastEnhanced()

//   const deleteConsultation = async (consultationId: string, patientName: string) => {
//     setLoading(true)
//     try {
//       const { error } = await supabase.from("consultations").delete().eq("id", consultationId)

//       if (error) throw error

//       showSuccess("Consulta Eliminada", `La consulta de ${patientName} ha sido eliminada exitosamente`)
//       return true
//     } catch (error: any) {
//       console.error("Error eliminando consulta:", error)
//       showError("Error al Eliminar", error.message || "No se pudo eliminar la consulta")
//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   const duplicateConsultation = async (consultationId: string) => {
//     setLoading(true)
//     try {
//       // Obtener la consulta original
//       const { data: originalConsultation, error: fetchError } = await supabase
//         .from("consultations")
//         .select("*")
//         .eq("id", consultationId)
//         .single()

//       if (fetchError) throw fetchError

//       // Crear nueva consulta basada en la original
//       const newConsultationData = {
//         ...originalConsultation,
//         id: undefined, // Remover ID para crear nueva
//         consultation_date: new Date().toISOString(),
//         created_at: undefined,
//         updated_at: undefined,
//       }

//       const { data: newConsultation, error: createError } = await supabase
//         .from("consultations")
//         .insert(newConsultationData)
//         .select()
//         .single()

//       if (createError) throw createError

//       showSuccess("Consulta Duplicada", "Se ha creado una nueva consulta basada en la original")
//       return newConsultation.id
//     } catch (error: any) {
//       console.error("Error duplicando consulta:", error)
//       showError("Error al Duplicar", error.message || "No se pudo duplicar la consulta")
//       return null
//     } finally {
//       setLoading(false)
//     }
//   }

//   return {
//     loading,
//     deleteConsultation,
//     duplicateConsultation,
//   }
// }
