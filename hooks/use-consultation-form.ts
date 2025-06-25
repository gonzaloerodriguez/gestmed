"use client"

import { useState, useCallback } from "react"
import type { PatientSelectorItem } from "@/lib/supabase/types/patient"
import {
  consultationSchema,
  type NewConsultationFormData,
  type ValidationErrors,
} from "@/lib/validation/consultation-schema"

export function useConsultationForm() {
  const [selectedPatient, setSelectedPatient] = useState<PatientSelectorItem | null>(null)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touchedFields, setTouchedFields] = useState<Set<keyof NewConsultationFormData>>(new Set())

  const [formData, setFormData] = useState({
    consultation_date: new Date().toISOString().split("T")[0],
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
    handleInputChange,
    handlePatientSelect,
    markFieldAsTouched,
    validateAllFields,
    markAllFieldsAsTouched,
  }
}
