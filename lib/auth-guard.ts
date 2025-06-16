"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { checkUserRole } from "./auth-utils"
import { supabase } from "./supabase"

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
      const { role, data } = await checkUserRole()

      // Si no está autenticado, redirigir al login
      if (role === "unauthenticated" || role === "error") {
        router.push("/login")
        return
      }

      // Si no tiene rol asignado
      if (role === "unknown") {
        await supabase.auth.signOut()
        router.push("/?error=no-role")
        return
      }

      // Verificar rol específico si se requiere
      if (requiredRole && role !== requiredRole) {
        // Si es admin pero requiere doctor, redirigir a admin
        if (role === "admin" && requiredRole === "doctor") {
          router.push("/admin")
          return
        }
        // Si es doctor pero requiere admin, redirigir a dashboard
        if (role === "doctor" && requiredRole === "admin") {
          router.push("/dashboard")
          return
        }
      }

      // Verificaciones específicas para doctores
      if (role === "doctor") {
        const doctor = data as any

        // Verificar si está exento de pago
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (authUser?.email) {
          const { data: exempted } = await supabase
            .from("exempted_users")
            .select("email")
            .eq("email", authUser.email)
            .maybeSingle()

          // Si no está exento y tiene problemas de suscripción
          if (!exempted && (doctor.subscription_status === "expired" || !doctor.is_active)) {
            router.push("/payment-required")
            return
          }
        }

        setUser(authUser)
        setUserData(doctor)
      } else if (role === "admin") {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()
        setUser(authUser)
        setUserData(data)
      }

      setLoading(false)
    } catch (error) {
      console.error("Auth guard error:", error)
      router.push("/login")
    }
  }

  return { loading, user, userData }
}
