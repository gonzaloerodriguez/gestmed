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
  ArrowLeft,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  FileText,
  Calendar,
  User,
} from "lucide-react";
import { supabase, type Prescription } from "@/lib/supabase";

export default function PrescriptionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [filteredPrescriptions, setFilteredPrescriptions] = useState<
    Prescription[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<
    string | null
  >(null);

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
      console.error("Error:", error.message);
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
      console.error("Error loading prescriptions:", error.message);
    }
  };

  const handleDeletePrescription = async () => {
    if (!prescriptionToDelete) return;

    try {
      const { error } = await supabase
        .from("prescriptions")
        .update({ is_active: false })
        .eq("id", prescriptionToDelete);

      if (error) throw error;

      // Actualizar la lista local
      setPrescriptions((prev) =>
        prev.filter((p) => p.id !== prescriptionToDelete)
      );
      setDeleteDialogOpen(false);
      setPrescriptionToDelete(null);
    } catch (error: any) {
      alert("Error al eliminar receta: " + error.message);
    }
  };

  const openDeleteDialog = (prescriptionId: string) => {
    setPrescriptionToDelete(prescriptionId);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando recetas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Buscar Recetas</CardTitle>
            <CardDescription>
              Busca por nombre del paciente, cédula, diagnóstico o medicamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar recetas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Recetas</CardTitle>
            <CardDescription>
              {filteredPrescriptions.length} de {prescriptions.length} recetas
            </CardDescription>
          </CardHeader>
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
                                className="text-red-600"
                                onClick={() =>
                                  openDeleteDialog(prescription.id)
                                }
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar receta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La receta será marcada como
              inactiva y no aparecerá en la lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePrescription}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
