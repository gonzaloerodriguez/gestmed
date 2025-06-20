import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

// Importación condicional de Sharp para evitar errores si no está instalado
let sharp: any = null
try {
  sharp = require("sharp")
} catch (error) {
  console.warn("Sharp no está disponible, usando procesamiento básico")
}

// Crear cliente de Supabase con service key para operaciones de storage
const supabase = createAdminClient();

// Límite de tamaño: 500KB (suficiente para una firma con sello)
const MAX_FILE_SIZE = 500 * 1024 // 500KB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string

    if (!file || !userId) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 })
    }

    // Verificar tipo de archivo
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 })
    }

    console.log("Procesando imagen:", { fileName: file.name, size: file.size, userId })

    // Verificar tamaño antes de procesar
    if (file.size > 500 * 1024) {
      return NextResponse.json({ error: "La imagen es demasiado grande (máximo 500KB)" }, { status: 400 })
    }

    // Convertir archivo a buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let optimizedImageBuffer: Buffer

    if (sharp) {
      // Usar Sharp si está disponible
      try {
        // IMPORTANTE: Corregir orientación automáticamente
        optimizedImageBuffer = await sharp(buffer)
          .rotate() // Corrige automáticamente la orientación basada en EXIF
          .png() // Convertir a PNG para asegurar transparencia
          .resize({
            width: 400, // Tamaño apropiado para firmas en documentos
            height: 200,
            fit: "inside",
            withoutEnlargement: true,
          })
          // Aumentar contraste para mejorar visibilidad
          .modulate({
            brightness: 1.1, // Aumentar brillo ligeramente
            saturation: 1.3, // Aumentar saturación para mejor contraste
          })
          // Asegurar que los bordes sean nítidos
          .sharpen({
            sigma: 1.0,
            flat: 1.0,
            jagged: 2.0,
          })
          // Normalizar para mejorar el contraste automáticamente
          .normalize()
          .toBuffer()

        console.log("Imagen procesada con Sharp y orientación corregida")
      } catch (sharpError) {
        console.error("Error procesando con Sharp:", sharpError)
        // Fallback: usar imagen original
        optimizedImageBuffer = buffer
      }
    } else {
      // Fallback: usar imagen original si Sharp no está disponible
      console.log("Sharp no disponible, usando imagen original")
      optimizedImageBuffer = buffer
    }

    // Verificar si la imagen optimizada sigue siendo demasiado grande
    if (optimizedImageBuffer.length > MAX_FILE_SIZE) {
      if (sharp) {
        try {
          // Intentar reducir más la calidad
          optimizedImageBuffer = await sharp(optimizedImageBuffer).png({ quality: 60, compressionLevel: 9 }).toBuffer()
        } catch (error) {
          console.error("Error comprimiendo imagen:", error)
        }
      }

      if (optimizedImageBuffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `La imagen es demasiado grande después de optimizar (máximo ${MAX_FILE_SIZE / 1024}KB)` },
          { status: 400 },
        )
      }
    }

    // SOLUCIÓN AL PROBLEMA DE CACHÉ: Usar timestamp en el nombre del archivo
    const timestamp = Date.now()
    const filePath = `${userId}/signature_${timestamp}.png`

    // IMPORTANTE: Eliminar archivo anterior antes de subir el nuevo
    try {
      // Listar archivos existentes en la carpeta del usuario
      const { data: existingFiles, error: listError } = await supabase.storage.from("signatures").list(userId, {
        limit: 100,
        offset: 0,
      })

      if (!listError && existingFiles) {
        // Eliminar archivos anteriores de firma
        const filesToDelete = existingFiles
          .filter((file) => file.name.startsWith("signature_"))
          .map((file) => `${userId}/${file.name}`)

        if (filesToDelete.length > 0) {
          const { error: deleteError } = await supabase.storage.from("signatures").remove(filesToDelete)

          if (deleteError) {
            console.warn("Error eliminando archivos anteriores:", deleteError)
          } else {
            console.log("Archivos anteriores eliminados:", filesToDelete)
          }
        }
      }
    } catch (cleanupError) {
      console.warn("Error en limpieza de archivos anteriores:", cleanupError)
      // Continuar con la subida aunque falle la limpieza
    }

    // Subir archivo optimizado con nuevo nombre
    const { error } = await supabase.storage
      .from("signatures") // Bucket específico para firmas
      .upload(filePath, optimizedImageBuffer, {
        contentType: "image/png",
        upsert: false, // Cambiar a false para evitar sobrescribir
      })

    if (error) {
      console.error("Storage error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Obtener URL pública con cache-busting
    const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(filePath)

    // Agregar parámetro de cache-busting adicional
    const finalUrl = `${urlData.publicUrl}?v=${timestamp}`

    return NextResponse.json({
      url: finalUrl,
      size: optimizedImageBuffer.length,
      processed: !!sharp,
      timestamp: timestamp,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

