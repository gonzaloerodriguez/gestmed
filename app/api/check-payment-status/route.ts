import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Esta función se puede llamar desde un cron job externo
    // o desde un webhook para verificar estados de pago

    const { data: doctors, error } = await supabase
      .from("doctors")
      .select("id, email, full_name, next_payment_date, subscription_status")
      .eq("subscription_status", "active")

    if (error) throw error

    const now = new Date()
    const expiredDoctors = []
    const reminderDoctors = []

    for (const doctor of doctors || []) {
      if (doctor.next_payment_date) {
        const nextPayment = new Date(doctor.next_payment_date)
        const daysUntilPayment = Math.ceil((nextPayment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntilPayment < 0) {
          // Vencido - marcar como expirado
          expiredDoctors.push(doctor)
        } else if (daysUntilPayment <= 5) {
          // Recordatorio - 5 días o menos
          reminderDoctors.push(doctor)
        }
      }
    }

    // Actualizar doctores vencidos
    if (expiredDoctors.length > 0) {
      const expiredIds = expiredDoctors.map((d) => d.id)
      await supabase
        .from("doctors")
        .update({
          subscription_status: "expired",
          is_active: false,
        })
        .in("id", expiredIds)
    }

    // Aquí puedes enviar emails de recordatorio a reminderDoctors
    // y notificaciones de vencimiento a expiredDoctors

    return NextResponse.json({
      success: true,
      expired: expiredDoctors.length,
      reminders: reminderDoctors.length,
    })
  } catch (error: any) {
    console.error("Error checking payment status:", error)
    return NextResponse.json({ error: "Error checking payment status" }, { status: 500 })
  }
}
