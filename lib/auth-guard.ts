"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { checkUserRole } from "./auth-utils"
import { supabase } from "./supabase/supabase"

export function useAuthGuard(requiredRole?: "admin" | "doctor") {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      console.log("🔒 AUTH GUARD: Verificando autenticación...")

      const { role, data } = await checkUserRole()

      // ✅ Si no está autenticado, redirigir al login
      if (role === "unauthenticated" || role === "error") {
        console.log("❌ AUTH GUARD: No autenticado - redirigiendo a login")
        router.push("/login")
        return
      }

      // ✅ Si no tiene rol asignado
      if (role === "unknown") {
        console.log("❌ AUTH GUARD: Sin rol - cerrando sesión")
        await supabase.auth.signOut()
        router.push("/?error=no-role")
        return
      }

      // ✅ Verificar rol específico si se requiere
      if (requiredRole && role !== requiredRole) {
        console.log(`❌ AUTH GUARD: Rol incorrecto. Requiere: ${requiredRole}, Tiene: ${role}`)

        // Redirigir según el rol actual
        if (role === "admin" && requiredRole === "doctor") {
          router.push("/admin")
          return
        }
        if (role === "doctor" && requiredRole === "admin") {
          router.push("/dashboard")
          return
        }
      }

      // ✅ Verificaciones específicas para doctores
      if (role === "doctor") {
        const doctor = data as any
        console.log("👨‍⚕️ AUTH GUARD: Verificando estado del doctor")

        // Obtener usuario autenticado
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (authUser?.email) {
          // Verificar si está exento de pago
          const { data: exempted } = await supabase
            .from("exempted_users")
            .select("email")
            .eq("email", authUser.email)
            .maybeSingle()

          // Si no está exento y tiene problemas de suscripción
          if (!exempted && (doctor.subscription_status === "expired" || !doctor.is_active)) {
            console.log("💳 AUTH GUARD: Suscripción expirada - redirigiendo a payment-required")
            router.push("/payment-required")
            return
          }
        }

        console.log("✅ AUTH GUARD: Doctor autorizado")
        setUser(authUser)
        setUserData(doctor)
      } else if (role === "admin") {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()
        console.log("👑 AUTH GUARD: Admin autorizado")
        setUser(authUser)
        setUserData(data)
      }

      setLoading(false)
    } catch (error) {
      console.error("❌ AUTH GUARD ERROR:", error)
      router.push("/login")
    }
  }

  return { loading, user, userData }
}
