"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/supabase"
import { useToastEnhanced } from "./use-toast-enhanced"
import type { Patient } from "@/lib/supabase/types/patient"

export function usePatientOperations() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { showSuccess, showError } = useToastEnhanced()

  const archivePatient = async (patient: Patient): Promise<boolean> => {
    if (!patient?.id) {
      showError("Error de validación", "Información del paciente no válida")
      return false
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        showError("Error de autenticación", "No se pudo verificar la sesión del usuario")
        return false
      }

      // Verificar que el paciente pertenece al doctor
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id, doctor_id, full_name")
        .eq("id", patient.id)
        .eq("doctor_id", user.id)
        .single()

      if (patientError || !patientData) {
        showError("Error de validación", "No se encontró el paciente o no tienes permisos para archivarlo")
        return false
      }

      // Obtener historia médica
      const { data: medicalHistory } = await supabase
        .from("medical_histories")
        .select("id")
        .eq("patient_id", patient.id)
        .single()

      // Archivar en cascada: consultas -> prescripciones -> representantes -> historia médica -> paciente
      if (medicalHistory) {
        // Archivar consultas
        const { error: consultationsError } = await supabase
          .from("consultations")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("medical_history_id", medicalHistory.id)

        if (consultationsError) {
          console.error("Error archivando consultas:", consultationsError)
        }

        // Archivar prescripciones
        const { error: prescriptionsError } = await supabase
          .from("prescriptions")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("medical_history_id", medicalHistory.id)

        if (prescriptionsError) {
          console.error("Error archivando prescripciones:", prescriptionsError)
        }

        // Archivar historia médica
        const { error: historyError } = await supabase
          .from("medical_histories")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", medicalHistory.id)

        if (historyError) {
          console.error("Error archivando historia médica:", historyError)
        }
      }

      // Archivar representantes
      const { error: representativesError } = await supabase
        .from("patient_representatives")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("patient_id", patient.id)

      if (representativesError) {
        console.error("Error archivando representantes:", representativesError)
      }

      // Finalmente archivar el paciente
      const { error: patientArchiveError } = await supabase
        .from("patients")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", patient.id)

      if (patientArchiveError) throw patientArchiveError

      showSuccess(
        "Paciente archivado",
        `${patientData.full_name} y toda su historia clínica han sido archivados correctamente`,
      )
      return true
    } catch (error: any) {
      showError("Error al archivar", error.message || "No se pudo archivar el paciente")
      return false
    } finally {
      setLoading(false)
    }
  }

  const restorePatient = async (patient: Patient): Promise<boolean> => {
    if (!patient?.id) {
      showError("Error de validación", "Información del paciente no válida")
      return false
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        showError("Error de autenticación", "No se pudo verificar la sesión del usuario")
        return false
      }

      // Verificar que el paciente pertenece al doctor
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id, doctor_id, full_name")
        .eq("id", patient.id)
        .eq("doctor_id", user.id)
        .single()

      if (patientError || !patientData) {
        showError("Error de validación", "No se encontró el paciente o no tienes permisos para restaurarlo")
        return false
      }

      // Obtener historia médica
      const { data: medicalHistory } = await supabase
        .from("medical_histories")
        .select("id")
        .eq("patient_id", patient.id)
        .single()

      // Restaurar en orden: paciente -> historia médica -> representantes -> consultas -> prescripciones
      // Restaurar paciente
      const { error: patientRestoreError } = await supabase
        .from("patients")
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", patient.id)

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
        .eq("patient_id", patient.id)

      if (representativesError) {
        console.error("Error restaurando representantes:", representativesError)
      }

      showSuccess(
        "Paciente restaurado",
        `${patientData.full_name} y toda su historia clínica han sido restaurados correctamente`,
      )
      return true
    } catch (error: any) {
      showError("Error al restaurar", error.message || "No se pudo restaurar el paciente")
      return false
    } finally {
      setLoading(false)
    }
  }

  const duplicatePatient = async (patient: Patient): Promise<boolean> => {
    if (!patient?.id) {
      showError("Error de validación", "Información del paciente no válida")
      return false
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        showError("Error de autenticación", "No se pudo verificar la sesión del usuario")
        return false
      }

      // Crear copia del paciente
      const newPatient = {
        doctor_id: user.id,
        full_name: `${patient.full_name} (Copia)`,
        cedula: null, // No duplicar cédula para evitar conflictos
        birth_date: patient.birth_date,
        gender: patient.gender,
        phone: patient.phone,
        address: patient.address,
        is_active: true,
      }

      const { data: createdPatient, error: createError } = await supabase
        .from("patients")
        .insert(newPatient)
        .select()
        .single()

      if (createError) throw createError

      // Crear historia médica básica para el nuevo paciente
      const { error: historyError } = await supabase.from("medical_histories").insert({
        patient_id: createdPatient.id,
        doctor_id: user.id,
        blood_type: null,
        allergies: null,
        chronic_conditions: null,
        current_medications: null,
        family_history: null,
        notes: `Duplicado de: ${patient.full_name}`,
        is_active: true,
      })

      if (historyError) {
        console.error("Error creando historia médica:", historyError)
      }

      showSuccess("Paciente duplicado", `Se ha creado una copia de ${patient.full_name}`)
      return true
    } catch (error: any) {
      showError("Error al duplicar", error.message || "No se pudo duplicar el paciente")
      return false
    } finally {
      setLoading(false)
    }
  }

  const deletePatient = async (patient: Patient): Promise<boolean> => {
    if (!patient?.id) {
      showError("Error de validación", "Información del paciente no válida")
      return false
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        showError("Error de autenticación", "No se pudo verificar la sesión del usuario")
        return false
      }

      // Verificar si el paciente tiene historia médica
      const { data: medicalHistories, error: historyError } = await supabase
        .from("medical_histories")
        .select("id")
        .eq("patient_id", patient.id)

      if (historyError) throw historyError

      if (medicalHistories && medicalHistories.length > 0) {
        // Si tiene historia médica, solo archivar
        return await archivePatient(patient)
      } else {
        // Si no tiene historia médica, eliminar permanentemente
        const { error: deleteError } = await supabase
          .from("patients")
          .delete()
          .eq("id", patient.id)
          .eq("doctor_id", user.id)

        if (deleteError) throw deleteError

        showSuccess("Paciente eliminado", `${patient.full_name} ha sido eliminado permanentemente`)
        return true
      }
    } catch (error: any) {
      showError("Error al eliminar", error.message || "No se pudo eliminar el paciente")
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    archivePatient,
    restorePatient,
    duplicatePatient,
    deletePatient,
  }
}

