import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/supabase"
import { parseStorageUrl } from "@/lib/utils/signed-url"


const supabase = createAdminClient()

export async function POST(req: NextRequest) {
  try {
    // const { filePath } = await req.json()
     let { filePath, bucket } = await req.json()

    if (!filePath) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 })
    }
console.log("Solicitando Signed URL para:", filePath);

 if (filePath.startsWith("http")) {
      const parsed = parseStorageUrl(filePath)
      if (!parsed) {
        return NextResponse.json({ error: "Invalid file path" }, { status: 400 })
      }
      bucket = parsed.bucket
      filePath = parsed.path
    }

    const storageBucket = bucket || "payment-proofs"



    // Crear signed URL válida por 1 hora
    
 const { data, error } = await supabase.storage.from(storageBucket).createSignedUrl(filePath, 60 * 60)
    if (error) {
      console.error("Error creating signed URL:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ signedUrl: data.signedUrl })
  } catch (error) {
    console.error("Signed URL error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
