import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/supabase"

const supabase = createAdminClient()

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Listar todos los archivos del usuario en el bucket payment-proofs
    const { data: files, error: listError } = await supabase.storage.from("payment-proofs").list(userId, {
      limit: 100,
      offset: 0,
      sortBy: { column: "created_at", order: "desc" },
    })

    if (listError) {
      console.error("Error listing files:", listError)
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }

    // Filtrar solo archivos de comprobantes de pago
    const paymentProofs =
      files
        ?.filter((file) => file.name.startsWith("payment_proof_"))
        .map((file) => ({
          name: file.name,
          size: file.metadata?.size || 0,
          created_at: file.created_at,
          updated_at: file.updated_at,
          filePath: `${userId}/${file.name}`,
        })) || []

    // Crear signed URLs para cada archivo
    const proofsWithUrls = await Promise.all(
      paymentProofs.map(async (proof) => {
        try {
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from("payment-proofs")
            .createSignedUrl(proof.filePath, 60 * 60) // 1 hora de validez

          return {
            ...proof,
            signedUrl: signedUrlError ? null : signedUrlData.signedUrl,
            fileType: proof.name.includes(".pdf") ? "pdf" : "image",
          }
        } catch (error) {
          console.error("Error creating signed URL for", proof.name, error)
          return {
            ...proof,
            signedUrl: null,
            fileType: proof.name.includes(".pdf") ? "pdf" : "image",
          }
        }
      }),
    )

    return NextResponse.json({
      paymentProofs: proofsWithUrls,
      total: proofsWithUrls.length,
    })
  } catch (error) {
    console.error("List payment proofs error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
