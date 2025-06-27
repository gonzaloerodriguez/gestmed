"use client";

import { ConsultationsTable } from "@/components/consultation/consultations-table";
import { Archive, Calendar, Plus, Stethoscope, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsultationWithPatientFlat } from "@/lib/supabase/types/consultations";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabase";
import { useRouter } from "next/navigation";

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<
    ConsultationWithPatientFlat[]
  >([]);
  const router = useRouter();
  useEffect(() => {
    checkUserAndLoadConsultations();
  }, []);

  const checkUserAndLoadConsultations = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      await loadConsultations(user.id);
    } catch (error: any) {
      console.error("Error:", error.message);
    }
  };

  const loadConsultations = async (doctorId: string) => {
    try {
      const { data, error } = await supabase
        .from("consultations")
        .select(
          `
          id,
          consultation_date,
          reason_for_visit,
          diagnosis,
          created_at,
          medical_history:medical_histories!inner(
            patient:patients!inner(
              full_name,
              cedula
            )
          )
        `
        )
        .eq("doctor_id", doctorId)
        .order("consultation_date", { ascending: false });

      if (error) throw error;

      // Transformar los datos para que coincidan con la interfaz
      const transformedData: ConsultationWithPatientFlat[] = (data || []).map(
        (item: any) => ({
          id: item.id,
          consultation_date: item.consultation_date,
          reason_for_visit: item.reason_for_visit,
          diagnosis: item.diagnosis,
          created_at: item.created_at,
          medical_history: {
            patient: {
              full_name: item.medical_history.patient.full_name,
              cedula: item.medical_history.patient.cedula,
            },
          },
        })
      );

      setConsultations(transformedData);
    } catch (error: any) {
      console.error("Error loading consultations:", error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Consultas
              </CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{consultations.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  consultations.filter((c) => {
                    const consultationDate = new Date(c.consultation_date);
                    const now = new Date();
                    return (
                      consultationDate.getMonth() === now.getMonth() &&
                      consultationDate.getFullYear() === now.getFullYear()
                    );
                  }).length
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pacientes Únicos
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  new Set(
                    consultations.map((c) => c.medical_history.patient.cedula)
                  ).size
                }
              </div>
            </CardContent>
          </Card>
        </div>
        <ConsultationsTable />
      </main>
    </div>
  );
}

// "use client";

// import { ConsultationsTable } from "@/components/consultation/consultations-table";

// export default function ConsultationsPage() {
//   return (
//     <div className="min-h-screen bg-background">
//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="mb-8">
//           <h1 className="text-3xl font-bold text-gray-900">
//             Consultas Médicas
//           </h1>
//           <p className="text-gray-600">
//             Gestiona todas las consultas de tus pacientes
//           </p>
//         </div>

//         <ConsultationsTable />
//       </main>
//     </div>
//   );
// }

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
// import { Input } from "@/components/ui/input";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Plus, Search, Eye, Calendar, User, Stethoscope } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import type { ConsultationWithPatientFlat } from "@/lib/supabase/types/consultations";

// export default function ConsultationsPage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(true);
//   const [consultations, setConsultations] = useState<
//     ConsultationWithPatientFlat[]
//   >([]);
//   const [filteredConsultations, setFilteredConsultations] = useState<
//     ConsultationWithPatientFlat[]
//   >([]);
//   const [searchTerm, setSearchTerm] = useState("");

//   useEffect(() => {
//     checkUserAndLoadConsultations();
//   }, []);

//   useEffect(() => {
//     // Filtrar consultas cuando cambie el término de búsqueda
//     if (searchTerm.trim() === "") {
//       setFilteredConsultations(consultations);
//     } else {
//       const filtered = consultations.filter(
//         (consultation) =>
//           consultation.medical_history.patient.full_name
//             .toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           consultation.medical_history.patient.cedula.includes(searchTerm) ||
//           consultation.reason_for_visit
//             .toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           consultation.diagnosis
//             ?.toLowerCase()
//             .includes(searchTerm.toLowerCase())
//       );
//       setFilteredConsultations(filtered);
//     }
//   }, [searchTerm, consultations]);

//   const checkUserAndLoadConsultations = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         router.push("/login");
//         return;
//       }

//       await loadConsultations(user.id);
//     } catch (error: any) {
//       console.error("Error:", error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadConsultations = async (doctorId: string) => {
//     try {
//       const { data, error } = await supabase
//         .from("consultations")
//         .select(
//           `
//           id,
//           consultation_date,
//           reason_for_visit,
//           diagnosis,
//           created_at,
//           medical_history:medical_histories!inner(
//             patient:patients!inner(
//               full_name,
//               cedula
//             )
//           )
//         `
//         )
//         .eq("doctor_id", doctorId)
//         .order("consultation_date", { ascending: false });

//       if (error) throw error;

//       // Transformar los datos para que coincidan con la interfaz
//       const transformedData: ConsultationWithPatientFlat[] = (data || []).map(
//         (item: any) => ({
//           id: item.id,
//           consultation_date: item.consultation_date,
//           reason_for_visit: item.reason_for_visit,
//           diagnosis: item.diagnosis,
//           created_at: item.created_at,
//           medical_history: {
//             patient: {
//               full_name: item.medical_history.patient.full_name,
//               cedula: item.medical_history.patient.cedula,
//             },
//           },
//         })
//       );

//       setConsultations(transformedData);
//       setFilteredConsultations(transformedData);
//     } catch (error: any) {
//       console.error("Error loading consultations:", error.message);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-muted-foreground">Cargando consultas...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       {/* Header */}
//       <header className="bg-card shadow-sm">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center justify-end py-6 w-full">
//             <Link href="/dashboard/consultations/new">
//               <Button>
//                 <Plus className="h-4 w-4 mr-2" />
//                 Nueva Consulta
//               </Button>
//             </Link>
//           </div>
//         </div>
//       </header>

//       {/* Main Content */}
//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Stats Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Total de Consultas
//               </CardTitle>
//               <Stethoscope className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{consultations.length}</div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
//               <Calendar className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">
//                 {
//                   consultations.filter((c) => {
//                     const consultationDate = new Date(c.consultation_date);
//                     const now = new Date();
//                     return (
//                       consultationDate.getMonth() === now.getMonth() &&
//                       consultationDate.getFullYear() === now.getFullYear()
//                     );
//                   }).length
//                 }
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Pacientes Únicos
//               </CardTitle>
//               <User className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">
//                 {
//                   new Set(
//                     consultations.map((c) => c.medical_history.patient.cedula)
//                   ).size
//                 }
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Search */}
//         <Card className="mb-6">
//           <CardHeader>
//             <CardTitle>Buscar Consultas</CardTitle>
//             <CardDescription>
//               Busca por nombre del paciente, cédula, motivo o diagnóstico
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="relative">
//               <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
//               <Input
//                 placeholder="Buscar consultas..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10"
//               />
//             </div>
//           </CardContent>
//         </Card>

