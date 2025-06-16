import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { type, doctorId, doctorName, doctorEmail, paymentProofUrl } = await request.json()
    const supabase = createServerClient()

    // Obtener todos los administradores
    const { data: admins, error: adminsError } = await supabase.from("admins").select("email, full_name")

    if (adminsError) throw adminsError

    // Crear notificación en la base de datos (opcional)
    const notificationData = {
      type,
      doctor_id: doctorId,
      message:
        type === "new_registration"
          ? `Nuevo registro: ${doctorName} (${doctorEmail})`
          : `Comprobante de pago subido por: ${doctorName}`,
      payment_proof_url: paymentProofUrl || null,
      created_at: new Date().toISOString(),
    }

    // Aquí podrías insertar en una tabla de notificaciones si la tienes
    // await supabase.from("notifications").insert(notificationData)

    // Por ahora, solo registramos en logs
    console.log("Admin notification:", notificationData)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error sending admin notification:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


// import { type NextRequest, NextResponse } from "next/server"
// import { Resend } from "resend"
// import { supabase } from "@/lib/supabase"

// const resend = new Resend(process.env.RESEND_API_KEY)

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
//     const { type, doctorId, doctorName, doctorEmail, paymentProofUrl } = body

//     // Obtener emails de administradores
//     const { data: admins, error: adminsError } = await supabase.from("admins").select("email, full_name")

//     if (adminsError) throw adminsError

//     if (!admins || admins.length === 0) {
//       console.warn("No hay administradores configurados")
//       return NextResponse.json({ success: true, message: "No admins found" })
//     }

//     // Configurar el contenido del email según el tipo
//     const emailConfig = {
//       new_registration: {
//         subject: "🩺 Nuevo Registro Médico - Requiere Verificación",
//         title: "Nuevo Registro Médico",
//         message: "Se ha registrado un nuevo médico en la plataforma y requiere verificación.",
//         action: "Por favor, revisa y verifica la información en el panel de administrador.",
//       },
//       payment_uploaded: {
//         subject: "💳 Nuevo Comprobante de Pago Subido",
//         title: "Comprobante de Pago Subido",
//         message: "Un médico ha subido un nuevo comprobante de pago.",
//         action: "Por favor, revisa y verifica el comprobante en el panel de administrador.",
//       },
//     }

//     const config = emailConfig[type as keyof typeof emailConfig]

//     if (!config) {
//       throw new Error(`Tipo de notificación no válido: ${type}`)
//     }

//     // Enviar email a cada administrador
//     const emailPromises = admins.map(async (admin) => {
//       try {
//         const { data, error } = await resend.emails.send({
//           from: "Sistema Médico <noreply@tu-dominio.com>", // Cambia por tu dominio verificado
//           to: admin.email,
//           subject: config.subject,
//           html: `
//             <!DOCTYPE html>
//             <html>
//             <head>
//               <meta charset="utf-8">
//               <meta name="viewport" content="width=device-width, initial-scale=1.0">
//               <title>${config.subject}</title>
//             </head>
//             <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
//               <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
//                 <h1 style="color: white; margin: 0; font-size: 24px;">${config.title}</h1>
//               </div>
              
//               <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
//                 <p style="font-size: 16px; margin-bottom: 20px;">Hola <strong>${admin.full_name}</strong>,</p>
                
//                 <p style="font-size: 16px; margin-bottom: 25px;">${config.message}</p>
                
//                 <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; margin: 20px 0;">
//                   <h3 style="margin-top: 0; color: #007bff;">Detalles del Médico:</h3>
//                   <p style="margin: 8px 0;"><strong>Nombre:</strong> ${doctorName}</p>
//                   <p style="margin: 8px 0;"><strong>Email:</strong> ${doctorEmail}</p>
//                   <p style="margin: 8px 0;"><strong>ID:</strong> ${doctorId}</p>
//                   ${paymentProofUrl ? `<p style="margin: 8px 0;"><strong>Comprobante:</strong> <a href="${paymentProofUrl}" style="color: #007bff; text-decoration: none;">Ver comprobante</a></p>` : ""}
//                 </div>
                
//                 <div style="text-align: center; margin: 30px 0;">
//                   <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin" 
//                      style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
//                     Ir al Panel de Administrador
//                   </a>
//                 </div>
                
//                 <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
//                   ${config.action}
//                 </p>
                
//                 <p style="font-size: 12px; color: #999; margin-top: 20px;">
//                   Este es un email automático del sistema. No responder a este mensaje.
//                 </p>
//               </div>
//             </body>
//             </html>
//           `,
//         })

//         if (error) {
//           console.error(`Error enviando email a ${admin.email}:`, error)
//           return { success: false, email: admin.email, error }
//         }

//         console.log(`Email enviado exitosamente a ${admin.email}`)
//         return { success: true, email: admin.email, messageId: data?.id }
//       } catch (emailError) {
//         console.error(`Error enviando email a ${admin.email}:`, emailError)
//         return { success: false, email: admin.email, error: emailError }
//       }
//     })

//     const results = await Promise.all(emailPromises)
//     const successful = results.filter((r) => r.success).length
//     const failed = results.filter((r) => !r.success).length

//     console.log(`Notificaciones enviadas: ${successful} exitosas, ${failed} fallidas`)

//     return NextResponse.json({
//       success: true,
//       sent: successful,
//       failed: failed,
//       results,
//     })
//   } catch (error: any) {
//     console.error("Error sending admin notification:", error)
//     return NextResponse.json(
//       {
//         error: "Error sending notification",
//         details: error.message,
//       },
//       { status: 500 },
//     )
//   }
// }