// "use client"

// import { useState } from "react"
// import { useRouter } from "next/navigation"
// import { supabase } from "@/lib/supabase/supabase"
// import { useToastEnhanced } from "./use-toast-enhanced"

// export function usePatientOperations() {
//   const [loading, setLoading] = useState(false)
//   const router = useRouter()
//   const { showSuccess, showError } = useToastEnhanced()

//   const archivePatient = async (patientId: string, patientName: string): Promise<boolean> => {
//     setLoading(true)
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()

//       if (!user) {
//         showError("Error de autenticación", "No se pudo verificar la sesión del usuario")
//         return false
//       }

//       // Verificar que el paciente pertenece al doctor
//       const { data: patient, error: patientError } = await supabase
//         .from("patients")
//         .select("id, doctor_id")
//         .eq("id", patientId)
//         .eq("doctor_id", user.id)
//         .single()

//       if (patientError || !patient) {
//         showError("Error de validación", "No se encontró el paciente o no tienes permisos para archivarlo")
//         return false
//       }

//       // Archivar paciente y datos relacionados en cascada
//       const { error: archiveError } = await supabase.rpc("archive_patient_cascade", {
//         patient_id: patientId,
//       })

//       if (archiveError) throw archiveError

//       showSuccess("Paciente archivado", `${patientName} y toda su historia clínica han sido archivados correctamente`)
//       return true
//     } catch (error: any) {
//       showError("Error al archivar", error.message || "No se pudo archivar el paciente")
//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   const restorePatient = async (patientId: string): Promise<boolean> => {
//     setLoading(true)
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()

//       if (!user) {
//         showError("Error de autenticación", "No se pudo verificar la sesión del usuario")
//         return false
//       }

