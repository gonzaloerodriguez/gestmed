import * as yup from "yup"

// Schema para validación del paciente
export const patientSchema = yup.object({
  full_name: yup
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres")
    .required("El nombre completo es obligatorio"),

  cedula: yup
    .string()
    .trim()
    .matches(/^\d*$/, "Solo se permiten números")
    .min(7, "Mínimo 7 dígitos")
    .max(10, "Máximo 10 dígitos")
    .optional()
    .default(""),

  phone: yup
    .string()
    .trim()
    .matches(/^\d*$/, "Solo se permiten números")
    .min(10, "Mínimo 10 dígitos")
    .max(15, "Máximo 15 dígitos")
    .optional()
    .default(""),

  address: yup.string().trim().max(500, "Máximo 500 caracteres").optional().default(""),

  birth_date: yup
    .string()
    .test("valid-date", "Fecha inválida", (value) => {
      if (!value) return true
      const date = new Date(value)
      return !isNaN(date.getTime()) && date <= new Date()
    })
    .test("min-age", "Fecha muy antigua", (value) => {
      if (!value) return true
      const date = new Date(value)
      const minDate = new Date()
      minDate.setFullYear(minDate.getFullYear() - 120)
      return date >= minDate
    })
    .optional()
    .default(""),
})

// Schema para validación del representante
export const representativeSchema = yup.object({
  full_name: yup
    .string()
    .trim()
    .when("$isRequired", {
      is: true,
      then: (schema) =>
        schema
          .min(2, "Mínimo 2 caracteres")
          .max(100, "Máximo 100 caracteres")
          .required("El nombre del representante es obligatorio"),
      otherwise: (schema) =>
        schema.min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres").optional().default(""),
    }),

  relationship: yup.string().when("$isRequired", {
    is: true,
    then: (schema) => schema.required("El parentesco es obligatorio"),
    otherwise: (schema) => schema.optional().default(""),
  }),

  cedula: yup
    .string()
    .trim()
    .matches(/^\d*$/, "Solo se permiten números")
    .min(7, "Mínimo 7 dígitos")
    .max(10, "Máximo 10 dígitos")
    .optional()
    .default(""),

  phone: yup
    .string()
    .trim()
    .matches(/^\d*$/, "Solo se permiten números")
    .min(10, "Mínimo 10 dígitos")
    .max(15, "Máximo 15 dígitos")
    .optional()
    .default(""),

  email: yup
    .string()
    .trim()
    .email("Formato de email inválido")
    .max(100, "Máximo 100 caracteres")
    .optional()
    .default(""),

  address: yup.string().trim().max(500, "Máximo 500 caracteres").optional().default(""),
})

// Tipos personalizados más específicos
export interface PatientFormData {
  full_name: string
  cedula: string
  phone: string
  address: string
  birth_date: string
}

export interface RepresentativeFormData {
  full_name: string
  relationship: string
  cedula: string
  phone: string
  email: string
  address: string
}
