import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { filePath } = await req.json()

    if (!filePath) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 })
    }

    // Crear signed URL válida por 1 hora
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(filePath, 60 * 60) // 1 hora

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