//       // Verificar que el paciente pertenece al doctor
//       const { data: patient, error: patientError } = await supabase
//         .from("patients")
//         .select("id, doctor_id, full_name")
//         .eq("id", patientId)
//         .eq("doctor_id", user.id)
//         .single()

//       if (patientError || !patient) {
//         showError("Error de validación", "No se encontró el paciente o no tienes permisos para restaurarlo")
//         return false
//       }

//       // Restaurar paciente y datos relacionados en cascada
//       const { error: restoreError } = await supabase.rpc("restore_patient_cascade", {
//         patient_id: patientId,
//       })

//       if (restoreError) throw restoreError

//       showSuccess(
//         "Paciente restaurado",
//         `${patient.full_name} y toda su historia clínica han sido restaurados correctamente`,
//       )
//       return true
//     } catch (error: any) {
//       showError("Error al restaurar", error.message || "No se pudo restaurar el paciente")
//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   const deletePatient = async (patientId: string, patientName: string): Promise<boolean> => {
//     setLoading(true)
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()

//       if (!user) {
//         showError("Error de autenticación", "No se pudo verificar la sesión del usuario")
//         return false
//       }

//       // Verificar si el paciente tiene historia médica
//       const { data: medicalHistories, error: historyError } = await supabase
//         .from("medical_histories")
//         .select("id")
//         .eq("patient_id", patientId)

//       if (historyError) throw historyError

//       if (medicalHistories && medicalHistories.length > 0) {
//         // Si tiene historia médica, solo archivar
//         return await archivePatient(patientId, patientName)
//       } else {
//         // Si no tiene historia médica, eliminar permanentemente
//         const { error: deleteError } = await supabase
//           .from("patients")
//           .delete()
//           .eq("id", patientId)
//           .eq("doctor_id", user.id)

//         if (deleteError) throw deleteError

//         showSuccess("Paciente eliminado", `${patientName} ha sido eliminado permanentemente`)
//         return true
//       }
//     } catch (error: any) {
//       showError("Error al eliminar", error.message || "No se pudo eliminar el paciente")
//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   return {
//     loading,
//     archivePatient,
//     restorePatient,
//     deletePatient,
//   }
// }


// "use client"

// import { useState } from "react"
// import { useRouter } from "next/navigation"
// import { supabase } from "@/lib/supabase/supabase"
// import { useToast } from "@/hooks/use-toast"
// import type { Patient } from "@/lib/supabase/types/patient"

// export function usePatientOperations() {
//   const [loading, setLoading] = useState(false)
//   const { toast } = useToast()
//   const router = useRouter()

//   const archivePatient = async (patient: Patient): Promise<boolean> => {
//     if (!patient?.id) {
//       toast({
//         title: "Error",
//         description: "Información del paciente no válida",
//         variant: "destructive",
//       })
//       return false
//     }

//     setLoading(true)

//     try {
//       // Verificar que el paciente pertenece al doctor actual
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()
//       if (!user) {
//         throw new Error("Usuario no autenticado")
//       }

//       // Verificar propiedad del paciente
//       const { data: patientData, error: verifyError } = await supabase
//         .from("patients")
//         .select("doctor_id, full_name")
//         .eq("id", patient.id)
//         .single()

//       if (verifyError || !patientData) {
//         throw new Error("Paciente no encontrado")
//       }

//       if (patientData.doctor_id !== user.id) {
//         throw new Error("No tienes permisos para archivar este paciente")
//       }

//       // Obtener historia médica
//       const { data: medicalHistory } = await supabase
//         .from("medical_histories")
//         .select("id")
//         .eq("patient_id", patient.id)
//         .single()

//       // Archivar en orden: consultas -> prescripciones -> representantes -> historia médica -> paciente
//       if (medicalHistory) {
//         // Archivar consultas
//         const { error: consultationsError } = await supabase
//           .from("consultations")
//           .update({
//             is_active: false,
//             updated_at: new Date().toISOString(),
//           })
//           .eq("medical_history_id", medicalHistory.id)

//         if (consultationsError) {
//           console.error("Error archivando consultas:", consultationsError)
//         }

