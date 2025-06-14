import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, doctorId, doctorName, doctorEmail, paymentProofUrl } = body

    // Obtener emails de administradores
    const { data: admins, error: adminsError } = await supabase.from("admins").select("email, full_name")

    if (adminsError) throw adminsError

    // Aquí puedes integrar con un servicio de email como Resend, SendGrid, etc.
    // Por ahora, solo logueamos la notificación
    console.log("Admin notification:", {
      type,
      doctorId,
      doctorName,
      doctorEmail,
      paymentProofUrl,
      admins: admins?.map((admin) => admin.email),
    })

    // Ejemplo de integración con Resend (comentado)
    /*
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    for (const admin of admins || []) {
      await resend.emails.send({
        from: 'noreply@tudominio.com',
        to: admin.email,
        subject: type === 'new_registration' ? 'Nuevo registro médico' : 'Comprobante de pago subido',
        html: `
          <h2>${type === 'new_registration' ? 'Nuevo registro médico' : 'Comprobante de pago subido'}</h2>
          <p><strong>Médico:</strong> ${doctorName}</p>
          <p><strong>Email:</strong> ${doctorEmail}</p>
          ${paymentProofUrl ? `<p><strong>Comprobante:</strong> <a href="${paymentProofUrl}">Ver comprobante</a></p>` : ''}
          <p>Por favor revisa y verifica la información en el panel de administrador.</p>
        `
      })
    }
    */

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error sending admin notification:", error)
    return NextResponse.json({ error: "Error sending notification" }, { status: 500 })
  }
}
