"use client"

import { useState, useCallback, useEffect } from "react"
import type { PatientSelectorItem } from "@/lib/supabase/types/patient"
import type { Consultation } from "@/lib/supabase/types/consultations"
import { supabase } from "@/lib/supabase/supabase"
import {
  consultationSchema,
  type NewConsultationFormData,
  type ValidationErrors,
} from "@/lib/validation/consultation-schema"

interface UseEditConsultationFormProps {
  consultationId: string
}

export function useEditConsultationForm({ consultationId }: UseEditConsultationFormProps) {
  const [selectedPatient, setSelectedPatient] = useState<PatientSelectorItem | null>(null)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touchedFields, setTouchedFields] = useState<Set<keyof NewConsultationFormData>>(new Set())
  const [loading, setLoading] = useState(true)
  const [consultation, setConsultation] = useState<Consultation | null>(null)

  const [formData, setFormData] = useState({
    consultation_date: "",
    reason_for_visit: "",
    symptoms: "",
    physical_examination: "",
    diagnosis: "",
    treatment_plan: "",
    follow_up_date: "",
    notes: "",
    blood_pressure: "",
    temperature: "",
    heart_rate: "",
    respiratory_rate: "",
    height: "",
    weight: "",
  })

  // Cargar datos de la consulta existente
  useEffect(() => {
    loadConsultationData()
  }, [consultationId])

  const loadConsultationData = async () => {
    try {
      setLoading(true)

      // Cargar consulta con datos del paciente
      const { data: consultationData, error: consultationError } = await supabase
        .from("consultations")
        .select(`
          *,
          medical_history:medical_histories(
            patient:patients(
              id,
              full_name,
              cedula,
              phone,
              email,
              birth_date,
              address
            )
          )
        `)
        .eq("id", consultationId)
        .single()

      if (consultationError) throw consultationError

      setConsultation(consultationData)

      // Configurar datos del formulario
      const vitalSigns = consultationData.vital_signs ? JSON.parse(consultationData.vital_signs) : {}

      setFormData({
        consultation_date: consultationData.consultation_date.split("T")[0],
        reason_for_visit: consultationData.reason_for_visit || "",
        symptoms: consultationData.symptoms || "",
        physical_examination: consultationData.physical_examination || "",
        diagnosis: consultationData.diagnosis || "",
        treatment_plan: consultationData.treatment_plan || "",
        follow_up_date: consultationData.follow_up_date ? consultationData.follow_up_date.split("T")[0] : "",
        notes: consultationData.notes || "",
        blood_pressure: vitalSigns.bp || "",
        temperature: vitalSigns.temp ? vitalSigns.temp.toString() : "",
        heart_rate: vitalSigns.heart_rate ? vitalSigns.heart_rate.toString() : "",
        respiratory_rate: vitalSigns.respiratory_rate ? vitalSigns.respiratory_rate.toString() : "",
        height: vitalSigns.height ? vitalSigns.height.toString() : "",
        weight: vitalSigns.weight ? vitalSigns.weight.toString() : "",
      })

      // Configurar paciente seleccionado
      if (consultationData.medical_history?.patient) {
        setSelectedPatient(consultationData.medical_history.patient)
      }
    } catch (error) {
      console.error("Error cargando consulta:", error)
    } finally {
      setLoading(false)
    }
  }

  // Validación individual de campos
  const validateField = useCallback(
    async (field: keyof NewConsultationFormData, value: any) => {
      try {
        const dataToValidate = {
          selectedPatient,
          ...formData,
          [field]: value,
        }
        await consultationSchema.validateAt(field, dataToValidate)
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[field]
          return newErrors
        })
      } catch (error: any) {
        setErrors((prev) => ({ ...prev, [field]: error.message }))
      }
    },
    [formData, selectedPatient],
  )

  const handleInputChange = useCallback(
    (field: string, value: string) => {
      const typedField = field as keyof typeof formData
      setFormData((prev) => ({ ...prev, [typedField]: value }))
      // Validar después de un pequeño delay para mejor UX
      const timeoutId = setTimeout(() => {
        validateField(typedField as keyof NewConsultationFormData, value)
      }, 300)
      return () => clearTimeout(timeoutId)
    },
    [validateField],
  )

  const handlePatientSelect = useCallback(
    (patient: PatientSelectorItem | null) => {
      setSelectedPatient(patient)
      setTouchedFields((prev) => new Set(prev).add("selectedPatient"))
      validateField("selectedPatient", patient)
    },
    [validateField],
  )

  const markFieldAsTouched = (field: string) => {
    setTouchedFields((prev) => new Set(prev).add(field as keyof NewConsultationFormData))
  }

  // Validación completa del formulario
  const validateAllFields = async (): Promise<{ isValid: boolean; currentErrors: ValidationErrors }> => {
    const dataToValidate = {
      selectedPatient,
      ...formData,
    }

    const currentErrors: ValidationErrors = {}

    try {
      await consultationSchema.validate(dataToValidate, { abortEarly: false })
    } catch (error: any) {
      error.inner.forEach((err: any) => {
        currentErrors[err.path as keyof NewConsultationFormData] = err.message
      })
    }

    setErrors(currentErrors)
    const isValid = Object.keys(currentErrors).length === 0
    return { isValid, currentErrors }
  }

  const markAllFieldsAsTouched = () => {
    const allFields: (keyof NewConsultationFormData)[] = [
      "selectedPatient",
      "consultation_date",
      "reason_for_visit",
      "symptoms",
      "physical_examination",
      "diagnosis",
      "treatment_plan",
      "follow_up_date",
      "notes",
      "blood_pressure",
      "temperature",
      "heart_rate",
      "respiratory_rate",
      "height",
      "weight",
    ]
    setTouchedFields(new Set(allFields))
  }

  return {
    formData,
    selectedPatient,
    errors,
    touchedFields,
    loading,
    consultation,
    handleInputChange,
    handlePatientSelect,
    markFieldAsTouched,
    validateAllFields,
    markAllFieldsAsTouched,
    loadConsultationData,
  }
}
