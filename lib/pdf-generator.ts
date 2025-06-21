import { jsPDF } from "jspdf"
import type { Prescription } from "./supabase/types/prescription"
import type { Doctor } from "./supabase/types/doctor"

// Función para generar PDF de receta médica
export async function generatePrescriptionPDF(prescription: Prescription, doctor: Doctor): Promise<Blob> {

 
  // Crear nuevo documento PDF
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })
 
  // Configurar fuentes
  doc.setFont("helvetica")

  // Dimensiones de la página
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20

  // Cargar imagen de firma y sello si existe
  let signatureImage: HTMLImageElement | null = null
  if (doctor.signature_stamp_url) {
    try {
      // Agregar cache-busting a la URL de la firma para el PDF
      const imageUrl = doctor.signature_stamp_url.includes("?")
        ? `${doctor.signature_stamp_url}&pdf=${Date.now()}`
        : `${doctor.signature_stamp_url}?pdf=${Date.now()}`

      signatureImage = await loadImage(imageUrl)
      
    } catch (error) {
      console.error("❌ Error cargando firma:", error)
    }
  }

  // Función para convertir imagen a base64
  function imageToBase64(img: HTMLImageElement): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL("image/png"))
    })
  }

  // Encabezado
  doc.setFontSize(18)
  doc.setTextColor(0, 51, 102) // Azul oscuro
  doc.text(`${doctor.gender === "female" ? "Dra." : "Dr."} ${doctor.full_name}`, margin, margin)

  doc.setFontSize(12)
  doc.setTextColor(80, 80, 80) // Gris oscuro
  doc.text(doctor.specialty || "Médico General", margin, margin + 8)
  doc.text(`Matrícula: ${doctor.license_number}`, margin, margin + 14)

  // Línea divisoria
  doc.setDrawColor(0, 102, 204) // Azul
  doc.setLineWidth(0.5)
  doc.line(margin, margin + 18, pageWidth - margin, margin + 18)

  // Información de la receta
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0) // Negro
  doc.text("RECETA MÉDICA", pageWidth / 2, margin + 28, { align: "center" })

  // Fecha
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80) // Gris oscuro
  const formattedDate = new Date(prescription.date_prescribed).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  doc.text(`Fecha: ${formattedDate}`, pageWidth - margin, margin + 28, { align: "right" })

  // Información del paciente
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0) // Negro
  doc.text(`Paciente: ${prescription.patient_name}`, margin, margin + 40)

  if (prescription.patient_age) {
    doc.text(`Edad: ${prescription.patient_age} años`, margin, margin + 46)
  }

  if (prescription.patient_cedula) {
    doc.text(`CI: ${prescription.patient_cedula}`, pageWidth - margin, margin + 40, { align: "right" })
  }

  // Línea divisoria
  doc.setDrawColor(200, 200, 200) // Gris claro
  doc.setLineWidth(0.2)
  doc.line(margin, margin + 50, pageWidth - margin, margin + 50)

  // Diagnóstico
  let yPos = margin + 60
  if (prescription.diagnosis) {
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("Diagnóstico:", margin, yPos)
    doc.setFont("helvetica", "normal")

    // Texto de diagnóstico con saltos de línea
    const diagnosisLines = doc.splitTextToSize(prescription.diagnosis, pageWidth - margin * 2)
    doc.text(diagnosisLines, margin, yPos + 6)

    yPos += 6 + diagnosisLines.length * 6 + 6
  }

  // Medicamentos
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("Medicamentos:", margin, yPos)
  doc.setFont("helvetica", "normal")

  // Texto de medicamentos con saltos de línea
  const medicationLines = doc.splitTextToSize(prescription.medications, pageWidth - margin * 2)
  doc.text(medicationLines, margin, yPos + 6)

  yPos += 6 + medicationLines.length * 6 + 6

  // Instrucciones
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("Instrucciones:", margin, yPos)
  doc.setFont("helvetica", "normal")

  // Texto de instrucciones con saltos de línea
  const instructionLines = doc.splitTextToSize(prescription.instructions, pageWidth - margin * 2)
  doc.text(instructionLines, margin, yPos + 6)

  yPos += 6 + instructionLines.length * 6 + 6

  // Notas adicionales
  if (prescription.notes) {
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("Notas:", margin, yPos)
    doc.setFont("helvetica", "normal")

    // Texto de notas con saltos de línea
    const notesLines = doc.splitTextToSize(prescription.notes, pageWidth - margin * 2)
    doc.text(notesLines, margin, yPos + 6)

    yPos += 6 + notesLines.length * 6 + 6
  }

 

  // Firma y sello
  if (signatureImage) {
    try {
      const base64Img = await imageToBase64(signatureImage)

      // Definir dimensiones máximas para la firma
      const maxWidth = 50 // Ancho máximo en mm
      const maxHeight = 25 // Altura máxima en mm

      // Calcular dimensiones para mantener la proporción
      let imgWidth = maxWidth
      let imgHeight = (signatureImage.height * imgWidth) / signatureImage.width

      // Si la altura calculada excede el máximo, ajustar por altura
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight
        imgWidth = (signatureImage.width * imgHeight) / signatureImage.height
      }

      // Posicionar en la parte inferior derecha - MÁS ESPACIO PARA TEXTO
      const imgX = pageWidth - margin - imgWidth
      const imgY = pageHeight - margin - imgHeight - 35 // 🔥 AUMENTADO A 35mm

      // Añadir imagen con rotación correcta
      doc.addImage(base64Img, "PNG", imgX, imgY, imgWidth, imgHeight)

    } catch (error) {
      console.error("❌ Error añadiendo firma al PDF:", error)
    }
  }

  // 🔥 INFORMACIÓN DEL MÉDICO DEBAJO DE LA FIRMA - CÓDIGO ACTUALIZADO
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)

  // Calcular posición centrada para el texto
  const signatureTextX = pageWidth - margin - 25

  // 📝 NOMBRE DEL MÉDICO
  const doctorName = `${doctor.gender === "female" ? "Dra." : "Dr."} ${doctor.full_name}`
  doc.text(doctorName, signatureTextX, pageHeight - margin - 20, { align: "center" })

  // 🆔 NÚMERO DE MATRÍCULA DEBAJO DEL NOMBRE
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80) // Gris más claro para la matrícula
  const licenseText = `Mat. ${doctor.license_number}`
  doc.text(licenseText, signatureTextX, pageHeight - margin - 15, { align: "center" })



  // Pie de página
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text("Documento generado digitalmente", pageWidth / 2, pageHeight - 8, { align: "center" })


  // Generar blob del PDF
  const pdfBlob = doc.output("blob")
  return pdfBlob
}

// Función auxiliar para cargar imágenes con manejo de orientación y cache-busting
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "Anonymous" // Importante para CORS

    img.onload = () => {
      // Crear un canvas para corregir la orientación si es necesario
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve(img) // Si no hay contexto, devolver la imagen original
        return
      }

      // Establecer dimensiones del canvas
      canvas.width = img.width
      canvas.height = img.height

      // Dibujar la imagen en el canvas (esto corrige la orientación)
      ctx.drawImage(img, 0, 0, img.width, img.height)

      // Crear una nueva imagen desde el canvas
      const correctedImg = new Image()
      correctedImg.crossOrigin = "Anonymous"

      correctedImg.onload = () => resolve(correctedImg)
      correctedImg.onerror = (e) => reject(e)

      // Convertir el canvas a una URL de datos
      correctedImg.src = canvas.toDataURL("image/png")
    }

    img.onerror = (e) => reject(e)
    img.src = url
  })
}

