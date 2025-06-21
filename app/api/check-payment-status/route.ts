import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/supabase"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Obtener todos los médicos activos para verificar vencimientos
    const { data: doctors, error } = await supabase
      .from("doctors")
      .select("id, email, full_name, next_payment_date, subscription_status, is_active")
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

    // También obtener médicos pendientes de verificación
    const { data: pendingDoctors, error: pendingError } = await supabase
      .from("doctors")
      .select("id, email, full_name, payment_proof_url, created_at")
      .eq("subscription_status", "pending_verification")
      .not("payment_proof_url", "is", null)

    if (pendingError) {
      console.error("Error fetching pending doctors:", pendingError)
    }

    return NextResponse.json({
      success: true,
      expired: expiredDoctors.length,
      reminders: reminderDoctors.length,
      pendingVerification: pendingDoctors?.length || 0,
      expiredDoctors,
      reminderDoctors,
      pendingDoctors: pendingDoctors || [],
    })
  } catch (error: any) {
    return NextResponse.json({ error: "Error checking payment status" }, { status: 500 })
  }
}

