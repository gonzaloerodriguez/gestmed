"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
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
  Search,
  Plus,
  Calendar,
  Eye,
  Archive,
  MoreVertical,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import { useConsultationOperations } from "@/hooks/use-consultation-operations";
import { ConsultationActions } from "./consultation-actions";
import type { ConsultationForTable } from "@/lib/supabase/types/consultations";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface RestoreDialog {
  open: boolean;
  id: string;
  name: string;
  patientId?: string;
}

export function ConsultationsTable() {
  const router = useRouter();
  const pathname = usePathname();
  const [consultations, setConsultations] = useState<ConsultationForTable[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [restoreDialog, setRestoreDialog] = useState<RestoreDialog>({
    open: false,
    id: "",
    name: "",
  });
  const { showError } = useToastEnhanced();

  // Determinar si estamos en la vista de archivados
  const isArchivedView = pathname.includes("/archived");

  // Hooks de operaciones
  const {
    handleRestore,
    restoreWithPatient,
    restoreConsultation,
    loading: operationLoading,
  } = useConsultationOperations();

  // Configuración dinámica según la vista
  const viewConfig = {
    title: isArchivedView ? "Consultas Archivadas" : "Consultas Médicas",
    description: isArchivedView
      ? "Revisa las consultas que han sido archivadas"
      : "Gestiona y revisa todas las consultas realizadas",
    emptyMessage: isArchivedView
      ? "No hay consultas archivadas"
      : "No hay consultas registradas",
    searchEmptyMessage: isArchivedView
      ? "No se encontraron consultas archivadas que coincidan con la búsqueda"
      : "No se encontraron consultas que coincidan con la búsqueda",
  };

  useEffect(() => {
    loadConsultations();
  }, [isArchivedView]); // Recargar cuando cambie la vista

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
        .eq("is_active", !isArchivedView) // true para activas, false para archivadas
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
          is_active: item.is_active,
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

  const handleConsultationUpdated = () => {
    // Recargar la lista después de cualquier operación
    loadConsultations();
  };

  // Nueva función para manejar restauración inteligente
  const handleRestoreAction = async (
    consultationId: string,
    patientName: string
  ) => {
    const result = await handleRestore(consultationId);

    if (result.needsConfirmation && result.patientData) {
      setRestoreDialog({
        open: true,
        id: consultationId,
        name: result.patientData.full_name,
        patientId: result.patientData.id,
      });
    } else {
      // Si no necesita confirmación, la consulta ya fue restaurada
      await loadConsultations();
    }
  };

  const confirmRestore = async () => {
    if (restoreDialog.patientId) {
      const success = await restoreWithPatient(
        restoreDialog.id,
        restoreDialog.patientId,
        restoreDialog.name
      );
      if (success) {
        await loadConsultations();
      }
    } else {
      // Fallback para consultas sin paciente asociado
      const consultationToRestore = consultations.find(
        (c) => c.id === restoreDialog.id
      );
      if (consultationToRestore) {
        const success = await restoreConsultation(
          restoreDialog.id,
          consultationToRestore.patient_name
        );
        if (success) {
          await loadConsultations();
        }
      }
    }

    setRestoreDialog({ open: false, id: "", name: "" });
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
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center">
                {isArchivedView ? (
                  <Archive className="h-5 w-5 mr-2" />
                ) : (
                  <Calendar className="h-5 w-5 mr-2" />
                )}
                {viewConfig.title}
              </CardTitle>
              <CardDescription>{viewConfig.description}</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {isArchivedView ? (
                <Link href="/dashboard/consultations">
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Ver Activas
                  </Button>
                </Link>
              ) : (
                <>
                  <Button
                    onClick={() => router.push("/dashboard/consultations/new")}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Consulta
                  </Button>
                </>
              )}
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
                  ? viewConfig.searchEmptyMessage
                  : viewConfig.emptyMessage}
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
                        <div className="flex items-center gap-2">
                          {isArchivedView && (
                            <Badge variant="outline" className="text-xs">
                              Archivada
                            </Badge>
                          )}
                          <Badge
                            variant={
                              consultation.status === "completed"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {consultation.status === "completed"
                              ? "Completa"
                              : "Pendiente"}
                          </Badge>
                        </div>
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
                              isArchivedView
                                ? `/dashboard/archived/consultations/${consultation.id}`
                                : `/dashboard/consultations/${consultation.id}`
                            )
                          }
                          className="w-full"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                        {isArchivedView ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleRestoreAction(
                                consultation.id,
                                consultation.patient_name
                              )
                            }
                            className="w-full text-green-600"
                            disabled={operationLoading}
                          >
                            {operationLoading ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3 mr-1" />
                            )}
                            Restaurar
                          </Button>
                        ) : (
                          <ConsultationActions
                            consultationId={consultation.id}
                            patientName={consultation.patient_name}
                            onArchived={handleConsultationUpdated}
                            onRestored={handleConsultationUpdated}
                            isArchived={isArchivedView}
                          />
                        )}
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
                          ? viewConfig.searchEmptyMessage
                          : viewConfig.emptyMessage}
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
                              {consultation.reason_for_visit ||
                                "Sin especificar"}
                            </div>
                            {consultation.diagnosis && (
                              <div
                                className="text-xs text-gray-600 line-clamp-1"
                                title={consultation.diagnosis}
                              >
                                <span className="font-medium">
                                  Diagnóstico:
                                </span>{" "}
                                {consultation.diagnosis}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-[100px]">
                          <div className="flex flex-col gap-1">
                            {isArchivedView && (
                              <Badge variant="outline" className="text-xs">
                                Archivada
                              </Badge>
                            )}
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
                          </div>
                        </TableCell>
                        <TableCell className="w-[80px] text-right">
                          {isArchivedView ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/dashboard/archived/consultations/${consultation.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Detalle
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleRestoreAction(
                                      consultation.id,
                                      consultation.patient_name
                                    )
                                  }
                                  className="text-green-600"
                                  disabled={operationLoading}
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Restaurar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <ConsultationActions
                              consultationId={consultation.id}
                              patientName={consultation.patient_name}
                              onArchived={handleConsultationUpdated}
                              onRestored={handleConsultationUpdated}
                              isArchived={isArchivedView}
                            />
                          )}
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
              consultas {isArchivedView ? "archivadas" : "activas"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmación para restaurar con paciente */}
      <AlertDialog
        open={restoreDialog.open}
        onOpenChange={(open) => setRestoreDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restaurar paciente completo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta consulta está asociada al paciente{" "}
              <strong>{restoreDialog.name}</strong> que también está archivado.
              <br />
              <br />
              Al restaurar esta consulta se restaurará automáticamente:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>El paciente {restoreDialog.name}</li>
                <li>Su historia clínica completa</li>
                <li>Todas sus consultas</li>
                <li>Todas sus prescripciones</li>
                <li>Sus representantes (si los tiene)</li>
              </ul>
              <br />
              ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRestore}
              disabled={operationLoading}
            >
              {operationLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restaurando...
                </>
              ) : (
                "Sí, restaurar todo"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