//         {/* Consultations Table */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Lista de Consultas</CardTitle>
//             <CardDescription>
//               {filteredConsultations.length} de {consultations.length} consultas
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             {filteredConsultations.length === 0 ? (
//               <div className="text-center py-12">
//                 <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                 <h3 className="text-lg font-medium text-gray-900 mb-2">
//                   {consultations.length === 0
//                     ? "No hay consultas registradas"
//                     : "No se encontraron consultas"}
//                 </h3>
//                 <p className="text-gray-600 mb-4">
//                   {consultations.length === 0
//                     ? "Comienza registrando tu primera consulta médica"
//                     : "Intenta con otros términos de búsqueda"}
//                 </p>
//                 {consultations.length === 0 && (
//                   <Link href="/dashboard/consultations/new">
//                     <Button>
//                       <Plus className="h-4 w-4 mr-2" />
//                       Crear Primera Consulta
//                     </Button>
//                   </Link>
//                 )}
//               </div>
//             ) : (
//               <div className="overflow-x-auto">
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Paciente</TableHead>
//                       <TableHead>Fecha</TableHead>
//                       <TableHead>Motivo</TableHead>
//                       <TableHead>Diagnóstico</TableHead>
//                       <TableHead className="text-right">Acciones</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {filteredConsultations.map((consultation) => (
//                       <TableRow key={consultation.id}>
//                         <TableCell>
//                           <div>
//                             <div className="font-medium">
//                               {consultation.medical_history.patient.full_name}
//                             </div>
//                             <div className="text-sm text-gray-500">
//                               CI: {consultation.medical_history.patient.cedula}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div>
//                             <div className="font-medium">
//                               {new Date(
//                                 consultation.consultation_date
//                               ).toLocaleDateString("es-ES")}
//                             </div>
//                             <div className="text-sm text-gray-500">
//                               {new Date(
//                                 consultation.created_at
//                               ).toLocaleTimeString("es-ES", {
//                                 hour: "2-digit",
//                                 minute: "2-digit",
//                               })}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div className="max-w-xs truncate">
//                             {consultation.reason_for_visit}
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div className="max-w-xs truncate">
//                             {consultation.diagnosis || "Sin diagnóstico"}
//                           </div>
//                         </TableCell>
//                         <TableCell className="text-right">
//                           <Link
//                             href={`/dashboard/consultations/${consultation.id}`}
//                           >
//                             <Button variant="outline" size="sm">
//                               <Eye className="h-4 w-4 mr-2" />
//                               Ver Detalle
//                             </Button>
//                           </Link>
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </main>
//     </div>
//   );
// }
