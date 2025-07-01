"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/supabase"
import { useToastEnhanced } from "@/hooks/use-toast-enhanced"
import { prescriptionSchema, type PrescriptionFormData } from "@/lib/validation/prescription-schema"
import type { Doctor } from "@/lib/supabase/types/doctor"
import type { Prescription } from "@/lib/supabase/types/prescription"

interface UsePrescriptionFormProps {
  mode: "create" | "edit"
  prescriptionId?: string
  initialData?: Partial<PrescriptionFormData>
}

export function usePrescriptionForm({ mode, prescriptionId, initialData }: UsePrescriptionFormProps) {
  const router = useRouter()
  const { showError, showSuccess, showWarning } = useToastEnhanced()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [prescription, setPrescription] = useState<Prescription | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [medicalHistoryId, setMedicalHistoryId] = useState<string | null>(null)

  const [formData, setFormData] = useState<PrescriptionFormData>({
    patient_name: initialData?.patient_name || "",
    patient_age: initialData?.patient_age || 0,
    patient_cedula: initialData?.patient_cedula || null,
    patient_phone: initialData?.patient_phone || null,
    patient_address: initialData?.patient_address || null,
    diagnosis: initialData?.diagnosis || "",
    allergies: initialData?.allergies || "",
    medications: initialData?.medications || "",
    instructions: initialData?.instructions || "",
    notes: initialData?.notes || null,
    date_prescribed: initialData?.date_prescribed || new Date().toISOString().split("T")[0],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = async (): Promise<boolean> => {
    try {
      await prescriptionSchema.validate(formData, { abortEarly: false })
      setErrors({})
      return true
    } catch (error: any) {
      const validationErrors: Record<string, string> = {}

      if (error.inner) {
        error.inner.forEach((err: any) => {
          if (err.path) {
            validationErrors[err.path] = err.message
          }
        })
      }

      setErrors(validationErrors)

      // Mostrar el primer error en un toast
      const firstError = Object.values(validationErrors)[0]
      if (firstError) {
        showWarning("Error de validación", firstError)
      }

      return false
    }
  }

  const handleInputChange = (field: keyof PrescriptionFormData, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handlePatientSelect = async (patient: any) => {
    setSelectedPatient(patient)
    setMedicalHistoryId(null)

    // Actualizar datos del paciente en el formulario
    if (patient) {
      handleInputChange("patient_name", patient.full_name)
      handleInputChange("patient_cedula", patient.cedula || null)
      handleInputChange("patient_phone", patient.phone || null)
      handleInputChange("patient_address", patient.address || null)

      // Calcular edad si tiene fecha de nacimiento
      if (patient.birth_date) {
        const age = new Date().getFullYear() - new Date(patient.birth_date).getFullYear()
        handleInputChange("patient_age", age)
      }

      // Buscar historial médico si es un paciente registrado
      if (patient.id && !patient.id.toString().startsWith("temp_")) {
        try {
          const { data: medicalHistory, error: historyError } = await supabase
            .from("medical_histories")
            .select("id")
            .eq("patient_id", patient.id)
            .single()

          if (!historyError && medicalHistory) {
            setMedicalHistoryId(medicalHistory.id)
          }
        } catch (error) {
          console.error("Error al buscar historial médico:", error)
        }
      }
    }
  }

  const loadDoctor = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return false
      }

      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("*")
        .eq("id", user.id)
        .single()

      if (doctorError) throw doctorError

      setDoctor(doctorData)
      return true
    } catch (error: any) {
      console.error("Error loading doctor:", error.message)
      showError("Error de autenticación", "No se pudieron cargar los datos del médico")
      return false
    }
  }

  const loadPrescription = async () => {
    if (!prescriptionId) return false

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return false
      }

      const { data, error } = await supabase
        .from("prescriptions")
        .select(`*, doctor:doctors(*)`)
        .eq("id", prescriptionId)
        .eq("doctor_id", user.id)
        .single()

      if (error || !data) {
        showError("Receta no encontrada", "No se pudo cargar la receta solicitada")
        router.push("/dashboard/prescriptions")
        return false
      }

      setPrescription(data)
      setDoctor(data.doctor)

      // Cargar datos en el formulario
      setFormData({
        patient_name: data.patient_name || "",
        patient_age: data.patient_age || 0,
        patient_cedula: data.patient_cedula || null,
        patient_phone: data.patient_phone || null,
        patient_address: data.patient_address || null,
        diagnosis: data.diagnosis || "",
        allergies: data.allergies || "",
        medications: data.medications || "",
        instructions: data.instructions || "",
        notes: data.notes || null,
        date_prescribed: data.date_prescribed || new Date().toISOString().split("T")[0],
      })

      return true
    } catch (error: any) {
      console.error("Error loading prescription:", error.message)
      showError("Error de carga", "No se pudo cargar la receta")
      return false
    }
  }

  const submitForm = async () => {
    if (!doctor) {
      showError("Error", "No se han cargado los datos del médico")
      return false
    }

    // Validar formulario
    const isValid = await validateForm()
    if (!isValid) return false

    // Validaciones adicionales
    if (mode === "create" && !selectedPatient) {
      showWarning("Paciente requerido", "Debes seleccionar un paciente")
      return false
    }

    setSaving(true)
    try {
      const prescriptionData = {
        doctor_id: doctor.id,
        medical_history_id: medicalHistoryId,
        patient_name: formData.patient_name.trim(),
        patient_age: formData.patient_age,
        patient_cedula: formData.patient_cedula,
        patient_phone: formData.patient_phone,
        patient_address: formData.patient_address,
        diagnosis: formData.diagnosis.trim(),
        allergies: formData.allergies.trim(),
        medications: formData.medications.trim(),
        instructions: formData.instructions.trim(),
        notes: formData.notes,
        date_prescribed: formData.date_prescribed,
      }

      if (mode === "create") {
        const { data, error } = await supabase.from("prescriptions").insert(prescriptionData).select().single()

        if (error) throw error

        showSuccess("¡Receta creada!", `La receta para ${formData.patient_name} ha sido creada exitosamente`)
        router.push(`/dashboard/prescriptions/${data.id}`)
      } else {
        if (!prescription) throw new Error("No se encontró la receta a editar")

        const { error } = await supabase.from("prescriptions").update(prescriptionData).eq("id", prescription.id)

        if (error) throw error

        showSuccess("¡Receta actualizada!", `La receta para ${formData.patient_name} ha sido actualizada exitosamente`)
        router.push(`/dashboard/prescriptions/${prescription.id}`)
      }

      return true
    } catch (error: any) {
      console.error("Error saving prescription:", error)
      showError(
        mode === "create" ? "Error al crear receta" : "Error al actualizar receta",
        error.message || "Ha ocurrido un error inesperado",
      )
      return false
    } finally {
      setSaving(false)
    }
  }

  return {
    // Estado
    loading,
    saving,
    doctor,
    prescription,
    selectedPatient,
    medicalHistoryId,
    formData,
    errors,

    // Funciones
    handleInputChange,
    handlePatientSelect,
    loadDoctor,
    loadPrescription,
    submitForm,
    validateForm,

    // Utilidades
    setLoading,
    setSelectedPatient,
  }
}


