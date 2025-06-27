import * as yup from "yup"

export const prescriptionSchema = yup.object({
  patient_name: yup
    .string()
    .required("El nombre del paciente es obligatorio")
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres")
    .trim(),

  patient_age: yup
    .number()
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === "" ? null : value
    })
    .min(0, "La edad no puede ser negativa")
    .max(150, "La edad no puede ser mayor a 150 años")
    .integer("La edad debe ser un número entero"),

  patient_cedula: yup
    .string()
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === "" ? null : value
    })
    .min(6, "La cédula debe tener al menos 6 caracteres")
    .max(20, "La cédula no puede exceder 20 caracteres")
    .matches(/^[0-9A-Za-z-]+$/, "La cédula solo puede contener números, letras y guiones"),

  patient_phone: yup
    .string()
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === "" ? null : value
    })
    .min(7, "El teléfono debe tener al menos 7 dígitos")
    .max(20, "El teléfono no puede exceder 20 caracteres")
    .matches(/^[0-9+\-\s()]+$/, "El teléfono solo puede contener números, +, -, espacios y paréntesis"),

  patient_address: yup
    .string()
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === "" ? null : value
    })
    .max(200, "La dirección no puede exceder 200 caracteres"),

  diagnosis: yup
    .string()
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === "" ? null : value
    })
    .max(1000, "El diagnóstico no puede exceder 1000 caracteres"),

  medications: yup
    .string()
    .required("Los medicamentos son obligatorios")
    .min(10, "Los medicamentos deben tener al menos 10 caracteres")
    .max(2000, "Los medicamentos no pueden exceder 2000 caracteres")
    .trim(),

  instructions: yup
    .string()
    .required("Las instrucciones son obligatorias")
    .min(10, "Las instrucciones deben tener al menos 10 caracteres")
    .max(1000, "Las instrucciones no pueden exceder 1000 caracteres")
    .trim(),

  notes: yup
    .string()
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === "" ? null : value
    })
    .max(500, "Las notas no pueden exceder 500 caracteres"),

  date_prescribed: yup
    .string()
    .required("La fecha de prescripción es obligatoria")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener el formato YYYY-MM-DD"),
})

export type PrescriptionFormData = yup.InferType<typeof prescriptionSchema>
