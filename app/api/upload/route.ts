import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/supabase"

// Crear cliente de Supabase con service key para operaciones de storage
const supabase = createAdminClient();

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