// "use client"

// import { useState } from "react"
// import { useRouter } from "next/navigation"
// import { supabase } from "@/lib/supabase/supabase"
// import { useToastEnhanced } from "@/hooks/use-toast-enhanced"
// import { prescriptionSchema, type PrescriptionFormData } from "@/lib/validation/prescription-schema"
// import type { Doctor } from "@/lib/supabase/types/doctor"
// import type { Prescription } from "@/lib/supabase/types/prescription"

// interface UsePrescriptionFormProps {
//   mode: "create" | "edit"
//   prescriptionId?: string
//   initialData?: Partial<PrescriptionFormData>
// }

// export function usePrescriptionForm({ mode, prescriptionId, initialData }: UsePrescriptionFormProps) {
//   const router = useRouter()
//   const { showError, showSuccess, showWarning } = useToastEnhanced()

//   const [loading, setLoading] = useState(false)
//   const [saving, setSaving] = useState(false)
//   const [doctor, setDoctor] = useState<Doctor | null>(null)
//   const [prescription, setPrescription] = useState<Prescription | null>(null)
//   const [selectedPatient, setSelectedPatient] = useState<any>(null)
//   const [medicalHistoryId, setMedicalHistoryId] = useState<string | null>(null)

//   const [formData, setFormData] = useState<PrescriptionFormData>({
//     patient_name: initialData?.patient_name || "",
//     patient_age: initialData?.patient_age || null,
//     patient_cedula: initialData?.patient_cedula || null,
//     patient_phone: initialData?.patient_phone || null,
//     patient_address: initialData?.patient_address || null,
//     diagnosis: initialData?.diagnosis || null,
//     medications: initialData?.medications || "",
//     instructions: initialData?.instructions || "",
//     notes: initialData?.notes || null,
//     date_prescribed: initialData?.date_prescribed || new Date().toISOString().split("T")[0],
//   })

