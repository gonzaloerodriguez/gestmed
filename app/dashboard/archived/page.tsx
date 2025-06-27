"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/supabase";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import { usePatientOperations } from "@/hooks/use-patient-operations";
import { usePrescriptionOperations } from "@/hooks/use-prescription-operations";
import { useConsultationOperations } from "@/hooks/use-consultation-operations";
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
import { Badge } from "@/components/ui/badge";
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

interface ArchivedPatient extends Patient {
  medical_histories_count: number;
  consultations_count: number;
  prescriptions_count: number;
}

interface ArchivedConsultation {
  id: string;
  consultation_date: string;
  reason_for_visit: string;
  diagnosis: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  patient_name: string;
  patient_cedula: string;
}

interface RestoreDialog {
  open: boolean;
  type: "patient" | "prescription" | "consultation";
  id: string;
  name: string;
}

export default function ArchivedPage() {
  const [patients, setPatients] = useState<ArchivedPatient[]>([]);
  const [consultations, setConsultations] = useState<ArchivedConsultation[]>(
    []
  );
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
  const { restorePrescription, loading: prescriptionLoading } =
    usePrescriptionOperations();
  const { restoreConsultation, loading: consultationLoading } =
    useConsultationOperations();

  const operationLoading =
    patientLoading || prescriptionLoading || consultationLoading;

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
        loadArchivedConsultations(user.id),
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
      const { data, error } = await supabase
        .from("patients")
        .select(
          `
          *,
          medical_histories (
            id,
            consultations (id),
            prescriptions (id)
          )
        `
        )
        .eq("doctor_id", doctorId)
        .eq("is_active", false)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const transformedData: ArchivedPatient[] = data.map((patient: any) => ({
        ...patient,
        medical_histories_count: patient.medical_histories?.length || 0,
        consultations_count:
          patient.medical_histories?.[0]?.consultations?.length || 0,
        prescriptions_count:
          patient.medical_histories?.[0]?.prescriptions?.length || 0,
      }));

      setPatients(transformedData);
    } catch (error: any) {
      console.error("Error loading archived patients:", error);
    }
  };

  const loadArchivedConsultations = async (doctorId: string) => {
    try {
      const { data, error } = await supabase
        .from("consultations")
        .select(
          `
          id,
          consultation_date,
          reason_for_visit,
          diagnosis,
          is_active,
          created_at,
          updated_at,
          medical_histories!inner (
            patients!inner (
              full_name,
              cedula
            )
          )
        `
        )
        .eq("doctor_id", doctorId)
        .eq("is_active", false)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const transformedData: ArchivedConsultation[] = (data || []).map(
        (item: any) => ({
          id: item.id,
          consultation_date: item.consultation_date,
          reason_for_visit: item.reason_for_visit,
          diagnosis: item.diagnosis,
          is_active: item.status,
          created_at: item.created_at,
          updated_at: item.updated_at,
          patient_name: item.medical_histories.patients.full_name,
          patient_cedula:
            item.medical_histories.patients.cedula || "Sin cédula",
        })
      );

      setConsultations(transformedData);
    } catch (error: any) {
      console.error("Error loading archived consultations:", error);
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

  const filteredConsultations = consultations.filter(
    (consultation) =>
      consultation.patient_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      consultation.patient_cedula
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      consultation.reason_for_visit
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (consultation.diagnosis &&
        consultation.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
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

  const handleRestore = (
    type: "patient" | "prescription" | "consultation",
    id: string,
    name: string
  ) => {
    setRestoreDialog({
      open: true,
      type,
      id,
      name,
    });
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
              setPatients((prev) =>
                prev.filter((p) => p.id !== restoreDialog.id)
              );
            }
          }
          break;
        case "prescription":
          success = await restorePrescription(
            restoreDialog.id,
            restoreDialog.name
          );
          if (success) {
            setPrescriptions((prev) =>
              prev.filter((p) => p.id !== restoreDialog.id)
            );
          }
          break;
        case "consultation":
          success = await restoreConsultation(
            restoreDialog.id,
            restoreDialog.name
          );
          if (success) {
            setConsultations((prev) =>
              prev.filter((c) => c.id !== restoreDialog.id)
            );
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Completada
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            En progreso
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
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
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Archive className="h-8 w-8 mr-3 text-orange-600" />
            Elementos Archivados
          </h1>
          <p className="text-muted-foreground mt-2">
            Gestiona pacientes, consultas y prescripciones archivados
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patients" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Pacientes ({filteredPatients.length})
          </TabsTrigger>
          <TabsTrigger value="consultations" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Consultas ({filteredConsultations.length})
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="flex items-center">
            <Pill className="h-4 w-4 mr-2" />
            Prescripciones ({filteredPrescriptions.length})
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
                                    href={`/dashboard/patients/${patient.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Historia Clínica
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleRestore(
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

        {/* Consultas Archivadas */}
        <TabsContent value="consultations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Consultas Archivadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredConsultations.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay consultas archivadas
                  </h3>
                  <p className="text-gray-500">
                    Las consultas archivadas aparecerán aquí
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Fecha Original</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Diagnóstico</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha de Archivo</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredConsultations.map((consultation) => (
                        <TableRow key={consultation.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {consultation.patient_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                CI: {consultation.patient_cedula}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(consultation.consultation_date)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div
                              className="max-w-xs truncate"
                              title={consultation.reason_for_visit}
                            >
                              {consultation.reason_for_visit}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div
                              className="max-w-xs truncate"
                              title={consultation.diagnosis || ""}
                            >
                              {consultation.diagnosis || "Sin diagnóstico"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(
                              consultation.is_active ? "activa" : "archivada"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(consultation.updated_at)}
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
                                    href={`/dashboard/consultations/${consultation.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Detalle
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleRestore(
                                      "consultation",
                                      consultation.id,
                                      consultation.patient_name
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
                                    href={`/dashboard/prescriptions/${prescription.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Detalle
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleRestore(
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
                : restoreDialog.type}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Estás a punto de restaurar{" "}
                {restoreDialog.type === "patient" ? "a" : "la"}{" "}
                <strong>{restoreDialog.name}</strong>
                {restoreDialog.type === "patient" &&
                  " y toda su historia clínica"}
                .
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-green-800 mb-1">
                  ✅ Restauración:
                </p>
                <ul className="text-green-700 space-y-1">
                  {restoreDialog.type === "patient" ? (
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

// "use client";

// import { useState, useEffect } from "react";
// import { supabase } from "@/lib/supabase/supabase";
// import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
// import { usePatientOperations } from "@/hooks/use-patient-operations";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
//   Search,
//   Archive,
//   RotateCcw,
//   User,
//   FileText,
//   Pill,
//   Loader2,
// } from "lucide-react";
// import { ConsultationsTable } from "@/components/consultation/consultations-table";
// import type { Patient } from "@/lib/supabase/types/patient";

// interface ArchivedPatient extends Patient {
//   medical_histories_count: number;
//   consultations_count: number;
//   prescriptions_count: number;
// }

// interface RestoreDialog {
//   open: boolean;
//   type: "patient" | "prescription" | "consultation";
//   id: string;
//   name: string;
// }

// export default function ArchivedPage() {
//   const [patients, setPatients] = useState<ArchivedPatient[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [restoreDialog, setRestoreDialog] = useState<RestoreDialog>({
//     open: false,
//     type: "patient",
//     id: "",
//     name: "",
//   });

//   const { showError } = useToastEnhanced();
//   const { restorePatient, loading: operationLoading } = usePatientOperations();

//   const loadArchivedPatients = async () => {
//     setLoading(true);
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         showError(
//           "Error de autenticación",
//           "No se pudo verificar la sesión del usuario"
//         );
//         return;
//       }

//       const { data, error } = await supabase
//         .from("patients")
//         .select(
//           `
//           *,
//           medical_histories!inner (
//             id,
//             consultations (id),
//             prescriptions (id)
//           )
//         `
//         )
//         .eq("doctor_id", user.id)
//         .eq("is_active", false)
//         .order("updated_at", { ascending: false });

//       if (error) throw error;

//       const transformedData: ArchivedPatient[] = data.map((patient: any) => ({
//         ...patient,
//         medical_histories_count: patient.medical_histories?.length || 0,
//         consultations_count:
//           patient.medical_histories?.[0]?.consultations?.length || 0,
//         prescriptions_count:
//           patient.medical_histories?.[0]?.prescriptions?.length || 0,
//       }));

//       setPatients(transformedData);
//     } catch (error: any) {
//       showError(
//         "Error de carga",
//         "No se pudieron cargar los pacientes archivados"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadArchivedPatients();
//   }, []);

//   const filteredPatients = patients.filter(
//     (patient) =>
//       patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (patient.cedula &&
//         patient.cedula.toLowerCase().includes(searchTerm.toLowerCase())) ||
//       (patient.phone &&
//         patient.phone.toLowerCase().includes(searchTerm.toLowerCase()))
//   );

//   const handleRestorePatient = (patient: ArchivedPatient) => {
//     setRestoreDialog({
//       open: true,
//       type: "patient",
//       id: patient.id,
//       name: patient.full_name,
//     });
//   };

//   const confirmRestore = async () => {
//     if (restoreDialog.type === "patient") {
//       const patientToRestore = patients.find((p) => p.id === restoreDialog.id);
//       if (patientToRestore) {
//         const success = await restorePatient(patientToRestore);
//         if (success) {
//           await loadArchivedPatients();
//         }
//       }
//     }
//     setRestoreDialog({ open: false, type: "patient", id: "", name: "" });
//   };

//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleDateString("es-ES", {
//       year: "numeric",
//       month: "short",
//       day: "numeric",
//     });
//   };

//   if (loading) {
//     return (
//       <div className="container mx-auto py-6">
//         <Card>
//           <CardContent className="flex items-center justify-center py-8">
//             <Loader2 className="h-8 w-8 animate-spin" />
//             <span className="ml-2">Cargando elementos archivados...</span>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto py-6">
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h1 className="text-3xl font-bold tracking-tight flex items-center">
//             <Archive className="h-8 w-8 mr-3 text-orange-600" />
//             Elementos Archivados
//           </h1>
//           <p className="text-muted-foreground mt-2">
//             Gestiona pacientes, consultas y prescripciones archivados
//           </p>
//         </div>
//       </div>

//       <Tabs defaultValue="patients" className="space-y-6">
//         <TabsList className="grid w-full grid-cols-3">
//           <TabsTrigger value="patients" className="flex items-center">
//             <User className="h-4 w-4 mr-2" />
//             Pacientes ({filteredPatients.length})
//           </TabsTrigger>
//           <TabsTrigger value="consultations" className="flex items-center">
//             <FileText className="h-4 w-4 mr-2" />
//             Consultas
//           </TabsTrigger>
//           <TabsTrigger value="prescriptions" className="flex items-center">
//             <Pill className="h-4 w-4 mr-2" />
//             Prescripciones
//           </TabsTrigger>
//         </TabsList>

//         <TabsContent value="patients">
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <User className="h-5 w-5 mr-2" />
//                 Pacientes Archivados
//               </CardTitle>
//               <div className="flex items-center space-x-2">
//                 <Search className="h-4 w-4 text-gray-400" />
//                 <Input
//                   placeholder="Buscar pacientes archivados..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="max-w-sm"
//                 />
//               </div>
//             </CardHeader>
//             <CardContent>
//               {filteredPatients.length === 0 ? (
//                 <div className="text-center py-8">
//                   <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                   <h3 className="text-lg font-medium text-gray-900 mb-2">
//                     No hay pacientes archivados
//                   </h3>
//                   <p className="text-gray-500">
//                     Los pacientes archivados aparecerán aquí
//                   </p>
//                 </div>
//               ) : (
//                 <div className="rounded-md border">
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Paciente</TableHead>
//                         <TableHead>Cédula</TableHead>
//                         <TableHead>Teléfono</TableHead>
//                         <TableHead>Fecha de archivo</TableHead>
//                         <TableHead>Historial</TableHead>
//                         <TableHead className="text-right">Acciones</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {filteredPatients.map((patient) => (
//                         <TableRow key={patient.id}>
//                           <TableCell>
//                             <div>
//                               <div className="font-medium">
//                                 {patient.full_name}
//                               </div>
//                               <div className="text-sm text-gray-500">
//                                 {patient.gender === "male"
//                                   ? "Masculino"
//                                   : "Femenino"}
//                               </div>
//                             </div>
//                           </TableCell>
//                           <TableCell>
//                             {patient.cedula || "Sin cédula"}
//                           </TableCell>
//                           <TableCell>
//                             {patient.phone || "Sin teléfono"}
//                           </TableCell>
//                           <TableCell>
//                             <div className="text-sm">
//                               {formatDate(patient.updated_at)}
//                             </div>
//                           </TableCell>
//                           <TableCell>
//                             <div className="text-sm space-y-1">
//                               <div>{patient.consultations_count} consultas</div>
//                               <div>
//                                 {patient.prescriptions_count} prescripciones
//                               </div>
//                             </div>
//                           </TableCell>
//                           <TableCell className="text-right">
//                             <Button
//                               variant="outline"
//                               size="sm"
//                               onClick={() => handleRestorePatient(patient)}
//                               disabled={operationLoading}
//                               className="text-green-600 hover:text-green-700"
//                             >
//                               <RotateCcw className="h-4 w-4 mr-2" />
//                               Restaurar
//                             </Button>
//                           </TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="consultations">
//           <ConsultationsTable />
//         </TabsContent>

//         <TabsContent value="prescriptions">
//           <Card>
//             <CardContent className="flex items-center justify-center py-8">
//               <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//               <div className="text-center">
//                 <h3 className="text-lg font-medium text-gray-900 mb-2">
//                   Prescripciones Archivadas
//                 </h3>
//                 <p className="text-gray-500">Funcionalidad en desarrollo</p>
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>

//       {/* Dialog de confirmación para restaurar */}
//       <AlertDialog
//         open={restoreDialog.open}
//         onOpenChange={(open) => setRestoreDialog({ ...restoreDialog, open })}
//       >
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle className="flex items-center">
//               <RotateCcw className="h-5 w-5 text-green-500 mr-2" />
//               ¿Restaurar{" "}
//               {restoreDialog.type === "patient"
//                 ? "paciente"
//                 : restoreDialog.type}
//               ?
//             </AlertDialogTitle>
//             <AlertDialogDescription className="space-y-2">
//               <p>
//                 Estás a punto de restaurar a{" "}
//                 <strong>{restoreDialog.name}</strong>
//                 {restoreDialog.type === "patient" &&
//                   " y toda su historia clínica"}
//                 .
//               </p>
//               <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
//                 <p className="font-medium text-green-800 mb-1">
//                   ✅ Restauración:
//                 </p>
//                 <ul className="text-green-700 space-y-1">
//                   {restoreDialog.type === "patient" ? (
//                     <>
//                       <li>• El paciente volverá a estar activo</li>
//                       <li>
//                         • Se restaurarán todas las consultas y prescripciones
//                       </li>
//                       <li>• Los representantes también serán reactivados</li>
//                       <li>• Podrás continuar con la atención médica normal</li>
//                     </>
//                   ) : (
//                     <>
//                       <li>• El elemento volverá a estar activo</li>
//                       <li>• Aparecerá en el listado principal</li>
//                       <li>• Se mantendrá toda la información original</li>
//                     </>
//                   )}
//                 </ul>
//               </div>
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel disabled={operationLoading}>
//               Cancelar
//             </AlertDialogCancel>
//             <AlertDialogAction
//               onClick={confirmRestore}
//               disabled={operationLoading}
//               className="bg-green-600 hover:bg-green-700"
//             >
//               {operationLoading ? "Restaurando..." : "Restaurar"}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   );
// }
