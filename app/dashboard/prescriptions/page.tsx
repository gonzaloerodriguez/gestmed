"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  FileText,
  Calendar,
  User,
  Copy,
  Loader2,
  Archive,
} from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import { usePrescriptionOperations } from "@/hooks/use-prescription-operations";
import type { Prescription } from "@/lib/supabase/types/prescription";

interface ArchiveDialog {
  open: boolean;
  type: "simple" | "withPatient";
  prescriptionId: string;
  patientName: string;
  patientId?: string;
  relatedData?: {
    consultations: number;
    prescriptions: number;
    representatives: number;
  };
}

export default function PrescriptionsPage() {
  const router = useRouter();
  const { showError } = useToastEnhanced();
  const {
    loading: operationLoading,
    handleArchive,
    archiveWithPatient,
    archivePrescription,
    duplicatePrescription,
  } = usePrescriptionOperations();

  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState<
    Prescription[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [archiveDialog, setArchiveDialog] = useState<ArchiveDialog>({
    open: false,
    type: "simple",
    prescriptionId: "",
    patientName: "",
  });

  useEffect(() => {
    checkUserAndLoadPrescriptions();
  }, []);

  useEffect(() => {
    // Filtrar recetas cuando cambie el término de búsqueda
    if (searchTerm.trim() === "") {
      setFilteredPrescriptions(prescriptions);
    } else {
      const filtered = prescriptions.filter(
        (prescription) =>
          prescription.patient_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          prescription.patient_cedula
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          prescription.diagnosis
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          prescription.medications
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
      setFilteredPrescriptions(filtered);
    }
  }, [searchTerm, prescriptions]);

  const checkUserAndLoadPrescriptions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      await loadPrescriptions(user.id);
    } catch (error: any) {
      showError(
        "Error de autenticación",
        "No se pudo verificar la sesión del usuario"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPrescriptions = async (doctorId: string) => {
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("doctor_id", doctorId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPrescriptions(data || []);
      setFilteredPrescriptions(data || []);
    } catch (error: any) {
      showError("Error de carga", "No se pudieron cargar las recetas");
    }
  };

  // Nueva función para manejar archivado inteligente
  const handleArchiveAction = async (
    prescriptionId: string,
    patientName: string
  ) => {
    const result = await handleArchive(prescriptionId);

    if (result.needsConfirmation && result.patientData && result.relatedData) {
      setArchiveDialog({
        open: true,
        type: "withPatient",
        prescriptionId,
        patientName: result.patientData.full_name,
        patientId: result.patientData.id,
        relatedData: result.relatedData,
      });
    } else {
      // Si no necesita confirmación, la prescripción ya fue archivada
      await loadPrescriptions(
        (await supabase.auth.getUser()).data.user?.id || ""
      );
    }
  };

  const confirmArchive = async () => {
    let success = false;

    if (archiveDialog.type === "withPatient" && archiveDialog.patientId) {
      success = await archiveWithPatient(
        archiveDialog.prescriptionId,
        archiveDialog.patientId,
        archiveDialog.patientName
      );
    } else {
      success = await archivePrescription(
        archiveDialog.prescriptionId,
        archiveDialog.patientName
      );
    }

    if (success) {
      // Actualizar la lista local
      setPrescriptions((prev) =>
        prev.filter((p) => p.id !== archiveDialog.prescriptionId)
      );
      setArchiveDialog({
        open: false,
        type: "simple",
        prescriptionId: "",
        patientName: "",
      });
    }
  };

  const handleDuplicatePrescription = async (prescription: Prescription) => {
    await duplicatePrescription(prescription);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Cargando recetas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Recetas
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{prescriptions.length}</div>
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
                  prescriptions.filter((p) => {
                    const prescriptionDate = new Date(p.created_at);
                    const now = new Date();
                    return (
                      prescriptionDate.getMonth() === now.getMonth() &&
                      prescriptionDate.getFullYear() === now.getFullYear()
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
                    prescriptions.map((p) => p.patient_name.toLowerCase())
                  ).size
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Recetas */}
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <div>
                <CardTitle>Lista de Recetas</CardTitle>
                <CardDescription>
                  {filteredPrescriptions.length} de {prescriptions.length}{" "}
                  recetas
                </CardDescription>
              </div>

              <div className="flex items-center space-x-2">
                <Link href="/dashboard/archived">
                  <Button variant="outline">
                    <Archive className="h-4 w-4 mr-2" />
                    Ver Archivados
                  </Button>
                </Link>
                <Link href="/dashboard/patients/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Receta
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>

          <div className="px-5">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar recetas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <CardContent>
            {filteredPrescriptions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {prescriptions.length === 0
                    ? "No hay recetas creadas"
                    : "No se encontraron recetas"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {prescriptions.length === 0
                    ? "Comienza creando tu primera receta médica"
                    : "Intenta con otros términos de búsqueda"}
                </p>
                {prescriptions.length === 0 && (
                  <Link href="/dashboard/prescriptions/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primera Receta
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Diagnóstico</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPrescriptions.map((prescription) => (
                      <TableRow key={prescription.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {prescription.patient_name}
                            </div>
                            {prescription.patient_cedula && (
                              <div className="text-sm text-gray-500">
                                CI: {prescription.patient_cedula}
                              </div>
                            )}
                            {prescription.patient_age && (
                              <div className="text-sm text-gray-500">
                                {prescription.patient_age} años
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {new Date(
                                prescription.date_prescribed
                              ).toLocaleDateString("es-ES")}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(
                                prescription.created_at
                              ).toLocaleTimeString("es-ES", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <div className="truncate">
                              {prescription.diagnosis || "Sin diagnóstico"}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {prescription.medications.substring(0, 50)}
                              {prescription.medications.length > 50 && "..."}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              prescription.is_active ? "default" : "secondary"
                            }
                          >
                            {prescription.is_active ? "Activa" : "Inactiva"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/prescriptions/${prescription.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalle
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/prescriptions/${prescription.id}/edit`}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDuplicatePrescription(prescription)
                                }
                                disabled={operationLoading}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-orange-600"
                                onClick={() =>
                                  handleArchiveAction(
                                    prescription.id,
                                    prescription.patient_name
                                  )
                                }
                                disabled={operationLoading}
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archivar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialog de confirmación para archivar */}
      <AlertDialog
        open={archiveDialog.open}
        onOpenChange={(open) => setArchiveDialog({ ...archiveDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Archive className="h-5 w-5 text-orange-500 mr-2" />
              {archiveDialog.type === "withPatient"
                ? "¿Archivar paciente completo?"
                : "¿Archivar receta?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {archiveDialog.type === "withPatient" ? (
                <>
                  <p>
                    Esta prescripción pertenece al paciente{" "}
                    <strong>{archiveDialog.patientName}</strong> que tiene otros
                    elementos activos en su historia clínica.
                  </p>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                    <p className="font-medium text-orange-800 mb-2">
                      ⚠️ Se archivarán automáticamente:
                    </p>
                    <ul className="text-orange-700 space-y-1">
                      <li>• El paciente {archiveDialog.patientName}</li>
                      <li>• Su historia clínica completa</li>
                      {archiveDialog.relatedData &&
                        archiveDialog.relatedData.consultations > 0 && (
                          <li>
                            • {archiveDialog.relatedData.consultations}{" "}
                            consulta(s) activa(s)
                          </li>
                        )}
                      {archiveDialog.relatedData &&
                        archiveDialog.relatedData.prescriptions > 0 && (
                          <li>
                            • {archiveDialog.relatedData.prescriptions}{" "}
                            prescripción(es) adicional(es)
                          </li>
                        )}
                      {archiveDialog.relatedData &&
                        archiveDialog.relatedData.representatives > 0 && (
                          <li>
                            • {archiveDialog.relatedData.representatives}{" "}
                            representante(s)
                          </li>
                        )}
                    </ul>
                  </div>
                  <p className="text-sm text-gray-600">
                    Todos estos elementos podrán ser restaurados desde la
                    sección de archivados cuando sea necesario.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    La receta de <strong>{archiveDialog.patientName}</strong>{" "}
                    será archivada y no aparecerá en la lista principal.
                  </p>
                  <p className="text-sm text-gray-600">
                    Podrás restaurarla desde la sección de archivados cuando sea
                    necesario.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={operationLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmArchive}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={operationLoading}
            >
              {operationLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Archivando...
                </>
              ) : archiveDialog.type === "withPatient" ? (
                "Sí, archivar todo"
              ) : (
                "Archivar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
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
// import {
//   Plus,
//   Search,
//   MoreVertical,
//   Eye,
//   Edit,
//   FileText,
//   Calendar,
//   User,
//   Copy,
//   Loader2,
//   Archive,
// } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
// import { usePrescriptionOperations } from "@/hooks/use-prescription-operations";
// import type { Prescription } from "@/lib/supabase/types/prescription";

// export default function PrescriptionsPage() {
//   const router = useRouter();
//   const { showError } = useToastEnhanced();
//   const {
//     loading: operationLoading,
//     deletePrescription,
//     duplicatePrescription,
//   } = usePrescriptionOperations();

//   const [loading, setLoading] = useState(true);
//   const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
//   const [filteredPrescriptions, setFilteredPrescriptions] = useState<
//     Prescription[]
//   >([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
//   const [prescriptionToDelete, setPrescriptionToDelete] = useState<{
//     id: string;
//     patientName: string;
//   } | null>(null);

//   useEffect(() => {
//     checkUserAndLoadPrescriptions();
//   }, []);

//   useEffect(() => {
//     // Filtrar recetas cuando cambie el término de búsqueda
//     if (searchTerm.trim() === "") {
//       setFilteredPrescriptions(prescriptions);
//     } else {
//       const filtered = prescriptions.filter(
//         (prescription) =>
//           prescription.patient_name
//             .toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           prescription.patient_cedula
//             ?.toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           prescription.diagnosis
//             ?.toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           prescription.medications
//             .toLowerCase()
//             .includes(searchTerm.toLowerCase())
//       );
//       setFilteredPrescriptions(filtered);
//     }
//   }, [searchTerm, prescriptions]);

//   const checkUserAndLoadPrescriptions = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         router.push("/login");
//         return;
//       }

//       await loadPrescriptions(user.id);
//     } catch (error: any) {
//       showError(
//         "Error de autenticación",
//         "No se pudo verificar la sesión del usuario"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadPrescriptions = async (doctorId: string) => {
//     try {
//       const { data, error } = await supabase
//         .from("prescriptions")
//         .select("*")
//         .eq("doctor_id", doctorId)
//         .eq("is_active", true)
//         .order("created_at", { ascending: false });

//       if (error) throw error;

//       setPrescriptions(data || []);
//       setFilteredPrescriptions(data || []);
//     } catch (error: any) {
//       showError("Error de carga", "No se pudieron cargar las recetas");
//     }
//   };

//   const handleDeletePrescription = async () => {
//     if (!prescriptionToDelete) return;

//     const success = await deletePrescription(
//       prescriptionToDelete.id,
//       prescriptionToDelete.patientName
//     );

//     if (success) {
//       // Actualizar la lista local
//       setPrescriptions((prev) =>
//         prev.filter((p) => p.id !== prescriptionToDelete.id)
//       );
//       setDeleteDialogOpen(false);
//       setPrescriptionToDelete(null);
//     }
//   };

//   const openDeleteDialog = (prescriptionId: string, patientName: string) => {
//     setPrescriptionToDelete({ id: prescriptionId, patientName });
//     setDeleteDialogOpen(true);
//   };

//   const handleDuplicatePrescription = async (prescription: Prescription) => {
//     await duplicatePrescription(prescription);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
//           <p className="text-muted-foreground">Cargando recetas...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Estadísticas */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Total de Recetas
//               </CardTitle>
//               <FileText className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{prescriptions.length}</div>
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
//                   prescriptions.filter((p) => {
//                     const prescriptionDate = new Date(p.created_at);
//                     const now = new Date();
//                     return (
//                       prescriptionDate.getMonth() === now.getMonth() &&
//                       prescriptionDate.getFullYear() === now.getFullYear()
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
//                     prescriptions.map((p) => p.patient_name.toLowerCase())
//                   ).size
//                 }
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Lista de Recetas */}
//         <Card>
//           <CardHeader>
//             <div className="flex justify-between">
//               <div>
//                 <CardTitle>Lista de Recetas</CardTitle>
//                 <CardDescription>
//                   {filteredPrescriptions.length} de {prescriptions.length}{" "}
//                   recetas
//                 </CardDescription>
//               </div>

//               <div className="flex items-center space-x-2">
//                 <Link href="/dashboard/archived">
//                   <Button variant="outline">
//                     <Archive className="h-4 w-4 mr-2" />
//                     Ver Archivados
//                   </Button>
//                 </Link>
//                 <Link href="/dashboard/patients/new">
//                   <Button>
//                     <Plus className="h-4 w-4 mr-2" />
//                     Nueva Receta
//                   </Button>
//                 </Link>
//               </div>
//             </div>{" "}
//           </CardHeader>

//           <div className="px-5">
//             <div className="relative">
//               <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
//               <Input
//                 placeholder="Buscar recetas..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10"
//               />
//             </div>
//           </div>
//           <CardContent>
//             {filteredPrescriptions.length === 0 ? (
//               <div className="text-center py-12">
//                 <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                 <h3 className="text-lg font-medium text-foreground mb-2">
//                   {prescriptions.length === 0
//                     ? "No hay recetas creadas"
//                     : "No se encontraron recetas"}
//                 </h3>
//                 <p className="text-muted-foreground mb-4">
//                   {prescriptions.length === 0
//                     ? "Comienza creando tu primera receta médica"
//                     : "Intenta con otros términos de búsqueda"}
//                 </p>
//                 {prescriptions.length === 0 && (
//                   <Link href="/dashboard/prescriptions/new">
//                     <Button>
//                       <Plus className="h-4 w-4 mr-2" />
//                       Crear Primera Receta
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
//                       <TableHead>Diagnóstico</TableHead>
//                       <TableHead>Estado</TableHead>
//                       <TableHead className="text-right">Acciones</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {filteredPrescriptions.map((prescription) => (
//                       <TableRow key={prescription.id}>
//                         <TableCell>
//                           <div>
//                             <div className="font-medium">
//                               {prescription.patient_name}
//                             </div>
//                             {prescription.patient_cedula && (
//                               <div className="text-sm text-gray-500">
//                                 CI: {prescription.patient_cedula}
//                               </div>
//                             )}
//                             {prescription.patient_age && (
//                               <div className="text-sm text-gray-500">
//                                 {prescription.patient_age} años
//                               </div>
//                             )}
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div>
//                             <div className="font-medium">
//                               {new Date(
//                                 prescription.date_prescribed
//                               ).toLocaleDateString("es-ES")}
//                             </div>
//                             <div className="text-sm text-gray-500">
//                               {new Date(
//                                 prescription.created_at
//                               ).toLocaleTimeString("es-ES", {
//                                 hour: "2-digit",
//                                 minute: "2-digit",
//                               })}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div className="max-w-xs">
//                             <div className="truncate">
//                               {prescription.diagnosis || "Sin diagnóstico"}
//                             </div>
//                             <div className="text-sm text-gray-500 truncate">
//                               {prescription.medications.substring(0, 50)}
//                               {prescription.medications.length > 50 && "..."}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <Badge
//                             variant={
//                               prescription.is_active ? "default" : "secondary"
//                             }
//                           >
//                             {prescription.is_active ? "Activa" : "Inactiva"}
//                           </Badge>
//                         </TableCell>
//                         <TableCell className="text-right">
//                           <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                               <Button variant="ghost" className="h-8 w-8 p-0">
//                                 <MoreVertical className="h-4 w-4" />
//                               </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent align="end">
//                               <DropdownMenuItem asChild>
//                                 <Link
//                                   href={`/dashboard/prescriptions/${prescription.id}`}
//                                 >
//                                   <Eye className="h-4 w-4 mr-2" />
//                                   Ver Detalle
//                                 </Link>
//                               </DropdownMenuItem>
//                               <DropdownMenuItem asChild>
//                                 <Link
//                                   href={`/dashboard/prescriptions/${prescription.id}/edit`}
//                                 >
//                                   <Edit className="h-4 w-4 mr-2" />
//                                   Editar
//                                 </Link>
//                               </DropdownMenuItem>
//                               <DropdownMenuItem
//                                 onClick={() =>
//                                   handleDuplicatePrescription(prescription)
//                                 }
//                                 disabled={operationLoading}
//                               >
//                                 <Copy className="h-4 w-4 mr-2" />
//                                 Duplicar
//                               </DropdownMenuItem>
//                               <DropdownMenuItem
//                                 className="text-orange-600"
//                                 onClick={() =>
//                                   openDeleteDialog(
//                                     prescription.id,
//                                     prescription.patient_name
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
//                     ))}
//                   </TableBody>
//                 </Table>
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </main>

//       {/* Dialog de confirmación para eliminar */}
//       <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>¿Archivar receta?</AlertDialogTitle>
//             <AlertDialogDescription>
//               La receta de <strong>{prescriptionToDelete?.patientName}</strong>{" "}
//               será archivada y no aparecerá en la lista principal. Podrás
//               restaurarla desde la sección de archivados cuando sea necesario.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancelar</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleDeletePrescription}
//               className="bg-orange-600 hover:bg-orange-700"
//               disabled={operationLoading}
//             >
//               {operationLoading ? (
//                 <>
//                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                   Archivando...
//                 </>
//               ) : (
//                 "Archivar"
//               )}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
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
// import { Badge } from "@/components/ui/badge";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
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
// import {
//   Plus,
//   Search,
//   MoreVertical,
//   Eye,
//   Edit,
//   FileText,
//   Calendar,
//   User,
//   Copy,
//   Loader2,
//   Archive,
// } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
// import { usePrescriptionOperations } from "@/hooks/use-prescription-operations";
// import type { Prescription } from "@/lib/supabase/types/prescription";

// export default function PrescriptionsPage() {
//   const router = useRouter();
//   const { showError } = useToastEnhanced();
//   const {
//     loading: operationLoading,
//     deletePrescription,
//     duplicatePrescription,
//   } = usePrescriptionOperations();

//   const [loading, setLoading] = useState(true);
//   const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
//   const [filteredPrescriptions, setFilteredPrescriptions] = useState<
//     Prescription[]
//   >([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
//   const [prescriptionToDelete, setPrescriptionToDelete] = useState<{
//     id: string;
//     patientName: string;
//   } | null>(null);

//   useEffect(() => {
//     checkUserAndLoadPrescriptions();
//   }, []);

//   useEffect(() => {
//     // Filtrar recetas cuando cambie el término de búsqueda
//     if (searchTerm.trim() === "") {
//       setFilteredPrescriptions(prescriptions);
//     } else {
//       const filtered = prescriptions.filter(
//         (prescription) =>
//           prescription.patient_name
//             .toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           prescription.patient_cedula
//             ?.toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           prescription.diagnosis
//             ?.toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           prescription.medications
//             .toLowerCase()
//             .includes(searchTerm.toLowerCase())
//       );
//       setFilteredPrescriptions(filtered);
//     }
//   }, [searchTerm, prescriptions]);

//   const checkUserAndLoadPrescriptions = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         router.push("/login");
//         return;
//       }

//       await loadPrescriptions(user.id);
//     } catch (error: any) {
//       showError(
//         "Error de autenticación",
//         "No se pudo verificar la sesión del usuario"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadPrescriptions = async (doctorId: string) => {
//     try {
//       const { data, error } = await supabase
//         .from("prescriptions")
//         .select("*")
//         .eq("doctor_id", doctorId)
//         .eq("is_active", true)
//         .order("created_at", { ascending: false });

//       if (error) throw error;

//       setPrescriptions(data || []);
//       setFilteredPrescriptions(data || []);
//     } catch (error: any) {
//       showError("Error de carga", "No se pudieron cargar las recetas");
//     }
//   };

//   const handleDeletePrescription = async () => {
//     if (!prescriptionToDelete) return;

//     const success = await deletePrescription(
//       prescriptionToDelete.id,
//       prescriptionToDelete.patientName
//     );

//     if (success) {
//       // Actualizar la lista local
//       setPrescriptions((prev) =>
//         prev.filter((p) => p.id !== prescriptionToDelete.id)
//       );
//       setDeleteDialogOpen(false);
//       setPrescriptionToDelete(null);
//     }
//   };

//   const openDeleteDialog = (prescriptionId: string, patientName: string) => {
//     setPrescriptionToDelete({ id: prescriptionId, patientName });
//     setDeleteDialogOpen(true);
//   };

//   const handleDuplicatePrescription = async (prescription: Prescription) => {
//     await duplicatePrescription(prescription);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
//           <p className="text-muted-foreground">Cargando recetas...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="flex items-center justify-between mb-8">
//           <div>
//             <h1 className="text-3xl font-bold text-gray-900">
//               Recetas Médicas
//             </h1>
//             <p className="text-gray-600">
//               Gestiona todas las recetas de tus pacientes
//             </p>
//           </div>
//           <div className="flex items-center space-x-2">
//             <Link href="/dashboard/archived">
//               <Button variant="outline">
//                 <Archive className="h-4 w-4 mr-2" />
//                 Ver Archivados
//               </Button>
//             </Link>
//             <Link href="/dashboard/prescriptions/new">
//               <Button>
//                 <Plus className="h-4 w-4 mr-2" />
//                 Nueva Receta
//               </Button>
//             </Link>
//           </div>
//         </div>

//         {/* Estadísticas */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Total de Recetas
//               </CardTitle>
//               <FileText className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{prescriptions.length}</div>
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
//                   prescriptions.filter((p) => {
//                     const prescriptionDate = new Date(p.created_at);
//                     const now = new Date();
//                     return (
//                       prescriptionDate.getMonth() === now.getMonth() &&
//                       prescriptionDate.getFullYear() === now.getFullYear()
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
//                     prescriptions.map((p) => p.patient_name.toLowerCase())
//                   ).size
//                 }
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Búsqueda */}
//         <Card className="mb-6">
//           <CardHeader>
//             <CardTitle>Buscar Recetas</CardTitle>
//             <CardDescription>
//               Busca por nombre del paciente, cédula, diagnóstico o medicamentos
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="relative">
//               <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
//               <Input
//                 placeholder="Buscar recetas..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10"
//               />
//             </div>
//           </CardContent>
//         </Card>

//         {/* Lista de Recetas */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Lista de Recetas</CardTitle>
//             <CardDescription>
//               {filteredPrescriptions.length} de {prescriptions.length} recetas
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             {filteredPrescriptions.length === 0 ? (
//               <div className="text-center py-12">
//                 <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                 <h3 className="text-lg font-medium text-foreground mb-2">
//                   {prescriptions.length === 0
//                     ? "No hay recetas creadas"
//                     : "No se encontraron recetas"}
//                 </h3>
//                 <p className="text-muted-foreground mb-4">
//                   {prescriptions.length === 0
//                     ? "Comienza creando tu primera receta médica"
//                     : "Intenta con otros términos de búsqueda"}
//                 </p>
//                 {prescriptions.length === 0 && (
//                   <Link href="/dashboard/prescriptions/new">
//                     <Button>
//                       <Plus className="h-4 w-4 mr-2" />
//                       Crear Primera Receta
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
//                       <TableHead>Diagnóstico</TableHead>
//                       <TableHead>Estado</TableHead>
//                       <TableHead className="text-right">Acciones</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {filteredPrescriptions.map((prescription) => (
//                       <TableRow key={prescription.id}>
//                         <TableCell>
//                           <div>
//                             <div className="font-medium">
//                               {prescription.patient_name}
//                             </div>
//                             {prescription.patient_cedula && (
//                               <div className="text-sm text-gray-500">
//                                 CI: {prescription.patient_cedula}
//                               </div>
//                             )}
//                             {prescription.patient_age && (
//                               <div className="text-sm text-gray-500">
//                                 {prescription.patient_age} años
//                               </div>
//                             )}
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div>
//                             <div className="font-medium">
//                               {new Date(
//                                 prescription.date_prescribed
//                               ).toLocaleDateString("es-ES")}
//                             </div>
//                             <div className="text-sm text-gray-500">
//                               {new Date(
//                                 prescription.created_at
//                               ).toLocaleTimeString("es-ES", {
//                                 hour: "2-digit",
//                                 minute: "2-digit",
//                               })}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div className="max-w-xs">
//                             <div className="truncate">
//                               {prescription.diagnosis || "Sin diagnóstico"}
//                             </div>
//                             <div className="text-sm text-gray-500 truncate">
//                               {prescription.medications.substring(0, 50)}
//                               {prescription.medications.length > 50 && "..."}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <Badge
//                             variant={
//                               prescription.is_active ? "default" : "secondary"
//                             }
//                           >
//                             {prescription.is_active ? "Activa" : "Inactiva"}
//                           </Badge>
//                         </TableCell>
//                         <TableCell className="text-right">
//                           <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                               <Button variant="ghost" className="h-8 w-8 p-0">
//                                 <MoreVertical className="h-4 w-4" />
//                               </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent align="end">
//                               <DropdownMenuItem asChild>
//                                 <Link
//                                   href={`/dashboard/prescriptions/${prescription.id}`}
//                                 >
//                                   <Eye className="h-4 w-4 mr-2" />
//                                   Ver Detalle
//                                 </Link>
//                               </DropdownMenuItem>
//                               <DropdownMenuItem asChild>
//                                 <Link
//                                   href={`/dashboard/prescriptions/${prescription.id}/edit`}
//                                 >
//                                   <Edit className="h-4 w-4 mr-2" />
//                                   Editar
//                                 </Link>
//                               </DropdownMenuItem>
//                               <DropdownMenuItem
//                                 onClick={() =>
//                                   handleDuplicatePrescription(prescription)
//                                 }
//                                 disabled={operationLoading}
//                               >
//                                 <Copy className="h-4 w-4 mr-2" />
//                                 Duplicar
//                               </DropdownMenuItem>
//                               <DropdownMenuItem
//                                 className="text-orange-600"
//                                 onClick={() =>
//                                   openDeleteDialog(
//                                     prescription.id,
//                                     prescription.patient_name
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
//                     ))}
//                   </TableBody>
//                 </Table>
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </main>

//       {/* Dialog de confirmación para eliminar */}
//       <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>¿Archivar receta?</AlertDialogTitle>
//             <AlertDialogDescription>
//               La receta de <strong>{prescriptionToDelete?.patientName}</strong>{" "}
//               será archivada y no aparecerá en la lista principal. Podrás
//               restaurarla desde la sección de archivados cuando sea necesario.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancelar</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleDeletePrescription}
//               className="bg-orange-600 hover:bg-orange-700"
//               disabled={operationLoading}
//             >
//               {operationLoading ? (
//                 <>
//                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                   Archivando...
//                 </>
//               ) : (
//                 "Archivar"
//               )}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
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
// import { Badge } from "@/components/ui/badge";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
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
// import {
//   Plus,
//   Search,
//   MoreVertical,
//   Eye,
//   Edit,
//   Trash2,
//   FileText,
//   Calendar,
//   User,
//   Copy,
//   Loader2,
// } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
// import { usePrescriptionOperations } from "@/hooks/use-prescription-operations";
// import type { Prescription } from "@/lib/supabase/types/prescription";

// export default function PrescriptionsPage() {
//   const router = useRouter();
//   const { showError } = useToastEnhanced();
//   const {
//     loading: operationLoading,
//     deletePrescription,
//     duplicatePrescription,
//   } = usePrescriptionOperations();

//   const [loading, setLoading] = useState(true);
//   const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
//   const [filteredPrescriptions, setFilteredPrescriptions] = useState<
//     Prescription[]
//   >([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
//   const [prescriptionToDelete, setPrescriptionToDelete] = useState<{
//     id: string;
//     patientName: string;
//   } | null>(null);

//   useEffect(() => {
//     checkUserAndLoadPrescriptions();
//   }, []);

//   useEffect(() => {
//     // Filtrar recetas cuando cambie el término de búsqueda
//     if (searchTerm.trim() === "") {
//       setFilteredPrescriptions(prescriptions);
//     } else {
//       const filtered = prescriptions.filter(
//         (prescription) =>
//           prescription.patient_name
//             .toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           prescription.patient_cedula
//             ?.toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           prescription.diagnosis
//             ?.toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           prescription.medications
//             .toLowerCase()
//             .includes(searchTerm.toLowerCase())
//       );
//       setFilteredPrescriptions(filtered);
//     }
//   }, [searchTerm, prescriptions]);

//   const checkUserAndLoadPrescriptions = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         router.push("/login");
//         return;
//       }

//       await loadPrescriptions(user.id);
//     } catch (error: any) {
//       showError(
//         "Error de autenticación",
//         "No se pudo verificar la sesión del usuario"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadPrescriptions = async (doctorId: string) => {
//     try {
//       const { data, error } = await supabase
//         .from("prescriptions")
//         .select("*")
//         .eq("doctor_id", doctorId)
//         .eq("is_active", true)
//         .order("created_at", { ascending: false });

//       if (error) throw error;

//       setPrescriptions(data || []);
//       setFilteredPrescriptions(data || []);
//     } catch (error: any) {
//       showError("Error de carga", "No se pudieron cargar las recetas");
//     }
//   };

//   const handleDeletePrescription = async () => {
//     if (!prescriptionToDelete) return;

//     const success = await deletePrescription(
//       prescriptionToDelete.id,
//       prescriptionToDelete.patientName
//     );

//     if (success) {
//       // Actualizar la lista local
//       setPrescriptions((prev) =>
//         prev.filter((p) => p.id !== prescriptionToDelete.id)
//       );
//       setDeleteDialogOpen(false);
//       setPrescriptionToDelete(null);
//     }
//   };

//   const openDeleteDialog = (prescriptionId: string, patientName: string) => {
//     setPrescriptionToDelete({ id: prescriptionId, patientName });
//     setDeleteDialogOpen(true);
//   };

//   const handleDuplicatePrescription = async (prescription: Prescription) => {
//     await duplicatePrescription(prescription);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
//           <p className="text-muted-foreground">Cargando recetas...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="flex items-center justify-between mb-8">
//           <div>
//             <h1 className="text-3xl font-bold text-gray-900">
//               Recetas Médicas
//             </h1>
//             <p className="text-gray-600">
//               Gestiona todas las recetas de tus pacientes
//             </p>
//           </div>
//           <Link href="/dashboard/prescriptions/new">
//             <Button>
//               <Plus className="h-4 w-4 mr-2" />
//               Nueva Receta
//             </Button>
//           </Link>
//         </div>

//         {/* Estadísticas */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Total de Recetas
//               </CardTitle>
//               <FileText className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{prescriptions.length}</div>
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
//                   prescriptions.filter((p) => {
//                     const prescriptionDate = new Date(p.created_at);
//                     const now = new Date();
//                     return (
//                       prescriptionDate.getMonth() === now.getMonth() &&
//                       prescriptionDate.getFullYear() === now.getFullYear()
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
//                     prescriptions.map((p) => p.patient_name.toLowerCase())
//                   ).size
//                 }
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Búsqueda */}
//         <Card className="mb-6">
//           <CardHeader>
//             <CardTitle>Buscar Recetas</CardTitle>
//             <CardDescription>
//               Busca por nombre del paciente, cédula, diagnóstico o medicamentos
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="relative">
//               <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
//               <Input
//                 placeholder="Buscar recetas..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10"
//               />
//             </div>
//           </CardContent>
//         </Card>

//         {/* Lista de Recetas */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Lista de Recetas</CardTitle>
//             <CardDescription>
//               {filteredPrescriptions.length} de {prescriptions.length} recetas
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             {filteredPrescriptions.length === 0 ? (
//               <div className="text-center py-12">
//                 <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                 <h3 className="text-lg font-medium text-foreground mb-2">
//                   {prescriptions.length === 0
//                     ? "No hay recetas creadas"
//                     : "No se encontraron recetas"}
//                 </h3>
//                 <p className="text-muted-foreground mb-4">
//                   {prescriptions.length === 0
//                     ? "Comienza creando tu primera receta médica"
//                     : "Intenta con otros términos de búsqueda"}
//                 </p>
//                 {prescriptions.length === 0 && (
//                   <Link href="/dashboard/prescriptions/new">
//                     <Button>
//                       <Plus className="h-4 w-4 mr-2" />
//                       Crear Primera Receta
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
//                       <TableHead>Diagnóstico</TableHead>
//                       <TableHead>Estado</TableHead>
//                       <TableHead className="text-right">Acciones</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {filteredPrescriptions.map((prescription) => (
//                       <TableRow key={prescription.id}>
//                         <TableCell>
//                           <div>
//                             <div className="font-medium">
//                               {prescription.patient_name}
//                             </div>
//                             {prescription.patient_cedula && (
//                               <div className="text-sm text-gray-500">
//                                 CI: {prescription.patient_cedula}
//                               </div>
//                             )}
//                             {prescription.patient_age && (
//                               <div className="text-sm text-gray-500">
//                                 {prescription.patient_age} años
//                               </div>
//                             )}
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div>
//                             <div className="font-medium">
//                               {new Date(
//                                 prescription.date_prescribed
//                               ).toLocaleDateString("es-ES")}
//                             </div>
//                             <div className="text-sm text-gray-500">
//                               {new Date(
//                                 prescription.created_at
//                               ).toLocaleTimeString("es-ES", {
//                                 hour: "2-digit",
//                                 minute: "2-digit",
//                               })}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div className="max-w-xs">
//                             <div className="truncate">
//                               {prescription.diagnosis || "Sin diagnóstico"}
//                             </div>
//                             <div className="text-sm text-gray-500 truncate">
//                               {prescription.medications.substring(0, 50)}
//                               {prescription.medications.length > 50 && "..."}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <Badge
//                             variant={
//                               prescription.is_active ? "default" : "secondary"
//                             }
//                           >
//                             {prescription.is_active ? "Activa" : "Inactiva"}
//                           </Badge>
//                         </TableCell>
//                         <TableCell className="text-right">
//                           <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                               <Button variant="ghost" className="h-8 w-8 p-0">
//                                 <MoreVertical className="h-4 w-4" />
//                               </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent align="end">
//                               <DropdownMenuItem asChild>
//                                 <Link
//                                   href={`/dashboard/prescriptions/${prescription.id}`}
//                                 >
//                                   <Eye className="h-4 w-4 mr-2" />
//                                   Ver Detalle
//                                 </Link>
//                               </DropdownMenuItem>
//                               <DropdownMenuItem asChild>
//                                 <Link
//                                   href={`/dashboard/prescriptions/${prescription.id}/edit`}
//                                 >
//                                   <Edit className="h-4 w-4 mr-2" />
//                                   Editar
//                                 </Link>
//                               </DropdownMenuItem>
//                               <DropdownMenuItem
//                                 onClick={() =>
//                                   handleDuplicatePrescription(prescription)
//                                 }
//                                 disabled={operationLoading}
//                               >
//                                 <Copy className="h-4 w-4 mr-2" />
//                                 Duplicar
//                               </DropdownMenuItem>
//                               <DropdownMenuItem
//                                 className="text-red-600"
//                                 onClick={() =>
//                                   openDeleteDialog(
//                                     prescription.id,
//                                     prescription.patient_name
//                                   )
//                                 }
//                               >
//                                 <Trash2 className="h-4 w-4 mr-2" />
//                                 Eliminar
//                               </DropdownMenuItem>
//                             </DropdownMenuContent>
//                           </DropdownMenu>
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

//       {/* Dialog de confirmación para eliminar */}
//       <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>¿Eliminar receta?</AlertDialogTitle>
//             <AlertDialogDescription>
//               Esta acción no se puede deshacer. La receta de{" "}
//               <strong>{prescriptionToDelete?.patientName}</strong> será marcada
//               como inactiva y no aparecerá en la lista.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancelar</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleDeletePrescription}
//               className="bg-red-600 hover:bg-red-700"
//               disabled={operationLoading}
//             >
//               {operationLoading ? (
//                 <>
//                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                   Eliminando...
//                 </>
//               ) : (
//                 "Eliminar"
//               )}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
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
// import { Badge } from "@/components/ui/badge";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
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
// import {
//   Plus,
//   Search,
//   MoreVertical,
//   Eye,
//   Edit,
//   Trash2,
//   FileText,
//   Calendar,
//   User,
//   Copy,
//   Loader2,
// } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
// import { usePrescriptionOperations } from "@/hooks/use-prescription-operations";
// import type { Prescription } from "@/lib/supabase/types/prescription";

// export default function PrescriptionsPage() {
//   const router = useRouter();
//   const { showError } = useToastEnhanced();
//   const {
//     loading: operationLoading,
//     deletePrescription,
//     duplicatePrescription,
//   } = usePrescriptionOperations();

//   const [loading, setLoading] = useState(true);
//   const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
//   const [filteredPrescriptions, setFilteredPrescriptions] = useState<
//     Prescription[]
//   >([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
//   const [prescriptionToDelete, setPrescriptionToDelete] = useState<{
//     id: string;
//     patientName: string;
//   } | null>(null);

//   useEffect(() => {
//     checkUserAndLoadPrescriptions();
//   }, []);

//   useEffect(() => {
//     // Filtrar recetas cuando cambie el término de búsqueda
//     if (searchTerm.trim() === "") {
//       setFilteredPrescriptions(prescriptions);
//     } else {
//       const filtered = prescriptions.filter(
//         (prescription) =>
//           prescription.patient_name
//             .toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           prescription.patient_cedula
//             ?.toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           prescription.diagnosis
//             ?.toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           prescription.medications
//             .toLowerCase()
//             .includes(searchTerm.toLowerCase())
//       );
//       setFilteredPrescriptions(filtered);
//     }
//   }, [searchTerm, prescriptions]);

//   const checkUserAndLoadPrescriptions = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         router.push("/login");
//         return;
//       }

//       await loadPrescriptions(user.id);
//     } catch (error: any) {
//       showError(
//         "Error de autenticación",
//         "No se pudo verificar la sesión del usuario"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadPrescriptions = async (doctorId: string) => {
//     try {
//       const { data, error } = await supabase
//         .from("prescriptions")
//         .select("*")
//         .eq("doctor_id", doctorId)
//         .eq("is_active", true)
//         .order("created_at", { ascending: false });

//       if (error) throw error;

//       setPrescriptions(data || []);
//       setFilteredPrescriptions(data || []);
//     } catch (error: any) {
//       showError("Error de carga", "No se pudieron cargar las recetas");
//     }
//   };

//   const handleDeletePrescription = async () => {
//     if (!prescriptionToDelete) return;

//     const success = await deletePrescription(
//       prescriptionToDelete.id,
//       prescriptionToDelete.patientName
//     );

//     if (success) {
//       // Actualizar la lista local
//       setPrescriptions((prev) =>
//         prev.filter((p) => p.id !== prescriptionToDelete.id)
//       );
//       setDeleteDialogOpen(false);
//       setPrescriptionToDelete(null);
//     }
//   };

//   const openDeleteDialog = (prescriptionId: string, patientName: string) => {
//     setPrescriptionToDelete({ id: prescriptionId, patientName });
//     setDeleteDialogOpen(true);
//   };

//   const handleDuplicatePrescription = async (prescription: Prescription) => {
//     await duplicatePrescription(prescription);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
//           <p className="text-muted-foreground">Cargando recetas...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="flex items-center justify-between mb-8">
//           <div>
//             <h1 className="text-3xl font-bold text-gray-900">
//               Recetas Médicas
//             </h1>
//             <p className="text-gray-600">
//               Gestiona todas las recetas de tus pacientes
//             </p>
//           </div>
//           <Link href="/dashboard/prescriptions/new">
//             <Button>
//               <Plus className="h-4 w-4 mr-2" />
//               Nueva Receta
//             </Button>
//           </Link>
//         </div>

//         {/* Estadísticas */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Total de Recetas
//               </CardTitle>
//               <FileText className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{prescriptions.length}</div>
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
//                   prescriptions.filter((p) => {
//                     const prescriptionDate = new Date(p.created_at);
//                     const now = new Date();
//                     return (
//                       prescriptionDate.getMonth() === now.getMonth() &&
//                       prescriptionDate.getFullYear() === now.getFullYear()
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
//                     prescriptions.map((p) => p.patient_name.toLowerCase())
//                   ).size
//                 }
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Búsqueda */}
//         <Card className="mb-6">
//           <CardHeader>
//             <CardTitle>Buscar Recetas</CardTitle>
//             <CardDescription>
//               Busca por nombre del paciente, cédula, diagnóstico o medicamentos
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="relative">
//               <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
//               <Input
//                 placeholder="Buscar recetas..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10"
//               />
//             </div>
//           </CardContent>
//         </Card>

//         {/* Lista de Recetas */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Lista de Recetas</CardTitle>
//             <CardDescription>
//               {filteredPrescriptions.length} de {prescriptions.length} recetas
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             {filteredPrescriptions.length === 0 ? (
//               <div className="text-center py-12">
//                 <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                 <h3 className="text-lg font-medium text-foreground mb-2">
//                   {prescriptions.length === 0
//                     ? "No hay recetas creadas"
//                     : "No se encontraron recetas"}
//                 </h3>
//                 <p className="text-muted-foreground mb-4">
//                   {prescriptions.length === 0
//                     ? "Comienza creando tu primera receta médica"
//                     : "Intenta con otros términos de búsqueda"}
//                 </p>
//                 {prescriptions.length === 0 && (
//                   <Link href="/dashboard/prescriptions/new">
//                     <Button>
//                       <Plus className="h-4 w-4 mr-2" />
//                       Crear Primera Receta
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
//                       <TableHead>Diagnóstico</TableHead>
//                       <TableHead>Estado</TableHead>
//                       <TableHead className="text-right">Acciones</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {filteredPrescriptions.map((prescription) => (
//                       <TableRow key={prescription.id}>
//                         <TableCell>
//                           <div>
//                             <div className="font-medium">
//                               {prescription.patient_name}
//                             </div>
//                             {prescription.patient_cedula && (
//                               <div className="text-sm text-gray-500">
//                                 CI: {prescription.patient_cedula}
//                               </div>
//                             )}
//                             {prescription.patient_age && (
//                               <div className="text-sm text-gray-500">
//                                 {prescription.patient_age} años
//                               </div>
//                             )}
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div>
//                             <div className="font-medium">
//                               {new Date(
//                                 prescription.date_prescribed
//                               ).toLocaleDateString("es-ES")}
//                             </div>
//                             <div className="text-sm text-gray-500">
//                               {new Date(
//                                 prescription.created_at
//                               ).toLocaleTimeString("es-ES", {
//                                 hour: "2-digit",
//                                 minute: "2-digit",
//                               })}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div className="max-w-xs">
//                             <div className="truncate">
//                               {prescription.diagnosis || "Sin diagnóstico"}
//                             </div>
//                             <div className="text-sm text-gray-500 truncate">
//                               {prescription.medications.substring(0, 50)}
//                               {prescription.medications.length > 50 && "..."}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <Badge
//                             variant={
//                               prescription.is_active ? "default" : "secondary"
//                             }
//                           >
//                             {prescription.is_active ? "Activa" : "Inactiva"}
//                           </Badge>
//                         </TableCell>
//                         <TableCell className="text-right">
//                           <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                               <Button variant="ghost" className="h-8 w-8 p-0">
//                                 <MoreVertical className="h-4 w-4" />
//                               </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent align="end">
//                               <DropdownMenuItem asChild>
//                                 <Link
//                                   href={`/dashboard/prescriptions/${prescription.id}`}
//                                 >
//                                   <Eye className="h-4 w-4 mr-2" />
//                                   Ver Detalle
//                                 </Link>
//                               </DropdownMenuItem>
//                               <DropdownMenuItem asChild>
//                                 <Link
//                                   href={`/dashboard/prescriptions/${prescription.id}/edit`}
//                                 >
//                                   <Edit className="h-4 w-4 mr-2" />
//                                   Editar
//                                 </Link>
//                               </DropdownMenuItem>
//                               <DropdownMenuItem
//                                 onClick={() =>
//                                   handleDuplicatePrescription(prescription)
//                                 }
//                                 disabled={operationLoading}
//                               >
//                                 <Copy className="h-4 w-4 mr-2" />
//                                 Duplicar
//                               </DropdownMenuItem>
//                               <DropdownMenuItem
//                                 className="text-red-600"
//                                 onClick={() =>
//                                   openDeleteDialog(
//                                     prescription.id,
//                                     prescription.patient_name
//                                   )
//                                 }
//                               >
//                                 <Trash2 className="h-4 w-4 mr-2" />
//                                 Eliminar
//                               </DropdownMenuItem>
//                             </DropdownMenuContent>
//                           </DropdownMenu>
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

//       {/* Dialog de confirmación para eliminar */}
//       <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>¿Eliminar receta?</AlertDialogTitle>
//             <AlertDialogDescription>
//               Esta acción no se puede deshacer. La receta de{" "}
//               <strong>{prescriptionToDelete?.patientName}</strong> será marcada
//               como inactiva y no aparecerá en la lista.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel disabled={operationLoading}>
//               Cancelar
//             </AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleDeletePrescription}
//               className="bg-red-600 hover:bg-red-700"
//               disabled={operationLoading}
//             >
//               {operationLoading ? (
//                 <>
//                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                   Eliminando...
//                 </>
//               ) : (
//                 "Eliminar"
//               )}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
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
// import { Badge } from "@/components/ui/badge";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
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
// import {
//   ArrowLeft,
//   Plus,
//   Search,
//   MoreVertical,
//   Eye,
//   Edit,
//   Trash2,
//   FileText,
//   Calendar,
//   User,
// } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import type { Prescription } from "@/lib/supabase/types/prescription";

// export default function PrescriptionsPage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(true);
//   const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
//   const [filteredPrescriptions, setFilteredPrescriptions] = useState<
//     Prescription[]
//   >([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
//   const [prescriptionToDelete, setPrescriptionToDelete] = useState<
//     string | null
//   >(null);

//   useEffect(() => {
//     checkUserAndLoadPrescriptions();
//   }, []);

//   useEffect(() => {
//     // Filtrar recetas cuando cambie el término de búsqueda
//     if (searchTerm.trim() === "") {
//       setFilteredPrescriptions(prescriptions);
//     } else {
//       const filtered = prescriptions.filter(
//         (prescription) =>
//           prescription.patient_name
//             .toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           prescription.patient_cedula
//             ?.toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           prescription.diagnosis
//             ?.toLowerCase()
//             .includes(searchTerm.toLowerCase()) ||
//           prescription.medications
//             .toLowerCase()
//             .includes(searchTerm.toLowerCase())
//       );
//       setFilteredPrescriptions(filtered);
//     }
//   }, [searchTerm, prescriptions]);

//   const checkUserAndLoadPrescriptions = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         router.push("/login");
//         return;
//       }

//       await loadPrescriptions(user.id);
//     } catch (error: any) {
//       console.error("Error:", error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadPrescriptions = async (doctorId: string) => {
//     try {
//       const { data, error } = await supabase
//         .from("prescriptions")
//         .select("*")
//         .eq("doctor_id", doctorId)
//         .eq("is_active", true)
//         .order("created_at", { ascending: false });

//       if (error) throw error;

//       setPrescriptions(data || []);
//       setFilteredPrescriptions(data || []);
//     } catch (error: any) {
//       console.error("Error loading prescriptions:", error.message);
//     }
//   };

//   const handleDeletePrescription = async () => {
//     if (!prescriptionToDelete) return;

//     try {
//       const { error } = await supabase
//         .from("prescriptions")
//         .update({ is_active: false })
//         .eq("id", prescriptionToDelete);

//       if (error) throw error;

//       // Actualizar la lista local
//       setPrescriptions((prev) =>
//         prev.filter((p) => p.id !== prescriptionToDelete)
//       );
//       setDeleteDialogOpen(false);
//       setPrescriptionToDelete(null);
//     } catch (error: any) {
//       alert("Error al eliminar receta: " + error.message);
//     }
//   };

//   const openDeleteDialog = (prescriptionId: string) => {
//     setPrescriptionToDelete(prescriptionId);
//     setDeleteDialogOpen(true);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-muted-foreground">Cargando recetas...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="flex items-center justify-end w-full mb-8">
//           <Link href={"/dashboard/prescriptions/new"}>
//             <Button>
//               <Plus className="h-4 w-4 mr-2" />
//               Nueva Receta
//             </Button>
//           </Link>
//         </div>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Total de Recetas
//               </CardTitle>
//               <FileText className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{prescriptions.length}</div>
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
//                   prescriptions.filter((p) => {
//                     const prescriptionDate = new Date(p.created_at);
//                     const now = new Date();
//                     return (
//                       prescriptionDate.getMonth() === now.getMonth() &&
//                       prescriptionDate.getFullYear() === now.getFullYear()
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
//                     prescriptions.map((p) => p.patient_name.toLowerCase())
//                   ).size
//                 }
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         <Card className="mb-6">
//           <CardHeader>
//             <CardTitle>Buscar Recetas</CardTitle>
//             <CardDescription>
//               Busca por nombre del paciente, cédula, diagnóstico o medicamentos
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="relative">
//               <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
//               <Input
//                 placeholder="Buscar recetas..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10"
//               />
//             </div>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader>
//             <CardTitle>Lista de Recetas</CardTitle>
//             <CardDescription>
//               {filteredPrescriptions.length} de {prescriptions.length} recetas
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             {filteredPrescriptions.length === 0 ? (
//               <div className="text-center py-12">
//                 <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                 <h3 className="text-lg font-medium text-foreground mb-2">
//                   {prescriptions.length === 0
//                     ? "No hay recetas creadas"
//                     : "No se encontraron recetas"}
//                 </h3>
//                 <p className="text-muted-foreground mb-4">
//                   {prescriptions.length === 0
//                     ? "Comienza creando tu primera receta médica"
//                     : "Intenta con otros términos de búsqueda"}
//                 </p>
//                 {prescriptions.length === 0 && (
//                   <Link href="/dashboard/prescriptions/new">
//                     <Button>
//                       <Plus className="h-4 w-4 mr-2" />
//                       Crear Primera Receta
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
//                       <TableHead>Diagnóstico</TableHead>
//                       <TableHead>Estado</TableHead>
//                       <TableHead className="text-right">Acciones</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {filteredPrescriptions.map((prescription) => (
//                       <TableRow key={prescription.id}>
//                         <TableCell>
//                           <div>
//                             <div className="font-medium">
//                               {prescription.patient_name}
//                             </div>
//                             {prescription.patient_cedula && (
//                               <div className="text-sm text-gray-500">
//                                 CI: {prescription.patient_cedula}
//                               </div>
//                             )}
//                             {prescription.patient_age && (
//                               <div className="text-sm text-gray-500">
//                                 {prescription.patient_age} años
//                               </div>
//                             )}
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div>
//                             <div className="font-medium">
//                               {new Date(
//                                 prescription.date_prescribed
//                               ).toLocaleDateString("es-ES")}
//                             </div>
//                             <div className="text-sm text-gray-500">
//                               {new Date(
//                                 prescription.created_at
//                               ).toLocaleTimeString("es-ES", {
//                                 hour: "2-digit",
//                                 minute: "2-digit",
//                               })}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div className="max-w-xs">
//                             <div className="truncate">
//                               {prescription.diagnosis || "Sin diagnóstico"}
//                             </div>
//                             <div className="text-sm text-gray-500 truncate">
//                               {prescription.medications.substring(0, 50)}
//                               {prescription.medications.length > 50 && "..."}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <Badge
//                             variant={
//                               prescription.is_active ? "default" : "secondary"
//                             }
//                           >
//                             {prescription.is_active ? "Activa" : "Inactiva"}
//                           </Badge>
//                         </TableCell>
//                         <TableCell className="text-right">
//                           <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                               <Button variant="ghost" className="h-8 w-8 p-0">
//                                 <MoreVertical className="h-4 w-4" />
//                               </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent align="end">
//                               <DropdownMenuItem asChild>
//                                 <Link
//                                   href={`/dashboard/prescriptions/${prescription.id}`}
//                                 >
//                                   <Eye className="h-4 w-4 mr-2" />
//                                   Ver Detalle
//                                 </Link>
//                               </DropdownMenuItem>
//                               <DropdownMenuItem asChild>
//                                 <Link
//                                   href={`/dashboard/prescriptions/${prescription.id}/edit`}
//                                 >
//                                   <Edit className="h-4 w-4 mr-2" />
//                                   Editar
//                                 </Link>
//                               </DropdownMenuItem>
//                               <DropdownMenuItem
//                                 className="text-red-600"
//                                 onClick={() =>
//                                   openDeleteDialog(prescription.id)
//                                 }
//                               >
//                                 <Trash2 className="h-4 w-4 mr-2" />
//                                 Eliminar
//                               </DropdownMenuItem>
//                             </DropdownMenuContent>
//                           </DropdownMenu>
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

//       <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>¿Eliminar receta?</AlertDialogTitle>
//             <AlertDialogDescription>
//               Esta acción no se puede deshacer. La receta será marcada como
//               inactiva y no aparecerá en la lista.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancelar</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleDeletePrescription}
//               className="bg-red-600 hover:bg-red-700"
//             >
//               Eliminar
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   );
// }
