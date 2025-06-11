import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Crear cliente de Supabase con service key para operaciones de storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Usa la service key para operaciones de storage
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const folder = formData.get("folder") as string
    const userId = formData.get("userId") as string

    if (!file || !folder || !userId) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 })
    }

    console.log("Uploading file:", { fileName: file.name, folder, userId })

    const ext = file.name.split(".").pop()
    const filePath = `${folder}/document.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data, error } = await supabase.storage.from("documents").upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

    if (error) {
      console.error("Storage error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


/* import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
   const folder = formData.get("folder") as string
  const userId = formData.get("userId") as string;

  if (!file || !folder || !userId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const ext = file.name.split(".").pop();
  const filePath = `${userId}/document.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);
  

  const { error } = await supabase.storage
    .from("documents")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage
    .from("documents")
    .getPublicUrl(filePath);

  return NextResponse.json({ url: data.publicUrl });
} */
/* import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const folder = formData.get("folder") as string // debería ser el `auth.uid()`
    const publicId = formData.get("publicId") as string
      

    if (!file || !folder || !publicId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    // Convertir archivo a buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Ruta completa del archivo: folder/filename
    const path = `${folder}/${publicId}`

    // Subir archivo al bucket fijo "documents"
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) throw uploadError

    // Crear signed URL por 1 hora (si usas archivos privados)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, 60 * 60)

    if (urlError) throw urlError

    return NextResponse.json({ url: signedUrlData.signedUrl })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 })
  }
} */


/* import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const folder = formData.get("folder") as string
    const publicId = formData.get("publicId") as string

    if (!file || !folder || !publicId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    // Convertir archivo a buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Subir archivo a Supabase Storage
    const { data, error } = await supabase.storage
      .from("documents") // Bucket fijo
      .upload(`${folder}/${publicId}`, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (error) throw error

    // Obtener la URL pública del archivo
    const { data: publicUrlData } = supabase.storage
      .from("documents")
      .getPublicUrl(`${folder}/${publicId}`)

    return NextResponse.json({ url: publicUrlData.publicUrl })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 })
  }
} */
/* import { type NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const folder = formData.get("folder") as string
    const publicId = formData.get("publicId") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Convertir archivo a base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`

    // Subir a Cloudinary
    const result = await cloudinary.uploader.upload(base64, {
      folder: `medical-app/${folder}`,
      public_id: publicId,
      overwrite: true,
      resource_type: "auto",
      transformation: [{ quality: "auto:good" }, { fetch_format: "auto" }],
    })

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id })
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 })
  }
}
 */