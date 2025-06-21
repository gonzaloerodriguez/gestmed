import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/supabase"

// Importación condicional de Sharp para evitar errores si no está instalado
let sharp: any = null
try {
  sharp = require("sharp")
} catch (error) {
  console.warn("Sharp no está disponible, usando procesamiento básico")
}

// Crear cliente de Supabase con service key para operaciones de storage
const supabase = createAdminClient();

// Límite de tamaño: 5MB para documentos de pago
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string

    if (!file || !userId) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 })
    }

    // Verificar tipo de archivo (PDF, imágenes)
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido. Use PDF, JPG o PNG" }, { status: 400 })
    }

    console.log("Procesando comprobante de pago:", { fileName: file.name, size: file.size, userId })

    // Verificar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "El archivo es demasiado grande (máximo 5MB)" }, { status: 400 })
    }

    // Convertir archivo a buffer
    const arrayBuffer = await file.arrayBuffer()
    let fileBuffer = Buffer.from(arrayBuffer)
    let contentType = file.type
    let fileExtension = file.name.split(".").pop()?.toLowerCase() || "bin"

    // Solo procesar imágenes con Sharp, dejar PDFs como están
    if (file.type.startsWith("image/") && sharp) {
      try {
        // Optimizar solo imágenes, no PDFs
        fileBuffer = await sharp(fileBuffer)
          .rotate() // Corregir orientación automáticamente
          .jpeg({ quality: 85 }) // Convertir a JPEG con buena calidad
          .resize({
            width: 1200, 
            height: 1600,
            fit: "inside",
            withoutEnlargement: true,
          })
          .toBuffer()

        contentType = "image/jpeg"
        fileExtension = "jpg"
        console.log("Imagen de comprobante procesada con Sharp")
      } catch (sharpError) {
        console.error("Error procesando imagen con Sharp:", sharpError)
        // Usar imagen original si falla el procesamiento
      }
    }

    // Verificar tamaño después del procesamiento
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo es demasiado grande después de procesar (máximo ${MAX_FILE_SIZE / (1024 * 1024)}MB)` },
        { status: 400 },
      )
    }

    // Usar timestamp para evitar conflictos de caché
    const timestamp = Date.now()
    const filePath = `${userId}/payment_proof_${timestamp}.${fileExtension}`

    // Eliminar comprobantes anteriores (opcional, mantener historial)
    try {
      const { data: existingFiles, error: listError } = await supabase.storage.from("payment-proofs").list(userId, {
        limit: 100,
        offset: 0,
      })

      if (!listError && existingFiles) {
        // Mantener solo los últimos 3 comprobantes
        const sortedFiles = existingFiles
          .filter((file) => file.name.startsWith("payment_proof_"))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        if (sortedFiles.length >= 3) {
          const filesToDelete = sortedFiles
            .slice(2) // Mantener los 2 más recientes
            .map((file) => `${userId}/${file.name}`)

          if (filesToDelete.length > 0) {
            const { error: deleteError } = await supabase.storage.from("payment-proofs").remove(filesToDelete)

            if (deleteError) {
              console.warn("Error eliminando comprobantes antiguos:", deleteError)
            } else {
              console.log("Comprobantes antiguos eliminados:", filesToDelete)
            }
          }
        }
      }
    } catch (cleanupError) {
      console.warn("Error en limpieza de archivos anteriores:", cleanupError)
    }

    // Subir archivo
    const { error } = await supabase.storage
      .from("payment-proofs") // Bucket específico para comprobantes de pago
      .upload(filePath, fileBuffer, {
        contentType: contentType,
        upsert: false,
      })

    if (error) {
      console.error("Storage error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ✅ CAMBIO: Crear signed URL en lugar de URL pública
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(filePath, 60 * 60 * 24 * 7) // URL válida por 7 días

    if (signedUrlError) {
      console.error("Error creating signed URL:", signedUrlError)
      return NextResponse.json({ error: "Error creating signed URL" }, { status: 500 })
    }

    // Guardar la ruta del archivo (sin la URL completa) para poder regenerar signed URLs después
    const fileData = {
      url: signedUrlData.signedUrl,
      filePath: filePath, // Guardar la ruta para regenerar URLs después
      size: fileBuffer.length,
      processed: file.type.startsWith("image/") && !!sharp,
      timestamp: timestamp,
      fileType: contentType,
    }

    return NextResponse.json(fileData)
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

