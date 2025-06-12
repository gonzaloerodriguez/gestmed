import { supabase } from "./supabase"
import type { Admin, Doctor } from "./supabase"

/**
 * Verifica el rol del usuario actual
 * @returns Un objeto con el rol del usuario y los datos correspondientes
 */
export async function checkUserRole() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { role: "unauthenticated", data: null }
    }

    // Verificar si es administrador
    const { data: adminData, error: adminError } = await supabase.from("admins").select("*").eq("id", user.id).single()

    if (!adminError && adminData) {
      return { role: "admin", data: adminData as Admin }
    }

    // Verificar si es médico
    const { data: doctorData, error: doctorError } = await supabase
      .from("doctors")
      .select("*")
      .eq("id", user.id)
      .single()

    if (!doctorError && doctorData) {
      return { role: "doctor", data: doctorData as Doctor }
    }

    // No tiene rol asignado
    return { role: "unknown", data: user }
  } catch (error) {
    console.error("Error al verificar rol:", error)
    return { role: "error", data: null }
  }
}

/**
 * Redirecciona al usuario según su rol
 */
export async function redirectBasedOnRole(router: any) {
  const { role, data } = await checkUserRole()

  switch (role) {
    case "admin":
      router.push("/admin")
      break
    case "doctor":
      if (data && (data as Doctor).is_active) {
        router.push("/dashboard")
      } else {
        // Médico inactivo
        await supabase.auth.signOut()
        router.push("/?error=inactive")
      }
      break
    case "unknown":
      // Usuario sin rol asignado
      await supabase.auth.signOut()
      router.push("/?error=no-role")
      break
    default:
      // No autenticado o error
      router.push("/")
      break
  }
}