//         // Archivar prescripciones
//         const { error: prescriptionsError } = await supabase
//           .from("prescriptions")
//           .update({
//             is_active: false,
//             updated_at: new Date().toISOString(),
//           })
//           .eq("medical_history_id", medicalHistory.id)

//         if (prescriptionsError) {
//           console.error("Error archivando prescripciones:", prescriptionsError)
//         }

//         // Archivar historia médica
//         const { error: historyError } = await supabase
//           .from("medical_histories")
//           .update({
//             is_active: false,
//             updated_at: new Date().toISOString(),
//           })
//           .eq("id", medicalHistory.id)

//         if (historyError) {
//           console.error("Error archivando historia médica:", historyError)
//         }
//       }

//       // Archivar representantes
//       const { error: representativesError } = await supabase
//         .from("patient_representatives")
//         .update({
//           is_active: false,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("patient_id", patient.id)

//       if (representativesError) {
//         console.error("Error archivando representantes:", representativesError)
//       }

//       // Finalmente archivar el paciente
//       const { error: patientError } = await supabase
//         .from("patients")
//         .update({
//           is_active: false,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", patient.id)

//       if (patientError) throw patientError

//       toast({
//         title: "Paciente archivado",
//         description: `${patientData.full_name} y toda su historia clínica han sido archivados exitosamente.`,
//         variant: "default",
//       })

//       return true
//     } catch (error: any) {
//       console.error("Error archivando paciente:", error)

//       toast({
//         title: "Error al archivar paciente",
//         description: error.message || "Ocurrió un error inesperado",
//         variant: "destructive",
//       })

//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   const restorePatient = async (patient: Patient): Promise<boolean> => {
//     if (!patient?.id) {
//       toast({
//         title: "Error",
//         description: "Información del paciente no válida",
//         variant: "destructive",
//       })
//       return false
//     }

//     setLoading(true)

//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()
//       if (!user) {
//         throw new Error("Usuario no autenticado")
//       }

//       // Verificar propiedad del paciente
//       const { data: patientData, error: verifyError } = await supabase
//         .from("patients")
//         .select("doctor_id, full_name")
//         .eq("id", patient.id)
//         .single()

//       if (verifyError || !patientData) {
//         throw new Error("Paciente no encontrado")
//       }

//       if (patientData.doctor_id !== user.id) {
//         throw new Error("No tienes permisos para restaurar este paciente")
//       }

//       // Obtener historia médica
//       const { data: medicalHistory } = await supabase
//         .from("medical_histories")
//         .select("id")
//         .eq("patient_id", patient.id)
//         .single()

//       // Restaurar en orden: paciente -> historia médica -> representantes -> consultas -> prescripciones
//       // Restaurar paciente
//       const { error: patientError } = await supabase
//         .from("patients")
//         .update({
//           is_active: true,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("id", patient.id)

//       if (patientError) throw patientError

//       if (medicalHistory) {
//         // Restaurar historia médica
//         const { error: historyError } = await supabase
//           .from("medical_histories")
//           .update({
//             is_active: true,
//             updated_at: new Date().toISOString(),
//           })
//           .eq("id", medicalHistory.id)

//         if (historyError) {
//           console.error("Error restaurando historia médica:", historyError)
//         }

//         // Restaurar consultas
//         const { error: consultationsError } = await supabase
//           .from("consultations")
//           .update({
//             is_active: true,
//             updated_at: new Date().toISOString(),
//           })
//           .eq("medical_history_id", medicalHistory.id)

//         if (consultationsError) {
//           console.error("Error restaurando consultas:", consultationsError)
//         }

//         // Restaurar prescripciones
//         const { error: prescriptionsError } = await supabase
//           .from("prescriptions")
//           .update({
//             is_active: true,
//             updated_at: new Date().toISOString(),
//           })
//           .eq("medical_history_id", medicalHistory.id)

//         if (prescriptionsError) {
//           console.error("Error restaurando prescripciones:", prescriptionsError)
//         }
//       }

//       // Restaurar representantes
//       const { error: representativesError } = await supabase
//         .from("patient_representatives")
//         .update({
//           is_active: true,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("patient_id", patient.id)

