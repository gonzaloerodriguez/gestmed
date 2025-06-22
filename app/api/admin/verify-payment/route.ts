import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/supabase"
import { logAdminAction } from "@/lib/log-admin"

export async function POST(request: NextRequest) {
  try {
    const { doctorId, action, adminId } = await request.json()

    
if (!doctorId || typeof doctorId !== "string") {
  return NextResponse.json({ error: "ID de doctor inválido" }, { status: 400 })
}
if (!adminId || typeof adminId !== "string") {
  return NextResponse.json({ error: "ID de admin inválido" }, { status: 400 })
}
    const supabase = createAdminClient()

    // Verificar que quien hace la petición es admin
    const { data: admin, error: adminError } = await supabase.from("admins").select("*").eq("id", adminId).single()
console.log("Resultado admin:", admin);
console.log("Error admin:", adminError);
    if (adminError || !admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Obtener datos actuales del médico
    const { data: doctor, error: doctorError } = await supabase.from("doctors").select("*").eq("id", doctorId).single()
console.log("Resultado doctor:", doctor);
console.log("Error doctor:", doctorError);
console.log("doctorId recibido:", doctorId);


    if (doctorError || !doctor) {
      return NextResponse.json({ error: "Médico no encontrado" }, { status: 404 })
    }

    let updateData: any = {}

    if (action === "approve") {
      // Aprobar pago - activar cuenta
      const nextPaymentDate = new Date()
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1)

      updateData = {
        subscription_status: "active",
        is_active: true,
        last_payment_date: new Date().toISOString(),
        next_payment_date: nextPaymentDate.toISOString(),
      }
    } else if (action === "reject") {
      // Rechazar pago - mantener inactivo
      updateData = {
        subscription_status: "expired",
        is_active: false,
        payment_proof_url: null, // Limpiar comprobante rechazado
      }
    } else if (action === "activate") {
      // Activar manualmente
      updateData = {
        is_active: true,
        subscription_status: "active",
      }
    } else if (action === "deactivate") {
      // Desactivar manualmente
      updateData = {
        is_active: false,
        subscription_status: "expired",
      }
    }

    // Actualizar médico
    
 const { error: updateError } = await supabase
      .from("doctors")
      .update(updateData)
      .eq("id", doctorId)


    if (updateError) throw updateError


 const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown"

    const userAgent = request.headers.get("user-agent") || "unknown"

    await logAdminAction({
      adminId: admin.id,
      action: action,
      details: `Admin ${admin.full_name} realizó la acción: ${action} en doctor ${doctor.full_name}`,
      userAgent,
      ip,
    })
    // Registrar la acción del admin (opcional - puedes crear una tabla de logs)
    console.log(`Admin ${admin.full_name} performed action: ${action} on doctor ${doctor.full_name}`)

    return NextResponse.json({
      success: true,
      message: `Acción ${action} realizada exitosamente`,
      updatedData: updateData,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
