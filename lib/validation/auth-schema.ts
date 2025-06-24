import * as yup from "yup"

// Schema para validación de login
export const loginSchema = yup.object({
  email: yup.string().trim().email("Formato de email inválido").required("El email es obligatorio"),

  password: yup
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .required("La contraseña es obligatoria"),
})

// Schema para validación de registro
export const registerSchema = yup.object({
  fullName: yup
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres")
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Solo se permiten letras y espacios")
    .required("El nombre completo es obligatorio"),

  cedula: yup
    .string()
    .trim()
    .matches(/^\d+$/, "Solo se permiten números")
    .min(7, "Mínimo 7 dígitos")
    .max(10, "Máximo 10 dígitos")
    .required("La cédula es obligatoria"),

  email: yup.string().trim().email("Formato de email inválido").required("El email es obligatorio"),

  password: yup
    .string()
    .min(8, "Mínimo 8 caracteres")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Debe contener al menos: 1 minúscula, 1 mayúscula y 1 número")
    .required("La contraseña es obligatoria"),

  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Las contraseñas no coinciden")
    .required("Confirmar contraseña es obligatorio"),

  gender: yup
    .string()
    .test("is-valid-gender", "Selecciona un género válido", (value) => {
      return value === "male" || value === "female"
    })
    .required("El género es obligatorio"),

  licenseNumber: yup
    .string()
    .trim()
    .matches(/^[A-Z0-9-]+$/, "Formato de matrícula inválido")
    .min(3, "Mínimo 3 caracteres")
    .max(20, "Máximo 20 caracteres")
    .required("El número de matrícula es obligatorio"),

  specialty: yup.string().trim().max(100, "Máximo 100 caracteres").optional().default(""),
})

// Tipos personalizados más flexibles
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  fullName: string
  cedula: string
  email: string
  password: string
  confirmPassword: string
  gender: string // Más flexible que "male" | "female"
  licenseNumber: string
  specialty: string
}

// Schema para validación de archivos
export const fileValidationSchema = yup.object({
  accessDocument: yup
    .mixed<File>()
    .required("El documento ACCESS es obligatorio")
    .test("fileSize", "El archivo es muy grande (máximo 5MB)", (value) => {
      if (!value) return false
      return (value as File).size <= 5 * 1024 * 1024 // 5MB
    })
    .test("fileType", "Formato no válido (PDF, JPG, PNG)", (value) => {
      if (!value) return false
      const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
      return allowedTypes.includes((value as File).type)
    }),

  paymentProof: yup.mixed<File>().when("$isRequired", {
    is: true,
    then: (schema) =>
      schema
        .required("El comprobante de pago es obligatorio")
        .test("fileSize", "El archivo es muy grande (máximo 5MB)", (value) => {
          if (!value) return false
          return (value as File).size <= 5 * 1024 * 1024 // 5MB
        })
        .test("fileType", "Formato no válido (PDF, JPG, PNG)", (value) => {
          if (!value) return false
          const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
          return allowedTypes.includes((value as File).type)
        }),
    otherwise: (schema) => schema.nullable(),
  }),

  acceptTerms: yup.boolean().oneOf([true], "Debes aceptar los términos y condiciones"),
})

export interface FileValidationData {
  accessDocument?: File
  paymentProof?: File | null
  acceptTerms: boolean
}