//   const [errors, setErrors] = useState<Record<string, string>>({})

//   const validateForm = async (): Promise<boolean> => {
//     try {
//       await prescriptionSchema.validate(formData, { abortEarly: false })
//       setErrors({})
//       return true
//     } catch (error: any) {
//       const validationErrors: Record<string, string> = {}

//       if (error.inner) {
//         error.inner.forEach((err: any) => {
//           if (err.path) {
//             validationErrors[err.path] = err.message
//           }
//         })
//       }

//       setErrors(validationErrors)

//       // Mostrar el primer error en un toast
//       const firstError = Object.values(validationErrors)[0]
//       if (firstError) {
//         showWarning("Error de validación", firstError)
//       }

//       return false
//     }
//   }

//   const handleInputChange = (field: keyof PrescriptionFormData, value: string | number | null) => {
//     setFormData((prev) => ({ ...prev, [field]: value }))

//     // Limpiar error del campo cuando el usuario empiece a escribir
//     if (errors[field]) {
//       setErrors((prev) => ({ ...prev, [field]: "" }))
//     }
//   }

//   const handlePatientSelect = async (patient: any) => {
//     setSelectedPatient(patient)
//     setMedicalHistoryId(null)

//     // Actualizar datos del paciente en el formulario
//     if (patient) {
//       handleInputChange("patient_name", patient.full_name)
//       handleInputChange("patient_cedula", patient.cedula || null)
//       handleInputChange("patient_phone", patient.phone || null)
//       handleInputChange("patient_address", patient.address || null)

//       // Calcular edad si tiene fecha de nacimiento
//       if (patient.birth_date) {
//         const age = new Date().getFullYear() - new Date(patient.birth_date).getFullYear()
//         handleInputChange("patient_age", age)
//       }

//       // Buscar historial médico si es un paciente registrado
//       if (patient.id && !patient.id.toString().startsWith("temp_")) {
//         try {
//           const { data: medicalHistory, error: historyError } = await supabase
//             .from("medical_histories")
//             .select("id")
//             .eq("patient_id", patient.id)
//             .single()

//           if (!historyError && medicalHistory) {
//             setMedicalHistoryId(medicalHistory.id)
//           }
//         } catch (error) {
//           console.error("Error al buscar historial médico:", error)
//         }
//       }
//     }
//   }

//   const loadDoctor = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()

//       if (!user) {
//         router.push("/login")
//         return false
//       }

//       const { data: doctorData, error: doctorError } = await supabase
//         .from("doctors")
//         .select("*")
//         .eq("id", user.id)
//         .single()

//       if (doctorError) throw doctorError

//       setDoctor(doctorData)
//       return true
//     } catch (error: any) {
//       console.error("Error loading doctor:", error.message)
//       showError("Error de autenticación", "No se pudieron cargar los datos del médico")
//       return false
//     }
//   }

