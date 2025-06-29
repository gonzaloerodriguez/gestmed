"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/supabase"
import { useToastEnhanced } from "./use-toast-enhanced"
import type { Prescription } from "@/lib/supabase/types/prescription"

export function usePrescriptionOperations() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { showSuccess, showError } = useToastEnhanced()

  const archivePrescription = async (prescriptionId: string, patientName: string): Promise<boolean> => {
    setLoading(true)
    try {
      const { error } = await supabase.from("prescriptions").update({ is_active: false }).eq("id", prescriptionId)

      if (error) throw error

      showSuccess("Receta archivada", `La receta de ${patientName} ha sido archivada correctamente`)
      return true
    } catch (error: any) {
      showError("Error al archivar", error.message || "No se pudo archivar la receta")
      return false
    } finally {
      setLoading(false)
    }
  }

  const restorePrescription = async (prescriptionId: string, patientName: string): Promise<boolean> => {
    setLoading(true)
    try {
      const { error } = await supabase.from("prescriptions").update({ is_active: true }).eq("id", prescriptionId)

      if (error) throw error

      showSuccess("Receta restaurada", `La receta de ${patientName} ha sido restaurada correctamente`)
      return true
    } catch (error: any) {
      showError("Error al restaurar", error.message || "No se pudo restaurar la receta")
      return false
    } finally {
      setLoading(false)
    }
  }

  const deletePrescription = async (prescriptionId: string, patientName: string): Promise<boolean> => {
    setLoading(true)
    try {
      const { error } = await supabase.from("prescriptions").update({ is_active: false }).eq("id", prescriptionId)

      if (error) throw error

      showSuccess("Receta eliminada", `La receta de ${patientName} ha sido marcada como inactiva`)
      return true
    } catch (error: any) {
      showError("Error al eliminar", error.message || "No se pudo eliminar la receta")
      return false
    } finally {
      setLoading(false)
    }
  }

  const duplicatePrescription = async (prescription: Prescription): Promise<void> => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .insert({
          doctor_id: prescription.doctor_id,
          patient_name: prescription.patient_name,
          patient_age: prescription.patient_age,
          patient_cedula: prescription.patient_cedula,
          patient_phone: prescription.patient_phone,
          patient_address: prescription.patient_address,
          diagnosis: prescription.diagnosis,
          medications: prescription.medications,
          instructions: prescription.instructions,
          notes: prescription.notes,
          date_prescribed: new Date().toISOString().split("T")[0], // Fecha actual
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      showSuccess("Receta duplicada", `Se ha creado una copia de la receta para ${prescription.patient_name}`)

      // Navegar a la nueva receta
      router.push(`/dashboard/prescriptions/${data.id}`)
    } catch (error: any) {
      showError("Error al duplicar", error.message || "No se pudo duplicar la receta")
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    archivePrescription,
    restorePrescription,
    deletePrescription,
    duplicatePrescription,
  }
}


// "use client"

// import { useState } from "react"
// import { useRouter } from "next/navigation"
// import { supabase } from "@/lib/supabase/supabase"
// import { useToastEnhanced } from "./use-toast-enhanced"
// import type { Prescription } from "@/lib/supabase/types/prescription"

// export function usePrescriptionOperations() {
//   const [loading, setLoading] = useState(false)
//   const router = useRouter()
//   const { showSuccess, showError } = useToastEnhanced()

//   const archivePrescription = async (prescriptionId: string, patientName: string): Promise<boolean> => {
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

//       // Archivar la receta
//       const { error } = await supabase
//         .from("prescriptions")
//         .update({
//           is_active: false,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", prescriptionId)
//         .eq("doctor_id", user.id) // Verificar propiedad

//       if (error) throw error

//       showSuccess("Receta archivada", `La receta de ${patientName} ha sido archivada correctamente`)
//       return true
//     } catch (error: any) {
//       showError("Error al archivar", error.message || "No se pudo archivar la receta")
//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   const restorePrescription = async (prescriptionId: string, patientName: string): Promise<boolean> => {
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

//       // Restaurar la receta
//       const { error } = await supabase
//         .from("prescriptions")
//         .update({
//           is_active: true,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", prescriptionId)
//         .eq("doctor_id", user.id) // Verificar propiedad

//       if (error) throw error

//       showSuccess("Receta restaurada", `La receta de ${patientName} ha sido restaurada correctamente`)
//       return true
//     } catch (error: any) {
//       showError("Error al restaurar", error.message || "No se pudo restaurar la receta")
//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   const duplicatePrescription = async (prescription: Prescription): Promise<void> => {
//     setLoading(true)
//     try {
//       // Verificar autenticación
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()
//       if (!user) {
//         showError("Error de autenticación", "Debes iniciar sesión para realizar esta acción")
//         return
//       }

//       const { data, error } = await supabase
//         .from("prescriptions")
//         .insert({
//           doctor_id: user.id,
//           patient_name: prescription.patient_name,
//           patient_age: prescription.patient_age,
//           patient_cedula: prescription.patient_cedula,
//           patient_phone: prescription.patient_phone,
//           patient_address: prescription.patient_address,
//           diagnosis: prescription.diagnosis,
//           medications: prescription.medications,
//           instructions: prescription.instructions,
//           notes: prescription.notes,
//           date_prescribed: new Date().toISOString().split("T")[0], // Fecha actual
//           is_active: true,
//         })
//         .select()
//         .single()

