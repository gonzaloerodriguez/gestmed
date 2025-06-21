import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/supabase"

// Crear cliente de Supabase con service role para bypasear RLS
// const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
//   auth: {
//     autoRefreshToken: false,
//     persistSession: false,
//   },
// })
const supabaseAdmin = createAdminClient()
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email es requerido" }, { status: 400 })
    }

    // Consultar la tabla exempted_users usando el cliente admin
    const { data, error } = await supabaseAdmin
      .from("exempted_users")
      .select("email, created_by, created_at")
      .eq("email", email.toLowerCase())
      .single()

    if (error) {
      // Si no se encuentra el email, no está exento
      if (error.code === "PGRST116") {
        return NextResponse.json({
          isExempted: false,
          message: "Email no está en la lista de exentos",
        })
      }

      return NextResponse.json({ error: "Error verificando exención" }, { status: 500 })
    }

    // Si se encuentra el email, está exento
    return NextResponse.json({
      isExempted: true,
      message: "Email exento de pago",
      exemptionData: {
        email: data.email,
        createdBy: data.created_by,
        createdAt: data.created_at,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
