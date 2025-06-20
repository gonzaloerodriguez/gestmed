"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, Plus, User, Eye, Stethoscope } from "lucide-react";
import { supabase, type Prescription } from "@/lib/supabase";
import { PaymentReminder } from "@/components/payment-reminder";
import { useAuthGuard } from "@/lib/auth-guard";

export default function DashboardPage() {
  // ✅ useAuthGuard maneja TODA la lógica de autenticación
  const {
    loading: authLoading,
    user,
    userData: doctor,
  } = useAuthGuard("doctor");

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ Solo cargar datos cuando la autenticación esté lista
    if (user && doctor && !authLoading) {
      loadPrescriptions();
    }
  }, [user, doctor, authLoading]);

  const loadPrescriptions = async () => {
    try {
      const { data: prescriptionsData, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setPrescriptions(prescriptionsData || []);
    } catch (error: any) {
      console.error("Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Mostrar loading mientras se verifica autenticación
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // ✅ Si llegamos aquí, el usuario está autenticado y autorizado
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {doctor && (
          <PaymentReminder
            doctorId={doctor.id}
            subscriptionStatus={doctor.subscription_status || "expired"}
            nextPaymentDate={doctor.next_payment_date || null}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dashboard/prescriptions/new">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="h-6 w-6 text-green-600 mr-2" />
                  Nueva Receta
                </CardTitle>
                <CardDescription>Crear una nueva receta médica</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dashboard/prescriptions">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="h-6 w-6 text-blue-600 mr-2" />
                  Ver Recetas
                </CardTitle>
                <CardDescription>Gestionar recetas existentes</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dashboard/consultations/new">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Stethoscope className="h-6 w-6 text-purple-600 mr-2" />
                  Nueva Consulta
                </CardTitle>
                <CardDescription>Registrar nueva consulta</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dashboard/profile">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-6 w-6 text-orange-600 mr-2" />
                  Mi Perfil
                </CardTitle>
                <CardDescription>
                  Actualizar información personal
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* Recent Prescriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-6 w-6 text-gray-600 mr-2" />
              Recetas Recientes
            </CardTitle>
            <CardDescription>Últimas 5 recetas creadas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando recetas...</p>
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No hay recetas creadas aún</p>
                <Link href="/dashboard/prescriptions/new">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera Receta
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {prescriptions.map((prescription) => (
                  <div
                    key={prescription.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">
                        {prescription.patient_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(
                          prescription.date_prescribed
                        ).toLocaleDateString("es-ES")}
                      </p>
                    </div>
                    <Link href={`/dashboard/prescriptions/${prescription.id}`}>
                      <Button variant="outline" size="sm">
                        Ver Detalle
                      </Button>
                    </Link>
                  </div>
                ))}
                <div className="text-center pt-4">
                  <Link href="/dashboard/prescriptions">
                    <Button variant="outline">Ver Todas las Recetas</Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { FileText, Plus, User, Eye, Stethoscope } from "lucide-react";
// import { supabase, type Prescription } from "@/lib/supabase";
// import { PaymentReminder } from "@/components/payment-reminder";
// import { useAuthGuard } from "@/lib/auth-guard";

// export default function DashboardPage() {
//   const router = useRouter();
//   const {
//     loading: authLoading,
//     user,
//     userData: doctor,
//   } = useAuthGuard("doctor");
//   const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (user && doctor && !authLoading) {
//       loadPrescriptions();
//     }
//   }, [user, doctor, authLoading]);

//   const loadPrescriptions = async () => {
//     try {
//       // Obtener recetas recientes
//       const { data: prescriptionsData, error: prescriptionsError } =
//         await supabase
//           .from("prescriptions")
//           .select("*")
//           .eq("doctor_id", user.id)
//           .order("created_at", { ascending: false })
//           .limit(5);

//       if (prescriptionsError) throw prescriptionsError;
//       setPrescriptions(prescriptionsData || []);
//     } catch (error: any) {
//       console.error("Error:", error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Mostrar loading mientras se verifica autenticación
//   if (authLoading || loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Cargando...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {doctor && (
//           <PaymentReminder
//             doctorId={doctor.id}
//             subscriptionStatus={doctor.subscription_status || "expired"}
//             nextPaymentDate={doctor.next_payment_date || null}
//           />
//         )}

//         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//           <Card className="hover:shadow-lg transition-shadow cursor-pointer">
//             <Link href="/dashboard/prescriptions/new">
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <Plus className="h-6 w-6 text-green-600 mr-2" />
//                   Nueva Receta
//                 </CardTitle>
//                 <CardDescription>Crear una nueva receta médica</CardDescription>
//               </CardHeader>
//             </Link>
//           </Card>

//           <Card className="hover:shadow-lg transition-shadow cursor-pointer">
//             <Link href="/dashboard/prescriptions">
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <Eye className="h-6 w-6 text-blue-600 mr-2" />
//                   Ver Recetas
//                 </CardTitle>
//                 <CardDescription>Gestionar recetas existentes</CardDescription>
//               </CardHeader>
//             </Link>
//           </Card>

//           <Card className="hover:shadow-lg transition-shadow cursor-pointer">
//             <Link href="/dashboard/consultations/new">
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <Stethoscope className="h-6 w-6 text-purple-600 mr-2" />
//                   Nueva Consulta
//                 </CardTitle>
//                 <CardDescription>Registrar nueva consulta</CardDescription>
//               </CardHeader>
//             </Link>
//           </Card>

//           <Card className="hover:shadow-lg transition-shadow cursor-pointer">
//             <Link href="/dashboard/profile">
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <User className="h-6 w-6 text-orange-600 mr-2" />
//                   Mi Perfil
//                 </CardTitle>
//                 <CardDescription>
//                   Actualizar información personal
//                 </CardDescription>
//               </CardHeader>
//             </Link>
//           </Card>
//         </div>

//         {/* Recent Prescriptions */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center">
//               <FileText className="h-6 w-6 text-gray-600 mr-2" />
//               Recetas Recientes
//             </CardTitle>
//             <CardDescription>Últimas 5 recetas creadas</CardDescription>
//           </CardHeader>
//           <CardContent>
//             {prescriptions.length === 0 ? (
//               <div className="text-center py-8">
//                 <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                 <p className="text-gray-600">No hay recetas creadas aún</p>
//                 <Link href="/dashboard/prescriptions/new">
//                   <Button className="mt-4">
//                     <Plus className="h-4 w-4 mr-2" />
//                     Crear Primera Receta
//                   </Button>
//                 </Link>
//               </div>
//             ) : (
//               <div className="space-y-4">
//                 {prescriptions.map((prescription) => (
//                   <div
//                     key={prescription.id}
//                     className="flex items-center justify-between p-4 border rounded-lg"
//                   >
//                     <div>
//                       <h3 className="font-medium">
//                         {prescription.patient_name}
//                       </h3>
//                       <p className="text-sm text-gray-600">
//                         {new Date(
//                           prescription.date_prescribed
//                         ).toLocaleDateString("es-ES")}
//                       </p>
//                     </div>
//                     <Link href={`/dashboard/prescriptions/${prescription.id}`}>
//                       <Button variant="outline" size="sm">
//                         Ver Detalle
//                       </Button>
//                     </Link>
//                   </div>
//                 ))}
//                 <div className="text-center pt-4">
//                   <Link href="/dashboard/prescriptions">
//                     <Button variant="outline">Ver Todas las Recetas</Button>
//                   </Link>
//                 </div>
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </main>
//     </div>
//   );
// }