//       if (representativesError) {
//         console.error("Error restaurando representantes:", representativesError)
//       }

//       toast({
//         title: "Paciente restaurado",
//         description: `${patientData.full_name} y toda su historia clínica han sido restaurados exitosamente.`,
//         variant: "default",
//       })

//       return true
//     } catch (error: any) {
//       console.error("Error restaurando paciente:", error)

//       toast({
//         title: "Error al restaurar paciente",
//         description: error.message || "Ocurrió un error inesperado",
//         variant: "destructive",
//       })

//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   const duplicatePatient = async (patient: Patient): Promise<boolean> => {
//     if (!patient?.id) {
//       toast({
//         title: "Error",
//         description: "Información del paciente no válida",
//         variant: "destructive",
//       })
//       return false
//     }

//     setLoading(true)

//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()
//       if (!user) {
//         throw new Error("Usuario no autenticado")
//       }

//       // Crear copia del paciente
//       const newPatient = {
//         doctor_id: user.id,
//         full_name: `${patient.full_name} (Copia)`,
//         cedula: null, // No duplicar cédula
//         birth_date: patient.birth_date,
//         gender: patient.gender,
//         phone: patient.phone,
//         address: patient.address,
//         is_active: true,
//       }

//       const { data: createdPatient, error: createError } = await supabase
//         .from("patients")
//         .insert(newPatient)
//         .select()
//         .single()

//       if (createError) throw createError

//       // Crear historia médica básica
//       const { error: historyError } = await supabase.from("medical_histories").insert({
//         patient_id: createdPatient.id,
//         doctor_id: user.id,
//         blood_type: null,
//         allergies: null,
//         chronic_conditions: null,
//         current_medications: null,
//         family_history: null,
//         notes: `Duplicado de: ${patient.full_name}`,
//         is_active: true,
//       })

//       if (historyError) {
//         console.error("Error creando historia médica:", historyError)
//       }

//       toast({
//         title: "Paciente duplicado",
//         description: `Se ha creado una copia de ${patient.full_name}`,
//         variant: "default",
//       })

//       return true
//     } catch (error: any) {
//       console.error("Error duplicando paciente:", error)

//       toast({
//         title: "Error al duplicar paciente",
//         description: error.message || "Ocurrió un error inesperado",
//         variant: "destructive",
//       })

//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   return {
//     archivePatient,
//     restorePatient,
//     duplicatePatient,
//     loading,
//   }
// }


// "use client"

// import { useState } from "react"
// import { useRouter } from "next/navigation"
// import { supabase } from "@/lib/supabase/supabase"
// import { useToast } from "@/hooks/use-toast"
// import type { Patient } from "@/lib/supabase/types/patient"

// export function usePatientOperations() {
//   const [loading, setLoading] = useState(false)
//   const { toast } = useToast()
//   const router = useRouter()

//   const deletePatient = async (patient: Patient): Promise<boolean> => {
//     if (!patient?.id) {
//       toast({
//         title: "Error",
//         description: "Información del paciente no válida",
//         variant: "destructive",
//       })
//       return false
//     }

//     setLoading(true)

//     try {
//       // Verificar que el paciente pertenece al doctor actual
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()
//       if (!user) {
//         throw new Error("Usuario no autenticado")
//       }

//       // Verificar propiedad del paciente
//       const { data: patientData, error: verifyError } = await supabase
//         .from("patients")
//         .select("doctor_id, full_name")
//         .eq("id", patient.id)
//         .single()

//       if (verifyError || !patientData) {
//         throw new Error("Paciente no encontrado")
//       }

//       if (patientData.doctor_id !== user.id) {
//         throw new Error("No tienes permisos para eliminar este paciente")
//       }

//       // Verificar si tiene consultas o prescripciones activas
//       const { data: medicalHistory } = await supabase
//         .from("medical_histories")
//         .select("id")
//         .eq("patient_id", patient.id)
//         .single()

//       if (medicalHistory) {
//         // Verificar consultas
//         const { data: consultations, error: consultError } = await supabase
//           .from("consultations")
//           .select("id")
//           .eq("medical_history_id", medicalHistory.id)
//           .limit(1)

