"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { checkUserRole } from "./auth-utils"

/**
 * Hook para proteger rutas públicas (login, register)
 * Redirige a usuarios ya autenticados a su dashboard correspondiente
 */
export function usePublicRoute() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [canAccess, setCanAccess] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const { role, data } = await checkUserRole()

      // Si no está autenticado, puede acceder a la página pública
      if (role === "unauthenticated" || role === "error") {
        setCanAccess(true)
        setLoading(false)
        return
      }

      // Si está autenticado, redirigir según su rol
      console.log("🔒 PUBLIC ROUTE: Usuario ya autenticado, redirigiendo...")

      switch (role) {
        case "admin":
          console.log("👑 PUBLIC ROUTE: Admin detectado - redirigiendo a /admin")
          router.replace("/admin")
          break
        case "doctor":
          const doctor = data as any
          console.log("👨‍⚕️ PUBLIC ROUTE: Doctor detectado - verificando estado")

          // Verificar si está exento de pago
          const { supabase } = await import("./supabase/supabase")
          const {
            data: { user },
          } = await supabase.auth.getUser()

          if (user?.email) {
            const { data: exempted } = await supabase
              .from("exempted_users")
              .select("email")
              .eq("email", user.email)
              .maybeSingle()

            if (exempted) {
              console.log("✅ PUBLIC ROUTE: Usuario exento - redirigiendo a dashboard")
              router.replace("/dashboard")
              break
            }
          }

          // Verificar estado de suscripción
          if (doctor.subscription_status === "expired" || !doctor.is_active) {
            console.log("💳 PUBLIC ROUTE: Suscripción expirada - redirigiendo a payment-required")
            router.replace("/payment-required")
          } else {
            console.log("✅ PUBLIC ROUTE: Doctor activo - redirigiendo a dashboard")
            router.replace("/dashboard")
          }
          break
        case "unknown":
          // Usuario sin rol asignado - permitir acceso para que pueda registrarse
          setCanAccess(true)
          setLoading(false)
          break
        default:
          setCanAccess(true)
          setLoading(false)
          break
      }
    } catch (error) {
      console.error("Public route guard error:", error)
      // En caso de error, permitir acceso
      setCanAccess(true)
      setLoading(false)
    }
  }

  return { loading, canAccess }
}
