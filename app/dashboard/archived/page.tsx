"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/supabase";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import { usePatientOperations } from "@/hooks/use-patient-operations";
import { usePrescriptionOperations } from "@/hooks/use-prescription-operations";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Archive,
  RotateCcw,
  User,
  FileText,
  Pill,
  Loader2,
  MoreVertical,
  Eye,
} from "lucide-react";
import Link from "next/link";
import type { Patient } from "@/lib/supabase/types/patient";
import type { Prescription } from "@/lib/supabase/types/prescription";
import { ConsultationsTable } from "@/components/consultation/consultations-table";

interface ArchivedPatient extends Patient {
  medical_histories_count: number;
  consultations_count: number;
  prescriptions_count: number;
}

interface RestoreDialog {
  open: boolean;
  type: "patient" | "prescription";
  id: string;
  name: string;
  patientId?: string;
}

export default function ArchivedPage() {
  const [patients, setPatients] = useState<ArchivedPatient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("patients");
  const [restoreDialog, setRestoreDialog] = useState<RestoreDialog>({
    open: false,
    type: "patient",
    id: "",
    name: "",
  });

  const { showError } = useToastEnhanced();
  const { restorePatient, loading: patientLoading } = usePatientOperations();
  const {
    handleRestore: handlePrescriptionRestore,
    restoreWithPatient,
    restorePrescription,
    loading: prescriptionLoading,
  } = usePrescriptionOperations();

  const operationLoading = patientLoading || prescriptionLoading;

  useEffect(() => {
    loadArchivedData();
  }, []);

  const loadArchivedData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showError(
          "Error de autenticación",
          "No se pudo verificar la sesión del usuario"
        );
        return;
      }

      await Promise.all([
        loadArchivedPatients(user.id),
        loadArchivedPrescriptions(user.id),
      ]);
    } catch (error: any) {
      showError(
        "Error de carga",
        "No se pudieron cargar los elementos archivados"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadArchivedPatients = async (doctorId: string) => {
    try {
      // Primero obtenemos los pacientes archivados
      const { data: patientsData, error: patientsError } = await supabase
        .from("patients")
        .select(
          `
          *,
          medical_histories (
            id
          )
        `
        )
        .eq("doctor_id", doctorId)
        .eq("is_active", false)
        .order("updated_at", { ascending: false });

      if (patientsError) throw patientsError;

      // Para cada paciente, contamos sus consultas y prescripciones archivadas
      const patientsWithCounts = await Promise.all(
        patientsData.map(async (patient: any) => {
          const medicalHistoryId = patient.medical_histories?.id;

          let consultationsCount = 0;
          let prescriptionsCount = 0;

          if (medicalHistoryId) {
            // Contar consultas archivadas
            const { count: consultationsCountResult } = await supabase
              .from("consultations")
              .select("*", { count: "exact", head: true })
              .eq("medical_history_id", medicalHistoryId)
              .eq("is_active", false);

            consultationsCount = consultationsCountResult || 0;

            // Contar prescripciones archivadas
            const { count: prescriptionsCountResult } = await supabase
              .from("prescriptions")
              .select("*", { count: "exact", head: true })
              .eq("medical_history_id", medicalHistoryId)
              .eq("is_active", false);

            prescriptionsCount = prescriptionsCountResult || 0;
          }

          return {
            ...patient,
            medical_histories_count: patient.medical_histories?.length || 0,
            consultations_count: consultationsCount,
            prescriptions_count: prescriptionsCount,
          };
        })
      );

      setPatients(patientsWithCounts);
    } catch (error: any) {
      console.error("Error loading archived patients:", error);
    }
  };

  const loadArchivedPrescriptions = async (doctorId: string) => {
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("doctor_id", doctorId)
        .eq("is_active", false)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error: any) {
      console.error("Error loading archived prescriptions:", error);
    }
  };

  // Filtros por pestaña activa
  const filteredPatients = patients.filter(
    (patient) =>
      patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.cedula &&
        patient.cedula.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (patient.phone &&
        patient.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredPrescriptions = prescriptions.filter(
    (prescription) =>
      prescription.patient_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (prescription.patient_cedula &&
        prescription.patient_cedula
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      (prescription.diagnosis &&
        prescription.diagnosis
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) ||
      prescription.medications.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRestoreAction = async (
    type: "patient" | "prescription",
    id: string,
    name: string
  ) => {
    if (type === "prescription") {
      // Usar la nueva lógica inteligente para prescripciones
      const result = await handlePrescriptionRestore(id);

      if (result.needsConfirmation && result.patientData) {
        setRestoreDialog({
          open: true,
          type: "prescription",
          id,
          name: result.patientData.full_name,
          patientId: result.patientData.id,
        });
      } else {
        // Si no necesita confirmación, la prescripción ya fue restaurada
        await loadArchivedData();
      }
    } else {
      // Para pacientes, usar el comportamiento original
      setRestoreDialog({
        open: true,
        type,
        id,
        name,
      });
    }
  };

  const confirmRestore = async () => {
    let success = false;

    try {
      switch (restoreDialog.type) {
        case "patient":
          const patientToRestore = patients.find(
            (p) => p.id === restoreDialog.id
          );
          if (patientToRestore) {
            success = await restorePatient(patientToRestore);
            if (success) {
              // Recargar todos los datos después de restaurar
              await loadArchivedData();
            }
          }
          break;
        case "prescription":
          // Usar la nueva lógica para prescripciones con paciente asociado
          if (restoreDialog.patientId) {
            success = await restoreWithPatient(
              restoreDialog.id,
              restoreDialog.patientId,
              restoreDialog.name
            );
            if (success) {
              await loadArchivedData();
            }
          } else {
            // Fallback para prescripciones sin paciente asociado
            const prescriptionToRestore = prescriptions.find(
              (p) => p.id === restoreDialog.id
            );
            if (prescriptionToRestore) {
              success = await restorePrescription(
                prescriptionToRestore.id,
                prescriptionToRestore.patient_name
              );
              if (success) {
                await loadArchivedData();
              }
            }
          }
          break;
      }
    } catch (error) {
      // Los errores se manejan en los hooks
    }

    setRestoreDialog({ open: false, type: "patient", id: "", name: "" });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Cargando elementos archivados...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patients" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Pacientes
          </TabsTrigger>
          <TabsTrigger value="consultations" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Consultas
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="flex items-center">
            <Pill className="h-4 w-4 mr-2" />
            Prescripciones
          </TabsTrigger>
        </TabsList>

        {/* Barra de búsqueda */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar en Archivados</CardTitle>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar elementos archivados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
        </Card>

        {/* Pacientes Archivados */}
        <TabsContent value="patients">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Pacientes Archivados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPatients.length === 0 ? (
                <div className="text-center py-8">
                  <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay pacientes archivados
                  </h3>
                  <p className="text-gray-500">
                    Los pacientes archivados aparecerán aquí
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Cédula</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Fecha de archivo</TableHead>
                        <TableHead>Historial</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPatients.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {patient.full_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {patient.gender === "male"
                                  ? "Masculino"
                                  : "Femenino"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {patient.cedula || "Sin cédula"}
                          </TableCell>
                          <TableCell>
                            {patient.phone || "Sin teléfono"}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(patient.updated_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm space-y-1">
                              <div>{patient.consultations_count} consultas</div>
                              <div>
                                {patient.prescriptions_count} prescripciones
                              </div>
                            </div>
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
                                    href={`/dashboard/archived/patients/${patient.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Historia Clínica
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleRestoreAction(
                                      "patient",
                                      patient.id,
                                      patient.full_name
                                    )
                                  }
                                  className="text-green-600"
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Restaurar
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
        </TabsContent>

        {/* Consultas Archivadas - Ahora usa el componente actualizado */}
        <TabsContent value="consultations">
          <ConsultationsTable />
        </TabsContent>

        {/* Prescripciones Archivadas */}
        <TabsContent value="prescriptions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Pill className="h-5 w-5 mr-2" />
                Prescripciones Archivadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPrescriptions.length === 0 ? (
                <div className="text-center py-8">
                  <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay prescripciones archivadas
                  </h3>
                  <p className="text-gray-500">
                    Las prescripciones archivadas aparecerán aquí
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Fecha Original</TableHead>
                        <TableHead>Diagnóstico</TableHead>
                        <TableHead>Medicamentos</TableHead>
                        <TableHead>Fecha de Archivo</TableHead>
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
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(prescription.date_prescribed)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div
                              className="max-w-xs truncate"
                              title={prescription.diagnosis || ""}
                            >
                              {prescription.diagnosis || "Sin diagnóstico"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div
                              className="max-w-xs truncate"
                              title={prescription.medications}
                            >
                              {prescription.medications}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(prescription.updated_at)}
                            </div>
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
                                    href={`/dashboard/archived/prescriptions/${prescription.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Detalle
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleRestoreAction(
                                      "prescription",
                                      prescription.id,
                                      prescription.patient_name
                                    )
                                  }
                                  className="text-green-600"
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Restaurar
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
        </TabsContent>
      </Tabs>

      {/* Dialog de confirmación para restaurar */}
      <AlertDialog
        open={restoreDialog.open}
        onOpenChange={(open) => setRestoreDialog({ ...restoreDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <RotateCcw className="h-5 w-5 text-green-500 mr-2" />
              ¿Restaurar{" "}
              {restoreDialog.type === "patient"
                ? "paciente"
                : restoreDialog.type === "prescription" &&
                    restoreDialog.patientId
                  ? "paciente completo"
                  : restoreDialog.type}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {restoreDialog.type === "prescription" &&
                restoreDialog.patientId ? (
                  <>
                    Esta prescripción está asociada al paciente{" "}
                    <strong>{restoreDialog.name}</strong> que también está
                    archivado.
                    <br />
                    <br />
                    Al restaurar esta prescripción se restaurará
                    automáticamente:
                  </>
                ) : (
                  <>
                    Estás a punto de restaurar{" "}
                    {restoreDialog.type === "patient" ? "a" : "la"}{" "}
                    <strong>{restoreDialog.name}</strong>
                    {restoreDialog.type === "patient" &&
                      " y toda su historia clínica"}
                    .
                  </>
                )}
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-green-800 mb-1">
                  ✅ Restauración:
                </p>
                <ul className="text-green-700 space-y-1">
                  {restoreDialog.type === "prescription" &&
                  restoreDialog.patientId ? (
                    <>
                      <li>• El paciente {restoreDialog.name}</li>
                      <li>• Su historia clínica completa</li>
                      <li>• Todas sus consultas</li>
                      <li>• Todas sus prescripciones</li>
                      <li>• Sus representantes (si los tiene)</li>
                    </>
                  ) : restoreDialog.type === "patient" ? (
                    <>
                      <li>• El paciente volverá a estar activo</li>
                      <li>
                        • Se restaurarán todas las consultas y prescripciones
                      </li>
                      <li>• Los representantes también serán reactivados</li>
                      <li>• Podrás continuar con la atención médica normal</li>
                    </>
                  ) : (
                    <>
                      <li>• El elemento volverá a estar activo</li>
                      <li>• Aparecerá en el listado principal</li>
                      <li>• Se mantendrá toda la información original</li>
                    </>
                  )}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={operationLoading}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRestore}
              disabled={operationLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {operationLoading ? "Restaurando..." : "Restaurar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