//         if (consultError) {
//           console.error("Error verificando consultas:", consultError)
//         }

//         // Verificar prescripciones
//         const { data: prescriptions, error: prescError } = await supabase
//           .from("prescriptions")
//           .select("id")
//           .eq("medical_history_id", medicalHistory.id)
//           .limit(1)

//         if (prescError) {
//           console.error("Error verificando prescripciones:", prescError)
//         }

//         // Si tiene datos médicos, hacer soft delete
//         if ((consultations && consultations.length > 0) || (prescriptions && prescriptions.length > 0)) {
//           const { error: softDeleteError } = await supabase
//             .from("patients")
//             .update({
//               is_active: false,
//               updated_at: new Date().toISOString(),
//             })
//             .eq("id", patient.id)

//           if (softDeleteError) throw softDeleteError

//           toast({
//             title: "Paciente desactivado",
//             description: `${patientData.full_name} ha sido desactivado debido a que tiene historial médico. Sus datos se mantienen por seguridad.`,
//             variant: "default",
//           })

//           return true
//         }
//       }

//       // Si no tiene historial médico, eliminar completamente
//       // Primero eliminar representantes
//       const { error: repError } = await supabase.from("patient_representatives").delete().eq("patient_id", patient.id)

//       if (repError) {
//         console.error("Error eliminando representantes:", repError)
//         // Continuar con la eliminación del paciente
//       }

//       // Eliminar historia médica si existe
//       if (medicalHistory) {
//         const { error: historyError } = await supabase.from("medical_histories").delete().eq("patient_id", patient.id)

//         if (historyError) {
//           console.error("Error eliminando historia médica:", historyError)
//         }
//       }

//       // Finalmente eliminar el paciente
//       const { error: deleteError } = await supabase.from("patients").delete().eq("id", patient.id)

//       if (deleteError) throw deleteError

//       toast({
//         title: "Paciente eliminado",
//         description: `${patientData.full_name} ha sido eliminado exitosamente.`,
//         variant: "default",
//       })

//       return true
//     } catch (error: any) {
//       console.error("Error eliminando paciente:", error)

//       toast({
//         title: "Error al eliminar paciente",
//         description: error.message || "Ocurrió un error inesperado",
//         variant: "destructive",
//       })

//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   const duplicatePatient = async (patient: Patient): Promise<boolean> => {
//     if (!patient?.id) {
//       toast({
//         title: "Error",
//         description: "Información del paciente no válida",
//         variant: "destructive",
//       })
//       return false
//     }

//     setLoading(true)

//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()
//       if (!user) {
//         throw new Error("Usuario no autenticado")
//       }

//       // Crear copia del paciente
//       const newPatient = {
//         doctor_id: user.id,
//         full_name: `${patient.full_name} (Copia)`,
//         cedula: null, // No duplicar cédula
//         birth_date: patient.birth_date,
//         gender: patient.gender,
//         phone: patient.phone,
//         address: patient.address,
//         is_active: true,
//       }

//       const { data: createdPatient, error: createError } = await supabase
//         .from("patients")
//         .insert(newPatient)
//         .select()
//         .single()

//       if (createError) throw createError

//       // Crear historia médica básica
//       const { error: historyError } = await supabase.from("medical_histories").insert({
//         patient_id: createdPatient.id,
//         blood_type: null,
//         allergies: null,
//         chronic_conditions: null,
//         current_medications: null,
//         family_history: null,
//         notes: `Duplicado de: ${patient.full_name}`,
//       })

//       if (historyError) {
//         console.error("Error creando historia médica:", historyError)
//       }

//       toast({
//         title: "Paciente duplicado",
//         description: `Se ha creado una copia de ${patient.full_name}`,
//         variant: "default",
//       })

//       return true
//     } catch (error: any) {
//       console.error("Error duplicando paciente:", error)

//       toast({
//         title: "Error al duplicar paciente",
//         description: error.message || "Ocurrió un error inesperado",
//         variant: "destructive",
//       })

//       return false
//     } finally {
//       setLoading(false)
//     }
//   }

//   return {
//     deletePatient,
//     duplicatePatient,
//     loading,
//   }
// }
