import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente admin para bypasear RLS
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Cliente normal para auth
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      password,
      fullName,
      cedula,
      gender,
      licenseNumber,
      specialty,
      documentUrl,
      paymentProofUrl,
      isEmailExempted,
    } = await request.json()

    console.log("🚀 API: Iniciando registro para:", email)

    // Validaciones básicas
    if (!email || !password || !fullName || !cedula || !gender || !licenseNumber) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 })
    }

    // 1. Crear usuario en Supabase Auth usando cliente normal
    console.log("👤 API: Creando usuario en Auth...")
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      console.error("❌ API: Error creating auth user:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: "No se pudo crear el usuario" }, { status: 400 })
    }

    console.log("✅ API: Usuario creado en Auth:", authData.user.id)

    // 2. Crear perfil de médico usando cliente admin (bypasea RLS)
    console.log("👨‍⚕️ API: Creando perfil de médico con supabaseAdmin...")

    const doctorData = {
      id: authData.user.id,
      email: email,
      full_name: fullName,
      cedula: cedula,
      gender: gender,
      license_number: licenseNumber,
      specialty: specialty || null,
      document_url: documentUrl,
      payment_proof_url: paymentProofUrl,
      subscription_status: isEmailExempted ? "active" : "pending_verification",
      is_active: isEmailExempted,
      last_payment_date: isEmailExempted ? new Date().toISOString() : null,
      next_payment_date: isEmailExempted ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("📝 API: Datos del doctor:", doctorData)

    const { data: doctorInsertData, error: insertError } = await supabaseAdmin
      .from("doctors")
      .insert(doctorData)
      .select()
      .single()

    if (insertError) {
      console.error("❌ API: Error inserting doctor:", insertError)
      console.error("Detalles del error:", {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      })

      // Si falla la inserción del doctor, eliminar el usuario de auth
      console.log("🧹 API: Limpiando usuario de Auth...")
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json({ error: "Error creando perfil de médico: " + insertError.message }, { status: 500 })
    }

    console.log("✅ API: Perfil de médico creado:", doctorInsertData)

    // 3. Enviar notificación al admin (solo si no está exento)
    if (!isEmailExempted) {
      try {
        console.log("📧 API: Enviando notificación al admin...")
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/notify-admin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "new_registration",
            doctorId: authData.user.id,
            doctorName: fullName,
            doctorEmail: email,
          }),
        })
        console.log("✅ API: Notificación enviada")
      } catch (notifyError) {
        console.error("⚠️ API: Error sending admin notification (no crítico):", notifyError)
        // No fallar el registro por esto
      }
    }

    console.log("🎉 API: Registro completado exitosamente")

    return NextResponse.json({
      success: true,
      message: isEmailExempted
        ? "Registro exitoso. Tu cuenta ha sido activada automáticamente."
        : "Registro exitoso. Tu cuenta será activada una vez se verifique el pago.",
      user: {
        id: authData.user.id,
        email: authData.user.email,
        isEmailExempted,
      },
      doctor: doctorInsertData,
    })
  } catch (error: any) {
    console.error("💥 API: Error in register-doctor API:", error)
    return NextResponse.json({ error: "Error interno del servidor: " + error.message }, { status: 500 })
  }
}
