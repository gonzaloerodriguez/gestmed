import { toast } from "sonner"

export function useToastEnhanced() {
  const showSuccess = (title: string, description?: string) => {
    console.log("Ejecutando showSuccess:", title, description) // Debug
    toast.success(title, {
      description,
      duration: 4000,
    })
  }

  const showError = (title: string, description?: string) => {
    console.log("Ejecutando showError:", title, description) // Debug
    toast.error(title, {
      description,
      duration: 6000,
    })
  }

  const showWarning = (title: string, description?: string) => {
    console.log("Ejecutando showWarning:", title, description) // Debug
    toast.warning(title, {
      description,
      duration: 5000,
    })
  }

  const showInfo = (title: string, description?: string) => {
    console.log("Ejecutando showInfo:", title, description) // Debug
    toast.info(title, {
      description,
      duration: 4000,
    })
  }

  const showConsultationSaved = (patientName: string) => {
    console.log("Ejecutando showConsultationSaved para:", patientName) // Debug
    toast.success("Consulta Registrada", {
      description: `La consulta para ${patientName} se ha guardado exitosamente`,
      duration: 4000,
    })
  }

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConsultationSaved,
    showPatientSaved: (patientName: string, isUpdate = false) => {
      console.log("Ejecutando showPatientSaved para:", patientName) // Debug
      toast.success(isUpdate ? "Paciente Actualizado" : "Paciente Creado", {
        description: `${patientName} ha sido ${isUpdate ? "actualizado" : "registrado"} exitosamente`,
        duration: 4000,
      })
    },
  }
}


// import { toast } from "sonner"

// export function useToastEnhanced() {
//   const showSuccess = (title: string, description?: string) => {
//     toast.success(title, {
//       description,
//       duration: 4000,
//     })
//   }

//   const showError = (title: string, description?: string) => {
//     toast.error(title, {
//       description,
//       duration: 6000,
//     })
//   }

//   const showWarning = (title: string, description?: string) => {
//     toast.warning(title, {
//       description,
//       duration: 5000,
//     })
//   }

//   const showInfo = (title: string, description?: string) => {
//     toast.info(title, {
//       description,
//       duration: 4000,
//     })
//   }

//   const showConsultationSaved = (patientName: string) => {
//     toast.success("Consulta Registrada", {
//       description: `La consulta para ${patientName} se ha guardado exitosamente`,
//       duration: 4000,
//     })
//   }

//   return {
//     showSuccess,
//     showError,
//     showWarning,
//     showInfo,
//     showConsultationSaved,
//     showPatientSaved: (patientName: string, isUpdate = false) => {
//       toast.success(isUpdate ? "Paciente Actualizado" : "Paciente Creado", {
//         description: `${patientName} ha sido ${isUpdate ? "actualizado" : "registrado"} exitosamente`,
//         duration: 4000,
//       })
//     },
//   }
// }


// import { toast } from "@/hooks/use-toast"

// // Hook personalizado para diferentes tipos de toast médicos
// export const useToastEnhanced = () => {
//   const showSuccess = (title: string, description?: string) => {
//     toast({
//       title,
//       description,
//       className: "border-green-500 bg-green-50 text-green-900",
//       duration: 4000,
//     })
//   }

//   const showError = (title: string, description?: string) => {
//     toast({
//       title,
//       description,
//       variant: "destructive",
//       duration: 6000, // Más tiempo para errores
//     })
//   }

//   const showWarning = (title: string, description?: string) => {
//     toast({
//       title,
//       description,
//       className: "border-yellow-500 bg-yellow-50 text-yellow-900",
//       duration: 5000,
//     })
//   }

//   const showInfo = (title: string, description?: string) => {
//     toast({
//       title,
//       description,
//       className: "border-blue-500 bg-blue-50 text-blue-900",
//       duration: 4000,
//     })
//   }

//   const showMedical = (title: string, description?: string) => {
//     toast({
//       title,
//       description,
//       className: "border-indigo-500 bg-indigo-50 text-indigo-900",
//       duration: 5000, // Más tiempo para notificaciones médicas importantes
//     })
//   }

//   // Funciones específicas para tu aplicación médica
//   const showPatientSaved = (patientName: string, isEdit = false) => {
//     showMedical(
//       `Paciente ${isEdit ? "actualizado" : "creado"} exitosamente`,
//       `${patientName} ha sido ${isEdit ? "actualizado" : "registrado"} correctamente en el sistema`,
//     )
//   }

//   const showValidationError = (fieldName: string, error: string) => {
//     showWarning(`Error en ${fieldName}`, error)
//   }

//   const showLoginSuccess = (userName: string) => {
//     showSuccess("Bienvenido", `Hola ${userName}, has iniciado sesión correctamente`)
//   }

//   const showRegistrationPending = () => {
//     showInfo(
//       "Registro enviado",
//       "Tu solicitud de registro ha sido enviada. Recibirás una confirmación una vez que sea revisada.",
//     )
//   }

//   const showPrescriptionCreated = (patientName: string) => {
//     showMedical("Receta creada", `Receta médica generada exitosamente para ${patientName}`)
//   }

//   const showAppointmentScheduled = (patientName: string, date: string) => {
//     showMedical("Cita programada", `Cita con ${patientName} programada para ${date}`)
//   }

//   const showDataExported = (type: string) => {
//     showSuccess("Exportación exitosa", `Los datos de ${type} han sido exportados correctamente`)
//   }

//   const showBackupCompleted = () => {
//     showSuccess("Respaldo completado", "La copia de seguridad se ha realizado exitosamente")
//   }

//   const showSystemMaintenance = () => {
//     showWarning("Mantenimiento programado", "El sistema entrará en mantenimiento en 30 minutos. Guarda tu trabajo.")
//   }

//   const showConsultationSaved = (patientName: string) => {
//     showMedical("Consulta registrada", `La consulta para ${patientName} ha sido guardada exitosamente`)
//   }

//   return {
//     showSuccess,
//     showError,
//     showWarning,
//     showInfo,
//     showMedical,
//     showPatientSaved,
//     showValidationError,
//     showLoginSuccess,
//     showRegistrationPending,
//     showPrescriptionCreated,
//     showAppointmentScheduled,
//     showDataExported,
//     showBackupCompleted,
//     showSystemMaintenance,
//     showConsultationSaved,
//     toast, // Toast original para casos especiales
//   }
// }