//   const loadPrescription = async () => {
//     if (!prescriptionId) return false

//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()

//       if (!user) {
//         router.push("/login")
//         return false
//       }

//       const { data, error } = await supabase
//         .from("prescriptions")
//         .select(`*, doctor:doctors(*)`)
//         .eq("id", prescriptionId)
//         .eq("doctor_id", user.id)
//         .single()

//       if (error || !data) {
//         showError("Receta no encontrada", "No se pudo cargar la receta solicitada")
//         router.push("/dashboard/prescriptions")
//         return false
//       }

//       setPrescription(data)
//       setDoctor(data.doctor)

//       // Cargar datos en el formulario
//       setFormData({
//         patient_name: data.patient_name || "",
//         patient_age: data.patient_age || null,
//         patient_cedula: data.patient_cedula || null,
//         patient_phone: data.patient_phone || null,
//         patient_address: data.patient_address || null,
//         diagnosis: data.diagnosis || null,
//         medications: data.medications || "",
//         instructions: data.instructions || "",
//         notes: data.notes || null,
//         date_prescribed: data.date_prescribed || new Date().toISOString().split("T")[0],
//       })

//       return true
//     } catch (error: any) {
//       console.error("Error loading prescription:", error.message)
//       showError("Error de carga", "No se pudo cargar la receta")
//       return false
//     }
//   }

//   const submitForm = async () => {
//     if (!doctor) {
//       showError("Error", "No se han cargado los datos del médico")
//       return false
//     }

//     // Validar formulario
//     const isValid = await validateForm()
//     if (!isValid) return false

//     // Validaciones adicionales
//     if (mode === "create" && !selectedPatient) {
//       showWarning("Paciente requerido", "Debes seleccionar un paciente")
//       return false
//     }

//     setSaving(true)
//     try {
//       const prescriptionData = {
//         doctor_id: doctor.id,
//         medical_history_id: medicalHistoryId,
//         patient_name: formData.patient_name.trim(),
//         patient_age: formData.patient_age,
//         patient_cedula: formData.patient_cedula,
//         patient_phone: formData.patient_phone,
//         patient_address: formData.patient_address,
//         diagnosis: formData.diagnosis,
//         medications: formData.medications.trim(),
//         instructions: formData.instructions.trim(),
//         notes: formData.notes,
//         date_prescribed: formData.date_prescribed,
//       }

//       if (mode === "create") {
//         const { data, error } = await supabase.from("prescriptions").insert(prescriptionData).select().single()

//         if (error) throw error

//         showSuccess("¡Receta creada!", `La receta para ${formData.patient_name} ha sido creada exitosamente`)
//         router.push(`/dashboard/prescriptions/${data.id}`)
//       } else {
//         if (!prescription) throw new Error("No se encontró la receta a editar")

//         const { error } = await supabase.from("prescriptions").update(prescriptionData).eq("id", prescription.id)

//         if (error) throw error

//         showSuccess("¡Receta actualizada!", `La receta para ${formData.patient_name} ha sido actualizada exitosamente`)
//         router.push(`/dashboard/prescriptions/${prescription.id}`)
//       }

//       return true
//     } catch (error: any) {
//       console.error("Error saving prescription:", error)
//       showError(
//         mode === "create" ? "Error al crear receta" : "Error al actualizar receta",
//         error.message || "Ha ocurrido un error inesperado",
//       )
//       return false
//     } finally {
//       setSaving(false)
//     }
//   }

//   return {
//     // Estado
//     loading,
//     saving,
//     doctor,
//     prescription,
//     selectedPatient,
//     medicalHistoryId,
//     formData,
//     errors,

//     // Funciones
//     handleInputChange,
//     handlePatientSelect,
//     loadDoctor,
//     loadPrescription,
//     submitForm,
//     validateForm,

//     // Utilidades
//     setLoading,
//     setSelectedPatient,
//   }
// }
