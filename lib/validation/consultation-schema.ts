import * as yup from "yup"

// Esquema de validación para el formulario de nueva consulta
export const consultationSchema = yup.object().shape({
  // Validación del paciente seleccionado
  selectedPatient: yup.object().nullable().required("Debe seleccionar un paciente para la consulta"),

  // Información básica de la consulta
  consultation_date: yup
    .string()
    .required("La fecha de consulta es obligatoria")
    .test("not-future", "La fecha de consulta no puede ser futura", (value) => {
      if (!value) return true
      const selectedDate = new Date(value)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // Permitir hasta el final del día actual
      return selectedDate <= today
    }),

  reason_for_visit: yup
    .string()
    .required("El motivo de la consulta es obligatorio")
    .min(3, "El motivo debe tener al menos 3 caracteres")
    .max(500, "El motivo no puede exceder 500 caracteres")
    .trim(),

  symptoms: yup.string().max(1000, "Los síntomas no pueden exceder 1000 caracteres").trim(),

  physical_examination: yup.string().max(1000, "El examen físico no puede exceder 1000 caracteres").trim(),

  diagnosis: yup.string().max(500, "El diagnóstico no puede exceder 500 caracteres").trim(),

  treatment_plan: yup.string().max(1000, "El plan de tratamiento no puede exceder 1000 caracteres").trim(),

  follow_up_date: yup
    .string()
    .nullable()
    .test("future-date", "La fecha de seguimiento debe ser futura", (value) => {
      if (!value) return true // Campo opcional
      const selectedDate = new Date(value)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return selectedDate >= today
    }),

  notes: yup.string().max(1000, "Las notas no pueden exceder 1000 caracteres").trim(),

  // Signos vitales - todos opcionales pero con validaciones de rango
  blood_pressure: yup
    .string()
    .nullable()
    .matches(/^(|\d{2,3}\/\d{2,3})$/, "Formato inválido. Use formato: 120/80"),

  temperature: yup
    .string()
    .nullable()
    .test("valid-temp", "La temperatura debe estar entre 30°C y 50°C", (value) => {
      if (!value || value === "") return true
      const temp = Number.parseFloat(value)
      return !Number.isNaN(temp) && temp >= 30 && temp <= 50
    }),

  heart_rate: yup
    .string()
    .nullable()
    .test("valid-heart-rate", "La frecuencia cardíaca debe estar entre 30 y 300", (value) => {
      if (!value || value === "") return true
      const rate = Number.parseInt(value)
      return !Number.isNaN(rate) && rate >= 30 && rate <= 300
    }),

  respiratory_rate: yup
    .string()
    .nullable()
    .test("valid-resp-rate", "La frecuencia respiratoria debe estar entre 5 y 100", (value) => {
      if (!value || value === "") return true
      const rate = Number.parseInt(value)
      return !Number.isNaN(rate) && rate >= 5 && rate <= 100
    }),

  height: yup
    .string()
    .nullable()
    .test("valid-height", "La altura debe estar entre 1 cm y 300 cm", (value) => {
      if (!value || value === "") return true
      const height = Number.parseFloat(value)
      return !Number.isNaN(height) && height >= 1 && height <= 300
    }),

  weight: yup
    .string()
    .nullable()
    .test("valid-weight", "El peso debe estar entre 0.1 kg y 1000 kg", (value) => {
      if (!value || value === "") return true
      const weight = Number.parseFloat(value)
      return !Number.isNaN(weight) && weight >= 0.1 && weight <= 1000
    }),
})

// Tipo para los datos del formulario
export type NewConsultationFormData = yup.InferType<typeof consultationSchema>

// Tipo para los errores de validación
export type ValidationErrors = {
  [K in keyof NewConsultationFormData]?: string
}
