import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rutas que requieren autenticación
  const protectedRoutes = ["/dashboard", "/profile", "/admin"]
  const isProtectedRoute = protectedRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Verificar estado de suscripción para médicos (solo si hay usuario)
  if (user && req.nextUrl.pathname.startsWith("/dashboard")) {
    try {
      const { data: doctor } = await supabase
        .from("doctors")
        .select("subscription_status, is_active, role")
        .eq("id", user.id)
        .single()

      if (
        doctor &&
        doctor.role !== "admin" &&
        doctor.subscription_status === "expired" &&
        !doctor.is_active
      ) {
        return NextResponse.redirect(new URL("/payment-required", req.url))
      }
    } catch (error) {
      console.error("Error checking subscription status:", error)
    }
  }

  // Verificar acceso de admin (solo si hay usuario)
  if (user && req.nextUrl.pathname.startsWith("/admin")) {
    try {
      const { data: doctor } = await supabase
        .from("doctors")
        .select("role")
        .eq("id", user.id)
        .single()

      if (!doctor || doctor.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    } catch (error) {
      console.error("Error checking admin access:", error)
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  return res
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/admin/:path*"],
}

// import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

// import { NextResponse } from "next/server"
// import type { NextRequest } from "next/server"

// export async function middleware(req: NextRequest) {
//   const res = NextResponse.next()
//   const supabase = createMiddlewareClient({ req, res })

//   const {
//     data: { user },
//   } = await supabase.auth.getUser()

//   // Rutas que requieren autenticación
//   const protectedRoutes = ["/dashboard", "/profile", "/admin"]
//   const isProtectedRoute = protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

//   if (isProtectedRoute && !user) {
//     return NextResponse.redirect(new URL("/login", req.url))
//   }

//   // Verificar estado de suscripción para médicos
//   if (user && req.nextUrl.pathname.startsWith("/dashboard")) {
//     try {
//       const { data: doctor } = await supabase
//         .from("doctors")
//         .select("subscription_status, is_active, role")
//         .eq("id", user.id)
//         .single()

//       // Solo aplicar verificación de suscripción a médicos (no a admins)
//       if (doctor && doctor.role !== "admin" && doctor.subscription_status === "expired" && !doctor.is_active) {
//         return NextResponse.redirect(new URL("/payment-required", req.url))
//       }
//     } catch (error) {
//       console.error("Error checking subscription status:", error)
//     }
//   }

//   // Verificar acceso de admin
//   if (req.nextUrl.pathname.startsWith("/admin")) {
//     try {
//       const { data: doctor } = await supabase.from("doctors").select("role").eq("id", user.id).single()

//       if (!doctor || doctor.role !== "admin") {
//         return NextResponse.redirect(new URL("/dashboard", req.url))
//       }
//     } catch (error) {
//       console.error("Error checking admin access:", error)
//       return NextResponse.redirect(new URL("/dashboard", req.url))
//     }
//   }

//   return res
// }

// export const config = {
//   matcher: ["/dashboard/:path*", "/profile/:path*", "/admin/:path*"],
// }