//       if (error) throw error

//       showSuccess("Receta duplicada", `Se ha creado una copia de la receta para ${prescription.patient_name}`)

//       // Navegar a la nueva receta
//       router.push(`/dashboard/prescriptions/${data.id}`)
//     } catch (error: any) {
//       showError("Error al duplicar", error.message || "No se pudo duplicar la receta")
//     } finally {
//       setLoading(false)
//     }
//   }

//   // Mantener compatibilidad con el nombre anterior
//   const deletePrescription = archivePrescription

//   return {
//     loading,
//     archivePrescription,
//     restorePrescription,
//     duplicatePrescription,
//     deletePrescription, // Para compatibilidad
//   }
// }


// "use client"

// import { useState } from "react"
// import { useRouter } from "next/navigation"
// import { supabase } from "@/lib/supabase/supabase"
// import { useToastEnhanced } from "./use-toast-enhanced"
// import type { Prescription } from "@/lib/supabase/types/prescription"

// export function usePrescriptionOperations() {
//   const [loading, setLoading] = useState(false)
//   const router = useRouter()
//   const { showSuccess, showError } = useToastEnhanced()

//   const deletePrescription = async (prescriptionId: string, patientName: string): Promise<boolean> => {
//     setLoading(true)
//     try {
//       const { error } = await supabase.from("prescriptions").update({ is_active: false }).eq("id", prescriptionId)

//       if (error) throw error

//       showSuccess("Receta eliminada", `La receta de ${patientName} ha sido marcada como inactiva`)
//       return true
//     } catch (error: any) {
//       showError("Error al eliminar", error.message || "No se pudo eliminar la receta")
//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   const duplicatePrescription = async (prescription: Prescription): Promise<void> => {
//     setLoading(true)
//     try {
//       const { data, error } = await supabase
//         .from("prescriptions")
//         .insert({
//           doctor_id: prescription.doctor_id,
//           patient_name: prescription.patient_name,
//           patient_age: prescription.patient_age,
//           patient_cedula: prescription.patient_cedula,
//           patient_phone: prescription.patient_phone,
//           patient_address: prescription.patient_address,
//           diagnosis: prescription.diagnosis,
//           medications: prescription.medications,
//           instructions: prescription.instructions,
//           notes: prescription.notes,
//           date_prescribed: new Date().toISOString().split("T")[0], // Fecha actual
//           is_active: true,
//         })
//         .select()
//         .single()

//       if (error) throw error

//       showSuccess("Receta duplicada", `Se ha creado una copia de la receta para ${prescription.patient_name}`)

//       // Navegar a la nueva receta
//       router.push(`/dashboard/prescriptions/${data.id}`)
//     } catch (error: any) {
//       showError("Error al duplicar", error.message || "No se pudo duplicar la receta")
//     } finally {
//       setLoading(false)
//     }
//   }

//   return {
//     loading,
//     deletePrescription,
//     duplicatePrescription,
//   }
// }


// "use client"

// import { useState } from "react"
// import { useRouter } from "next/navigation"
// import { supabase } from "@/lib/supabase/supabase"
// import { useToastEnhanced } from "./use-toast-enhanced"
// import type { Prescription } from "@/lib/supabase/types/prescription"

// export function usePrescriptionOperations() {
//   const [loading, setLoading] = useState(false)
//   const { showSuccess, showError } = useToastEnhanced()
//   const router = useRouter()

//   const deletePrescription = async (prescriptionId: string, patientName: string) => {
//     setLoading(true)
//     try {
//       const { error } = await supabase.from("prescriptions").update({ is_active: false }).eq("id", prescriptionId)

//       if (error) throw error

//       showSuccess("Receta eliminada", `La receta de ${patientName} ha sido eliminada correctamente`)
//       return true
//     } catch (error: any) {
//       console.error("Error deleting prescription:", error.message)
//       showError("Error al eliminar", "No se pudo eliminar la receta. Inténtalo de nuevo.")
//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   const duplicatePrescription = async (prescription: Prescription) => {
//     setLoading(true)
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()

//       if (!user) {
//         showError("Error de autenticación", "No se pudo verificar la sesión del usuario")
//         return false
//       }

//       // Crear una nueva receta basada en la existente
//       const newPrescription = {
//         doctor_id: user.id,
//         patient_name: prescription.patient_name,
//         patient_cedula: prescription.patient_cedula,
//         patient_age: prescription.patient_age,
//         patient_phone: prescription.patient_phone,
//         patient_address: prescription.patient_address,
//         date_prescribed: new Date().toISOString().split("T")[0], // Fecha actual
//         diagnosis: prescription.diagnosis,
//         medications: prescription.medications,
//         instructions: prescription.instructions,
//         notes: prescription.notes,
//         is_active: true,
//       }

//       const { data, error } = await supabase.from("prescriptions").insert([newPrescription]).select().single()

//       if (error) throw error

//       showSuccess("Receta duplicada", `Se ha creado una nueva receta para ${prescription.patient_name}`)

//       // Navegar a la nueva receta
//       router.push(`/dashboard/prescriptions/${data.id}`)
//       return true
//     } catch (error: any) {
//       console.error("Error duplicating prescription:", error.message)
//       showError("Error al duplicar", "No se pudo duplicar la receta. Inténtalo de nuevo.")
//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   return {
//     loading,
//     deletePrescription,
//     duplicatePrescription,
//   }
// }
