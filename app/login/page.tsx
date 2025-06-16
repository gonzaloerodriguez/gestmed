"use client";

import type React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stethoscope } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { redirectBasedOnRole } from "@/lib/auth-utils";
import { usePublicRoute } from "@/lib/public-route-guard";

export default function LoginPage() {
  const router = useRouter();
  const { loading: routeLoading, canAccess } = usePublicRoute();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log("🔐 LOGIN: Iniciando autenticación...");

      // Autenticar usuario
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
        console.log("✅ LOGIN: Usuario autenticado:", data.user.id);

        // Esperar a que la sesión se establezca completamente
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Usar auth-utils para redirigir según el rol
        console.log("🔍 LOGIN: Verificando roles y redirigiendo...");
        await redirectBasedOnRole(router);
      }
    } catch (error: any) {
      console.error("❌ LOGIN ERROR:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  // Mostrar loading mientras se verifica si puede acceder
  if (routeLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">
                Verificando sesión...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si no puede acceder (ya está autenticado), no mostrar nada
  // porque ya se está redirigiendo
  if (!canAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Stethoscope className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>Accede a tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="tu-email@ejemplo.com"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Tu contraseña"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                <strong>Error:</strong> {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:underline block"
            >
              ¿Olvidaste tu contraseña?
            </Link>
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="text-blue-600 hover:underline">
                Registrarse
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// "use client";

// import type React from "react";
// import { useEffect, useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Stethoscope } from "lucide-react";
// import { supabase } from "@/lib/supabase";
// import { redirectBasedOnRole } from "@/lib/auth-utils";

// export default function LoginPage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//   });

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//     if (error) setError(null);
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError(null);

//     try {
//       console.log("🔐 LOGIN: Iniciando autenticación...");

//       // Autenticar usuario
//       const { data, error } = await supabase.auth.signInWithPassword({
//         email: formData.email,
//         password: formData.password,
//       });

//       if (error) throw error;

//       if (data.user) {
//         console.log("✅ LOGIN: Usuario autenticado:", data.user.id);

//         // Esperar a que la sesión se establezca completamente
//         await new Promise((resolve) => setTimeout(resolve, 1000));

//         // Usar auth-utils para redirigir según el rol
//         console.log("🔍 LOGIN: Verificando roles y redirigiendo...");
//         await redirectBasedOnRole(router);
//       }
//     } catch (error: any) {
//       console.error("❌ LOGIN ERROR:", error);
//       setError(error.message);
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
//       <Card className="w-full max-w-md">
//         <CardHeader className="text-center">
//           <div className="flex justify-center mb-4">
//             <Stethoscope className="h-12 w-12 text-blue-600" />
//           </div>
//           <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
//           <CardDescription>Accede a tu cuenta</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <Label htmlFor="email">Correo Electrónico</Label>
//               <Input
//                 id="email"
//                 name="email"
//                 type="email"
//                 required
//                 value={formData.email}
//                 onChange={handleInputChange}
//                 placeholder="tu-email@ejemplo.com"
//                 disabled={loading}
//               />
//             </div>

//             <div>
//               <Label htmlFor="password">Contraseña</Label>
//               <Input
//                 id="password"
//                 name="password"
//                 type="password"
//                 required
//                 value={formData.password}
//                 onChange={handleInputChange}
//                 placeholder="Tu contraseña"
//                 disabled={loading}
//               />
//             </div>

//             {error && (
//               <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
//                 <strong>Error:</strong> {error}
//               </div>
//             )}

//             <Button type="submit" className="w-full" disabled={loading}>
//               {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
//             </Button>
//           </form>

//           <div className="mt-6 text-center space-y-2">
//             <Link
//               href="/forgot-password"
//               className="text-sm text-blue-600 hover:underline block"
//             >
//               ¿Olvidaste tu contraseña?
//             </Link>
//             <p className="text-sm text-gray-600">
//               ¿No tienes una cuenta?{" "}
//               <Link href="/register" className="text-blue-600 hover:underline">
//                 Registrarse
//               </Link>
//             </p>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

// "use client";

// import type React from "react";

// import { useState } from "react";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Stethoscope } from "lucide-react";
// import { supabase } from "@/lib/supabase";

// export default function LoginPage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [debugInfo, setDebugInfo] = useState<string | null>(null);
//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//   });

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//     if (error) setError(null);
//     if (debugInfo) setDebugInfo(null);
//   };

//   const checkIfUserIsAdmin = async (
//     userId: string,
//     userEmail: string | undefined
//   ) => {
//     try {
//       console.log("🔍 Verificando admin con ID:", userId);
//       console.log("🔍 Verificando admin con Email:", userEmail);

//       // Método 1: Consulta simple por ID
//       const { data: adminById, error: errorById } = await supabase
//         .from("admins")
//         .select("id, email, full_name, is_super_admin")
//         .eq("id", userId);

//       console.log("📊 Resultado consulta admin por ID:", {
//         data: adminById,
//         error: errorById,
//         count: adminById?.length || 0,
//       });

//       if (!errorById && adminById && adminById.length > 0) {
//         console.log("✅ Admin encontrado por ID:", adminById[0]);
//         return adminById[0];
//       }

//       // Método 2: Si falla por ID y tenemos email, intentar por email
//       if (userEmail) {
//         const { data: adminByEmail, error: errorByEmail } = await supabase
//           .from("admins")
//           .select("id, email, full_name, is_super_admin")
//           .eq("email", userEmail);

//         console.log("📊 Resultado consulta admin por email:", {
//           data: adminByEmail,
//           error: errorByEmail,
//           count: adminByEmail?.length || 0,
//         });

//         if (!errorByEmail && adminByEmail && adminByEmail.length > 0) {
//           console.log("✅ Admin encontrado por email:", adminByEmail[0]);
//           return adminByEmail[0];
//         }
//       }

//       console.log("❌ No es administrador");
//       return null;
//     } catch (error) {
//       console.error("❌ Excepción al verificar admin:", error);
//       return null;
//     }
//   };

//   const checkIfUserIsDoctor = async (
//     userId: string,
//     userEmail: string | undefined
//   ) => {
//     try {
//       console.log("🔍 Verificando doctor con ID:", userId);
//       console.log("🔍 Verificando doctor con Email:", userEmail);

//       // Método 1: Consulta simple por ID
//       const { data: doctorById, error: errorById } = await supabase
//         .from("doctors")
//         .select("id, email, full_name, is_active")
//         .eq("id", userId);

//       console.log("📊 Resultado consulta doctor por ID:", {
//         data: doctorById,
//         error: errorById,
//         count: doctorById?.length || 0,
//       });

//       if (!errorById && doctorById && doctorById.length > 0) {
//         console.log("✅ Doctor encontrado por ID:", doctorById[0]);
//         return doctorById[0];
//       }

//       // Método 2: Si falla por ID y tenemos email, intentar por email
//       if (userEmail) {
//         const { data: doctorByEmail, error: errorByEmail } = await supabase
//           .from("doctors")
//           .select("id, email, full_name, is_active")
//           .eq("email", userEmail);

//         console.log("📊 Resultado consulta doctor por email:", {
//           data: doctorByEmail,
//           error: errorByEmail,
//           count: doctorByEmail?.length || 0,
//         });

//         if (!errorByEmail && doctorByEmail && doctorByEmail.length > 0) {
//           console.log("✅ Doctor encontrado por email:", doctorByEmail[0]);
//           return doctorByEmail[0];
//         }
//       }

//       console.log("❌ No es médico");
//       return null;
//     } catch (error) {
//       console.error("❌ Excepción al verificar doctor:", error);
//       return null;
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError(null);
//     setDebugInfo(null);

//     try {
//       console.log("🔐 Iniciando autenticación...");

//       // 1. Autenticar usuario
//       const { data, error } = await supabase.auth.signInWithPassword({
//         email: formData.email,
//         password: formData.password,
//       });

//       if (error) throw error;

//       if (data.user) {
//         console.log("✅ Usuario autenticado:", {
//           id: data.user.id,
//           email: data.user.email || "Sin email",
//         });

//         // Verificar que tenemos la información necesaria
//         if (!data.user.id) {
//           throw new Error("Error: No se pudo obtener el ID del usuario");
//         }

//         // 2. Verificar si es administrador
//         const adminData = await checkIfUserIsAdmin(
//           data.user.id,
//           data.user.email
//         );
//         if (adminData) {
//           console.log("👑 Redirigiendo a panel de administrador");
//           router.push("/admin");
//           return;
//         }

//         // 3. Verificar si es médico
//         const doctorData = await checkIfUserIsDoctor(
//           data.user.id,
//           data.user.email
//         );
//         if (doctorData) {
//           if (doctorData.is_active) {
//             console.log("👨‍⚕️ Redirigiendo a dashboard de médico");
//             router.push("/dashboard");
//             return;
//           } else {
//             throw new Error(
//               "Tu cuenta de médico está inactiva. Contacta al administrador."
//             );
//           }
//         }

//         // 4. Si llegamos aquí, mostrar información de depuración
//         const debugMessage = `
// 🔍 INFORMACIÓN DE DEPURACIÓN:

// Usuario autenticado:
// - ID: ${data.user.id}
// - Email: ${data.user.email || "No disponible"}

// Verificaciones realizadas:
// - ✅ Autenticación exitosa
// - ❌ No encontrado en tabla 'admins'
// - ❌ No encontrado en tabla 'doctors'

// Posibles causas:
// 1. El ID del usuario no coincide con ningún registro
// 2. Problemas de permisos en las tablas
// 3. Políticas RLS bloqueando las consultas
// 4. El usuario no está registrado en ninguna tabla de roles

// Revisa la consola del navegador para más detalles.
//         `;
//         setDebugInfo(debugMessage);

//         throw new Error("Tu cuenta no tiene permisos asignados en el sistema");
//       }
//     } catch (error: any) {
//       console.error("❌ Error:", error);
//       setError(error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
//       <Card className="w-full max-w-md">
//         <CardHeader className="text-center">
//           <div className="flex justify-center mb-4">
//             <Stethoscope className="h-12 w-12 text-blue-600" />
//           </div>
//           <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
//           <CardDescription>Accede a tu cuenta</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <Label htmlFor="email">Correo Electrónico</Label>
//               <Input
//                 id="email"
//                 name="email"
//                 type="email"
//                 required
//                 value={formData.email}
//                 onChange={handleInputChange}
//                 placeholder="tu-email@ejemplo.com"
//               />
//             </div>

//             <div>
//               <Label htmlFor="password">Contraseña</Label>
//               <Input
//                 id="password"
//                 name="password"
//                 type="password"
//                 required
//                 value={formData.password}
//                 onChange={handleInputChange}
//                 placeholder="Tu contraseña"
//               />
//             </div>

//             {error && (
//               <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
//                 <strong>Error:</strong> {error}
//               </div>
//             )}

//             {debugInfo && (
//               <div className="text-xs text-gray-700 bg-yellow-50 p-3 rounded-md border border-yellow-200 max-h-60 overflow-y-auto">
//                 <pre className="whitespace-pre-wrap">{debugInfo}</pre>
//               </div>
//             )}

//             <Button type="submit" className="w-full" disabled={loading}>
//               {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
//             </Button>
//           </form>

//           <div className="mt-6 text-center space-y-2">
//             <Link
//               href="/forgot-password"
//               className="text-sm text-blue-600 hover:underline block"
//             >
//               ¿Olvidaste tu contraseña?
//             </Link>
//             <p className="text-sm text-gray-600">
//               ¿No tienes una cuenta?{" "}
//               <Link href="/register" className="text-blue-600 hover:underline">
//                 Registrarse
//               </Link>
//             </p>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
