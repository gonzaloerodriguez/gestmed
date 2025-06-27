"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Calendar, Eye, Archive } from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import { ConsultationActions } from "./consultation-actions";
import type { ConsultationForTable } from "@/lib/supabase/types/consultations";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function ConsultationsTable() {
  const router = useRouter();
  const [consultations, setConsultations] = useState<ConsultationForTable[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { showError } = useToastEnhanced();

  useEffect(() => {
    loadConsultations();
  }, []);

  const loadConsultations = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("consultations")
        .select(
          `
          id,
          consultation_date,
          reason_for_visit,
          diagnosis,
          created_at,
          is_active,
          medical_histories!inner(
            patients!inner(
              full_name,
              cedula
            )
          )
        `
        )
        .eq("doctor_id", user.id)
        .eq("is_active", true)
        .order("consultation_date", { ascending: false });

      if (error) throw error;

      // Transformar los datos para que coincidan con el tipo esperado
      const transformedData: ConsultationForTable[] = (data || []).map(
        (item: any) => ({
          id: item.id,
          consultation_date: item.consultation_date,
          reason_for_visit: item.reason_for_visit,
          diagnosis: item.diagnosis,
          status: item.diagnosis ? "completed" : "in_progress",
          created_at: item.created_at,
          patient_name:
            item.medical_histories?.patients?.full_name || "Sin nombre",
          patient_cedula:
            item.medical_histories?.patients?.cedula || "Sin cédula",
        })
      );

      setConsultations(transformedData);
    } catch (error: any) {
      showError("Error de carga", "No se pudieron cargar las consultas");
    } finally {
      setLoading(false);
    }
  };

  const handleConsultationArchived = () => {
    // Recargar la lista después de archivar
    loadConsultations();
  };

  const filteredConsultations = consultations.filter((consultation) => {
    const searchLower = searchTerm.toLowerCase();
    const patientName = consultation.patient_name.toLowerCase();
    const patientCedula = consultation.patient_cedula.toLowerCase();
    const reason = consultation.reason_for_visit?.toLowerCase() || "";
    const diagnosis = consultation.diagnosis?.toLowerCase() || "";

    return (
      patientName.includes(searchLower) ||
      patientCedula.includes(searchLower) ||
      reason.includes(searchLower) ||
      diagnosis.includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Cargando consultas...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Consultas Médicas
            </CardTitle>
            <CardDescription>
              Gestiona y revisa todas las consultas realizadas
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/dashboard/archived">
              <Button variant="outline" size="sm">
                <Archive className="h-4 w-4 mr-2" />
                Ver Archivados
              </Button>
            </Link>
            <Button
              onClick={() => router.push("/dashboard/consultations/new")}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Consulta
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Barra de búsqueda */}
        <div className="flex items-center space-x-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por paciente, cédula, motivo o diagnóstico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Vista Mobile - Cards */}
        <div className="block md:hidden space-y-4">
          {filteredConsultations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm
                ? "No se encontraron consultas que coincidan con la búsqueda"
                : "No hay consultas registradas"}
            </div>
          ) : (
            filteredConsultations.map((consultation) => (
              <Card key={consultation.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm truncate">
                        {consultation.patient_name}
                      </h3>
                      <Badge
                        variant={
                          consultation.status === "completed"
                            ? "default"
                            : "secondary"
                        }
                        className="ml-2 text-xs"
                      >
                        {consultation.status === "completed"
                          ? "Completa"
                          : "Pendiente"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">
                      CI: {consultation.patient_cedula}
                    </p>
                    <p className="text-xs text-gray-600 mb-2">
                      {formatDate(consultation.consultation_date)}
                    </p>
                    <p className="text-sm text-gray-800 mb-2 line-clamp-2">
                      <span className="font-medium">Motivo:</span>{" "}
                      {consultation.reason_for_visit || "Sin especificar"}
                    </p>
                    {consultation.diagnosis && (
                      <p className="text-sm text-gray-600 line-clamp-1">
                        <span className="font-medium">Diagnóstico:</span>{" "}
                        {consultation.diagnosis}
                      </p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          router.push(
                            `/dashboard/consultations/${consultation.id}`
                          )
                        }
                        className="w-full"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      <ConsultationActions
                        consultationId={consultation.id}
                        patientName={consultation.patient_name}
                        onArchived={handleConsultationArchived}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Vista Desktop - Tabla */}
        <div className="hidden md:block">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Paciente</TableHead>
                  <TableHead className="w-[100px]">Fecha</TableHead>
                  <TableHead className="min-w-0 flex-1">
                    Motivo / Diagnóstico
                  </TableHead>
                  <TableHead className="w-[100px]">Estado</TableHead>
                  <TableHead className="w-[80px] text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConsultations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-gray-500"
                    >
                      {searchTerm
                        ? "No se encontraron consultas que coincidan con la búsqueda"
                        : "No hay consultas registradas"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConsultations.map((consultation) => (
                    <TableRow key={consultation.id}>
                      <TableCell className="w-[180px]">
                        <div>
                          <div
                            className="font-medium text-sm truncate"
                            style={{ maxWidth: "160px" }}
                          >
                            {consultation.patient_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            CI: {consultation.patient_cedula}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="w-[100px] text-sm">
                        {formatDate(consultation.consultation_date)}
                      </TableCell>
                      <TableCell className="min-w-0">
                        <div className="space-y-1">
                          <div
                            className="text-sm font-medium line-clamp-1"
                            title={consultation.reason_for_visit}
                          >
                            {consultation.reason_for_visit || "Sin especificar"}
                          </div>
                          {consultation.diagnosis && (
                            <div
                              className="text-xs text-gray-600 line-clamp-1"
                              title={consultation.diagnosis}
                            >
                              <span className="font-medium">Diagnóstico:</span>{" "}
                              {consultation.diagnosis}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="w-[100px]">
                        <Badge
                          variant={
                            consultation.status === "completed"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs whitespace-nowrap"
                        >
                          {consultation.status === "completed"
                            ? "Completa"
                            : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-[80px] text-right">
                        <ConsultationActions
                          consultationId={consultation.id}
                          patientName={consultation.patient_name}
                          onArchived={handleConsultationArchived}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Información adicional */}
        {filteredConsultations.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center md:text-left">
            Mostrando {filteredConsultations.length} de {consultations.length}{" "}
            consultas
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// "use client";

// import { useState, useEffect } from "react";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   Search,
//   Plus,
//   Calendar,
//   Eye,
//   Edit,
//   MoreHorizontal,
//   Archive,
//   Loader2,
// } from "lucide-react";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import { supabase } from "@/lib/supabase/supabase";
// import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
// import { useConsultationOperations } from "@/hooks/use-consultation-operations";
// import type { ConsultationForTable } from "@/lib/supabase/types/consultations";
// import { useRouter } from "next/navigation";
// import Link from "next/link";

// export function ConsultationsTable() {
//   const router = useRouter();
//   const [consultations, setConsultations] = useState<ConsultationForTable[]>(
//     []
//   );
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
//   const [consultationToArchive, setConsultationToArchive] = useState<{
//     id: string;
//     patientName: string;
//   } | null>(null);

//   const { showError } = useToastEnhanced();
//   const { loading: operationLoading, archiveConsultation } =
//     useConsultationOperations();

//   useEffect(() => {
//     loadConsultations();
//   }, []);

//   const loadConsultations = async () => {
//     try {
//       setLoading(true);

//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         router.push("/login");
//         return;
//       }

//       const { data, error } = await supabase
//         .from("consultations")
//         .select(
//           `
//           id,
//           consultation_date,
//           reason_for_visit,
//           diagnosis,
//           status,
//           created_at,
//           medical_history:medical_histories!inner(
//             patient:patients!inner(
//               full_name,
//               cedula
//             )
//           )
//         `
//         )
//         .eq("doctor_id", user.id)
//         .eq("is_active", true)
//         .order("consultation_date", { ascending: false });

//       if (error) throw error;

//       // Transformar los datos para que coincidan con el tipo esperado
//       const transformedData: ConsultationForTable[] = (data || []).map(
//         (item: any) => ({
//           id: item.id,
//           consultation_date: item.consultation_date,
//           reason_for_visit: item.reason_for_visit,
//           diagnosis: item.diagnosis,
//           status: item.status || (item.diagnosis ? "completed" : "in_progress"),
//           created_at: item.created_at,
//           patient_name:
//             item.medical_history?.patient?.full_name || "Sin nombre",
//           patient_cedula: item.medical_history?.patient?.cedula || "Sin cédula",
//           medical_history: item.medical_history,
//         })
//       );

//       setConsultations(transformedData);
//     } catch (error: any) {
//       console.error("Error cargando consultas:", error);
//       showError("Error de carga", "No se pudieron cargar las consultas");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleArchiveConsultation = async () => {
//     if (!consultationToArchive) return;

//     const success = await archiveConsultation(
//       consultationToArchive.id,
//       consultationToArchive.patientName
//     );

//     if (success) {
//       // Actualizar la lista local removiendo la consulta archivada
//       setConsultations((prev) =>
//         prev.filter((c) => c.id !== consultationToArchive.id)
//       );
//       setArchiveDialogOpen(false);
//       setConsultationToArchive(null);
//     }
//   };

//   const openArchiveDialog = (consultationId: string, patientName: string) => {
//     setConsultationToArchive({ id: consultationId, patientName });
//     setArchiveDialogOpen(true);
//   };

//   const filteredConsultations = consultations.filter((consultation) => {
//     const searchLower = searchTerm.toLowerCase();
//     const patientName = consultation.patient_name?.toLowerCase() || "";
//     const patientCedula = consultation.patient_cedula?.toLowerCase() || "";
//     const reason = consultation.reason_for_visit?.toLowerCase() || "";
//     const diagnosis = consultation.diagnosis?.toLowerCase() || "";

//     return (
//       patientName.includes(searchLower) ||
//       patientCedula.includes(searchLower) ||
//       reason.includes(searchLower) ||
//       diagnosis.includes(searchLower)
//     );
//   });

//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleDateString("es-ES", {
//       year: "numeric",
//       month: "short",
//       day: "numeric",
//     });
//   };

//   const getStatusBadge = (status: string) => {
//     switch (status) {
//       case "completed":
//         return (
//           <Badge variant="default" className="whitespace-nowrap text-xs">
//             Completa
//           </Badge>
//         );
//       case "in_progress":
//         return (
//           <Badge variant="secondary" className="whitespace-nowrap text-xs">
//             Pendiente
//           </Badge>
//         );
//       default:
//         return (
//           <Badge variant="outline" className="whitespace-nowrap text-xs">
//             {status}
//           </Badge>
//         );
//     }
//   };

//   if (loading) {
//     return (
//       <Card>
//         <CardContent className="flex items-center justify-center py-8">
//           <Loader2 className="h-8 w-8 animate-spin mr-2" />
//           <span>Cargando consultas...</span>
//         </CardContent>
//       </Card>
//     );
//   }

//   return (
//     <>
//       <Card>
//         <CardHeader>
//           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
//             <div>
//               <CardTitle className="flex items-center">
//                 <Calendar className="h-5 w-5 mr-2" />
//                 Consultas Médicas
//               </CardTitle>
//               <CardDescription>
//                 Gestiona y revisa todas las consultas realizadas
//               </CardDescription>
//             </div>
//             <div className="flex gap-2 w-full sm:w-auto">
//               <Link href="/dashboard/archived" className="flex-1 sm:flex-none">
//                 <Button
//                   variant="outline"
//                   className="w-full sm:w-auto bg-transparent"
//                 >
//                   <Archive className="h-4 w-4 mr-2" />
//                   Ver Archivados
//                 </Button>
//               </Link>
//               <Button
//                 onClick={() => router.push("/dashboard/consultations/new")}
//                 className="flex-1 sm:flex-none"
//               >
//                 <Plus className="h-4 w-4 mr-2" />
//                 Nueva Consulta
//               </Button>
//             </div>
//           </div>
//         </CardHeader>
//         <CardContent>
//           {/* Barra de búsqueda */}
//           <div className="flex items-center space-x-2 mb-6">
//             <div className="relative flex-1">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//               <Input
//                 placeholder="Buscar por paciente, cédula, motivo o diagnóstico..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10"
//               />
//             </div>
//           </div>

//           {/* Vista Mobile - Cards */}
//           <div className="block md:hidden space-y-4">
//             {filteredConsultations.length === 0 ? (
//               <div className="text-center py-8 text-gray-500">
//                 {searchTerm
//                   ? "No se encontraron consultas que coincidan con la búsqueda"
//                   : "No hay consultas registradas"}
//               </div>
//             ) : (
//               filteredConsultations.map((consultation) => (
//                 <Card key={consultation.id} className="p-4">
//                   <div className="flex items-start justify-between">
//                     <div className="flex-1 min-w-0">
//                       <div className="flex items-center justify-between mb-2">
//                         <h3 className="font-medium text-sm truncate">
//                           {consultation.patient_name}
//                         </h3>
//                         {getStatusBadge(consultation.status)}
//                       </div>
//                       <p className="text-xs text-gray-500 mb-1">
//                         CI: {consultation.patient_cedula}
//                       </p>
//                       <p className="text-xs text-gray-600 mb-2">
//                         {formatDate(consultation.consultation_date)}
//                       </p>
//                       <p className="text-sm text-gray-800 mb-2 line-clamp-2">
//                         <span className="font-medium">Motivo:</span>{" "}
//                         {consultation.reason_for_visit || "Sin especificar"}
//                       </p>
//                       {consultation.diagnosis && (
//                         <p className="text-sm text-gray-600 line-clamp-1">
//                           <span className="font-medium">Diagnóstico:</span>{" "}
//                           {consultation.diagnosis}
//                         </p>
//                       )}
//                     </div>
//                     <div className="ml-4 flex-shrink-0">
//                       <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                           <Button variant="ghost" className="h-8 w-8 p-0">
//                             <MoreHorizontal className="h-4 w-4" />
//                           </Button>
//                         </DropdownMenuTrigger>
//                         <DropdownMenuContent align="end">
//                           <DropdownMenuItem asChild>
//                             <Link
//                               href={`/dashboard/consultations/${consultation.id}`}
//                             >
//                               <Eye className="h-4 w-4 mr-2" />
//                               Ver
//                             </Link>
//                           </DropdownMenuItem>
//                           <DropdownMenuItem asChild>
//                             <Link
//                               href={`/dashboard/consultations/${consultation.id}/edit`}
//                             >
//                               <Edit className="h-4 w-4 mr-2" />
//                               Editar
//                             </Link>
//                           </DropdownMenuItem>
//                           <DropdownMenuItem
//                             className="text-orange-600"
//                             onClick={() =>
//                               openArchiveDialog(
//                                 consultation.id,
//                                 consultation.patient_name
//                               )
//                             }
//                           >
//                             <Archive className="h-4 w-4 mr-2" />
//                             Archivar
//                           </DropdownMenuItem>
//                         </DropdownMenuContent>
//                       </DropdownMenu>
//                     </div>
//                   </div>
//                 </Card>
//               ))
//             )}
//           </div>

//           {/* Vista Desktop - Tabla */}
//           <div className="hidden md:block">
//             <div className="rounded-md border overflow-hidden">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead className="w-[180px]">Paciente</TableHead>
//                     <TableHead className="w-[100px]">Fecha</TableHead>
//                     <TableHead className="min-w-0 flex-1">
//                       Motivo / Diagnóstico
//                     </TableHead>
//                     <TableHead className="w-[100px]">Estado</TableHead>
//                     <TableHead className="w-[80px] text-right">
//                       Acciones
//                     </TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {filteredConsultations.length === 0 ? (
//                     <TableRow>
//                       <TableCell
//                         colSpan={5}
//                         className="text-center py-8 text-gray-500"
//                       >
//                         {searchTerm
//                           ? "No se encontraron consultas que coincidan con la búsqueda"
//                           : "No hay consultas registradas"}
//                       </TableCell>
//                     </TableRow>
//                   ) : (
//                     filteredConsultations.map((consultation) => (
//                       <TableRow key={consultation.id}>
//                         <TableCell className="w-[180px]">
//                           <div>
//                             <div className="font-medium text-sm line-clamp-1">
//                               {consultation.patient_name}
//                             </div>
//                             <div className="text-xs text-gray-500">
//                               CI: {consultation.patient_cedula}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell className="w-[100px] text-sm">
//                           {formatDate(consultation.consultation_date)}
//                         </TableCell>
//                         <TableCell className="min-w-0">
//                           <div className="space-y-1">
//                             <div
//                               className="text-sm font-medium line-clamp-1"
//                               title={consultation.reason_for_visit}
//                             >
//                               {consultation.reason_for_visit ||
//                                 "Sin especificar"}
//                             </div>
//                             {consultation.diagnosis && (
//                               <div
//                                 className="text-xs text-gray-600 line-clamp-1"
//                                 title={consultation.diagnosis}
//                               >
//                                 <span className="font-medium">
//                                   Diagnóstico:
//                                 </span>{" "}
//                                 {consultation.diagnosis}
//                               </div>
//                             )}
//                           </div>
//                         </TableCell>
//                         <TableCell className="w-[100px]">
//                           {getStatusBadge(consultation.status)}
//                         </TableCell>
//                         <TableCell className="w-[80px] text-right">
//                           <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                               <Button variant="ghost" className="h-8 w-8 p-0">
//                                 <MoreHorizontal className="h-4 w-4" />
//                               </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent align="end">
//                               <DropdownMenuItem asChild>
//                                 <Link
//                                   href={`/dashboard/consultations/${consultation.id}`}
//                                 >
//                                   <Eye className="h-4 w-4 mr-2" />
//                                   Ver
//                                 </Link>
//                               </DropdownMenuItem>
//                               <DropdownMenuItem asChild>
//                                 <Link
//                                   href={`/dashboard/consultations/${consultation.id}/edit`}
//                                 >
//                                   <Edit className="h-4 w-4 mr-2" />
//                                   Editar
//                                 </Link>
//                               </DropdownMenuItem>
//                               <DropdownMenuItem
//                                 className="text-orange-600"
//                                 onClick={() =>
//                                   openArchiveDialog(
//                                     consultation.id,
//                                     consultation.patient_name
//                                   )
//                                 }
//                               >
//                                 <Archive className="h-4 w-4 mr-2" />
//                                 Archivar
//                               </DropdownMenuItem>
//                             </DropdownMenuContent>
//                           </DropdownMenu>
//                         </TableCell>
//                       </TableRow>
//                     ))
//                   )}
//                 </TableBody>
//               </Table>
//             </div>
//           </div>

//           {/* Información adicional */}
//           {filteredConsultations.length > 0 && (
//             <div className="mt-4 text-sm text-gray-500 text-center md:text-left">
//               Mostrando {filteredConsultations.length} de {consultations.length}{" "}
//               consultas
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* Dialog de confirmación para archivar */}
//       <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>¿Archivar consulta?</AlertDialogTitle>
//             <AlertDialogDescription>
//               Esta acción archivará la consulta de{" "}
//               <strong>{consultationToArchive?.patientName}</strong>. La consulta
//               no se eliminará permanentemente y podrá ser restaurada desde la
//               sección de archivados.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel disabled={operationLoading}>
//               Cancelar
//             </AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleArchiveConsultation}
//               disabled={operationLoading}
//               className="bg-orange-600 hover:bg-orange-700"
//             >
//               {operationLoading ? (
//                 <>
//                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                   Archivando...
//                 </>
//               ) : (
//                 <>
//                   <Archive className="h-4 w-4 mr-2" />
//                   Archivar
//                 </>
//               )}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </>
//   );
// }

// "use client";

// import { useState, useEffect } from "react";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Search, Plus, Calendar, Eye } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
// import { ConsultationActions } from "./consultation-actions";
// import type { ConsultationForTable } from "@/lib/supabase/types/consultations";
// import { useRouter } from "next/navigation";

// export function ConsultationsTable() {
//   const router = useRouter();
//   const [consultations, setConsultations] = useState<ConsultationForTable[]>(
//     []
//   );
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const { showError } = useToastEnhanced();

//   useEffect(() => {
//     loadConsultations();
//   }, []);

//   const loadConsultations = async () => {
//     try {
//       setLoading(true);

//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) return;

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
//         .eq("doctor_id", user.id)
//         .order("consultation_date", { ascending: false });

//       if (error) throw error;

//       // Transformar los datos para que coincidan con el tipo esperado
//       const transformedData: ConsultationForTable[] = (data || []).map(
//         (item: any) => ({
//           id: item.id,
//           consultation_date: item.consultation_date,
//           reason_for_visit: item.reason_for_visit,
//           diagnosis: item.diagnosis,
//           created_at: item.created_at,
//           medical_history: item.medical_history,
//         })
//       );

//       setConsultations(transformedData);
//     } catch (error: any) {
//       console.error("Error cargando consultas:", error);
//       showError("Error de carga", "No se pudieron cargar las consultas");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleConsultationDeleted = () => {
//     // Recargar la lista después de eliminar
//     loadConsultations();
//   };

//   const filteredConsultations = consultations.filter((consultation) => {
//     const searchLower = searchTerm.toLowerCase();
//     const patientName =
//       consultation.medical_history?.patient?.full_name?.toLowerCase() || "";
//     const patientCedula =
//       consultation.medical_history?.patient?.cedula?.toLowerCase() || "";
//     const reason = consultation.reason_for_visit?.toLowerCase() || "";
//     const diagnosis = consultation.diagnosis?.toLowerCase() || "";

//     return (
//       patientName.includes(searchLower) ||
//       patientCedula.includes(searchLower) ||
//       reason.includes(searchLower) ||
//       diagnosis.includes(searchLower)
//     );
//   });

//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleDateString("es-ES", {
//       year: "numeric",
//       month: "short",
//       day: "numeric",
//     });
//   };

//   const truncateText = (text: string, maxLength: number) => {
//     if (text.length <= maxLength) return text;
//     return text.substring(0, maxLength) + "...";
//   };

//   if (loading) {
//     return (
//       <Card>
//         <CardContent className="flex items-center justify-center py-8">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//           <span className="ml-2">Cargando consultas...</span>
//         </CardContent>
//       </Card>
//     );
//   }

//   return (
//     <Card>
//       <CardHeader>
//         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
//           <div>
//             <CardTitle className="flex items-center">
//               <Calendar className="h-5 w-5 mr-2" />
//               Consultas Médicas
//             </CardTitle>
//             <CardDescription>
//               Gestiona y revisa todas las consultas realizadas
//             </CardDescription>
//           </div>
//           <Button
//             onClick={() => router.push("/dashboard/consultations/new")}
//             className="w-full sm:w-auto"
//           >
//             <Plus className="h-4 w-4 mr-2" />
//             Nueva Consulta
//           </Button>
//         </div>
//       </CardHeader>
//       <CardContent>
//         {/* Barra de búsqueda */}
//         <div className="flex items-center space-x-2 mb-6">
//           <div className="relative flex-1">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//             <Input
//               placeholder="Buscar por paciente, cédula, motivo o diagnóstico..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="pl-10"
//             />
//           </div>
//         </div>

//         {/* Vista Mobile - Cards */}
//         <div className="block md:hidden space-y-4">
//           {filteredConsultations.length === 0 ? (
//             <div className="text-center py-8 text-gray-500">
//               {searchTerm
//                 ? "No se encontraron consultas que coincidan con la búsqueda"
//                 : "No hay consultas registradas"}
//             </div>
//           ) : (
//             filteredConsultations.map((consultation) => (
//               <Card key={consultation.id} className="p-4">
//                 <div className="flex items-start justify-between">
//                   <div className="flex-1 min-w-0">
//                     <div className="flex items-center justify-between mb-2">
//                       <h3 className="font-medium text-sm truncate">
//                         {consultation.medical_history?.patient?.full_name ||
//                           "Sin nombre"}
//                       </h3>
//                       <Badge
//                         variant={
//                           consultation.diagnosis ? "default" : "secondary"
//                         }
//                         className="ml-2 text-xs"
//                       >
//                         {consultation.diagnosis ? "Completa" : "Pendiente"}
//                       </Badge>
//                     </div>
//                     <p className="text-xs text-gray-500 mb-1">
//                       CI:{" "}
//                       {consultation.medical_history?.patient?.cedula ||
//                         "Sin cédula"}
//                     </p>
//                     <p className="text-xs text-gray-600 mb-2">
//                       {formatDate(consultation.consultation_date)}
//                     </p>
//                     <p className="text-sm text-gray-800 mb-2 line-clamp-2">
//                       <span className="font-medium">Motivo:</span>{" "}
//                       {consultation.reason_for_visit || "Sin especificar"}
//                     </p>
//                     {consultation.diagnosis && (
//                       <p className="text-sm text-gray-600 line-clamp-1">
//                         <span className="font-medium">Diagnóstico:</span>{" "}
//                         {consultation.diagnosis}
//                       </p>
//                     )}
//                   </div>
//                   <div className="ml-4 flex-shrink-0">
//                     <div className="flex flex-col gap-2">
//                       <Button
//                         size="sm"
//                         variant="outline"
//                         onClick={() =>
//                           router.push(
//                             `/dashboard/consultations/${consultation.id}`
//                           )
//                         }
//                         className="w-full"
//                       >
//                         <Eye className="h-3 w-3 mr-1" />
//                         Ver
//                       </Button>
//                       <ConsultationActions
//                         consultationId={consultation.id}
//                         patientName={
//                           consultation.medical_history?.patient?.full_name ||
//                           "Paciente"
//                         }
//                         onDeleted={handleConsultationDeleted}
//                       />
//                     </div>
//                   </div>
//                 </div>
//               </Card>
//             ))
//           )}
//         </div>

//         {/* Vista Desktop - Tabla */}
//         <div className="hidden md:block">
//           <div className="rounded-md border overflow-hidden">
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead className="w-[180px]">Paciente</TableHead>
//                   <TableHead className="w-[100px]">Fecha</TableHead>
//                   <TableHead className="min-w-0 flex-1">
//                     Motivo / Diagnóstico
//                   </TableHead>
//                   <TableHead className="w-[100px]">Estado</TableHead>
//                   <TableHead className="w-[80px] text-right">
//                     Acciones
//                   </TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {filteredConsultations.length === 0 ? (
//                   <TableRow>
//                     <TableCell
//                       colSpan={5}
//                       className="text-center py-8 text-gray-500"
//                     >
//                       {searchTerm
//                         ? "No se encontraron consultas que coincidan con la búsqueda"
//                         : "No hay consultas registradas"}
//                     </TableCell>
//                   </TableRow>
//                 ) : (
//                   filteredConsultations.map((consultation) => (
//                     <TableRow key={consultation.id}>
//                       <TableCell className="w-[180px]">
//                         <div>
//                           <div className="font-medium text-sm line-clamp-1">
//                             {consultation.medical_history?.patient?.full_name ||
//                               "Sin nombre"}
//                           </div>
//                           <div className="text-xs text-gray-500">
//                             CI:{" "}
//                             {consultation.medical_history?.patient?.cedula ||
//                               "Sin cédula"}
//                           </div>
//                         </div>
//                       </TableCell>
//                       <TableCell className="w-[100px] text-sm">
//                         {formatDate(consultation.consultation_date)}
//                       </TableCell>
//                       <TableCell className="min-w-0">
//                         <div className="space-y-1">
//                           <div
//                             className="text-sm font-medium line-clamp-1"
//                             title={consultation.reason_for_visit}
//                           >
//                             {consultation.reason_for_visit || "Sin especificar"}
//                           </div>
//                           {consultation.diagnosis && (
//                             <div
//                               className="text-xs text-gray-600 line-clamp-1"
//                               title={consultation.diagnosis}
//                             >
//                               <span className="font-medium">Diagnóstico:</span>{" "}
//                               {consultation.diagnosis}
//                             </div>
//                           )}
//                         </div>
//                       </TableCell>
//                       <TableCell className="w-[100px]">
//                         <Badge
//                           variant={
//                             consultation.diagnosis ? "default" : "secondary"
//                           }
//                           className="text-xs whitespace-nowrap"
//                         >
//                           {consultation.diagnosis ? "Completa" : "Pendiente"}
//                         </Badge>
//                       </TableCell>
//                       <TableCell className="w-[80px] text-right">
//                         <ConsultationActions
//                           consultationId={consultation.id}
//                           patientName={
//                             consultation.medical_history?.patient?.full_name ||
//                             "Paciente"
//                           }
//                           onDeleted={handleConsultationDeleted}
//                         />
//                       </TableCell>
//                     </TableRow>
//                   ))
//                 )}
//               </TableBody>
//             </Table>
//           </div>
//         </div>

//         {/* Información adicional */}
//         {filteredConsultations.length > 0 && (
//           <div className="mt-4 text-sm text-gray-500 text-center md:text-left">
//             Mostrando {filteredConsultations.length} de {consultations.length}{" "}
//             consultas
//           </div>
//         )}
//       </CardContent>
//     </Card>
//   );
// }
