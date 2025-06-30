"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Calendar,
  User,
  Phone,
  MapPin,
  FileText,
  Stethoscope,
  Pill,
  ClipboardList,
  StickyNote,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { formatPhoneForWhatsApp } from "@/lib/pdf-generator";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import { usePrescriptionOperations } from "@/hooks/use-prescription-operations";
import type { Prescription } from "@/lib/supabase/types/prescription";
import type { Doctor } from "@/lib/supabase/types/doctor";

interface PrescriptionDetailPageProps {
  params: Promise<{ id: string }>;
}

interface RestoreDialog {
  open: boolean;
  type: "patient" | "prescription";
  id: string;
  name: string;
  patientId?: string;
}

export default function PrescriptionArchivedDetailPage({
  params,
}: PrescriptionDetailPageProps) {
  const router = useRouter();
  const { showError, showSuccess, showWarning } = useToastEnhanced();
  const {
    loading: operationLoading,
    handleRestore,
    restoreWithPatient,
  } = usePrescriptionOperations();

  const [loading, setLoading] = useState(true);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [restoreDialog, setRestoreDialog] = useState<RestoreDialog>({
    open: false,
    type: "prescription",
    id: "",
    name: "",
  });

  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params;
        setPrescriptionId(resolvedParams.id);
      } catch (error) {
        showError("Error", "No se pudieron cargar los parámetros de la página");
        router.push("/dashboard/prescriptions");
      }
    };

    resolveParams();
  }, [params, router]);

  useEffect(() => {
    if (prescriptionId) {
      loadPrescription();
    }
  }, [prescriptionId]);

  const loadPrescription = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: prescriptionData, error: prescriptionError } =
        await supabase
          .from("prescriptions")
          .select(
            `
            *,
            doctor:doctors(*)
          `
          )
          .eq("is_active", false)
          .eq("id", prescriptionId)
          .eq("doctor_id", user.id)
          .single();

      if (prescriptionError) throw prescriptionError;

      setPrescription(prescriptionData);
      setDoctor(prescriptionData.doctor);
    } catch (error: any) {
      showError("Error de carga", "No se pudo cargar la receta");
      router.push("/dashboard/prescriptions");
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClick = async () => {
    if (!prescriptionId) return;

    const result = await handleRestore(prescriptionId);

    if (result.needsConfirmation && result.patientData) {
      setRestoreDialog({
        open: true,
        type: "patient",
        id: prescriptionId,
        name: result.patientData.full_name,
        patientId: result.patientData.id,
      });
    } else {
      // Si no necesita confirmación, la prescripción ya fue restaurada
      router.push("/dashboard/prescriptions");
    }
  };

  const handleConfirmRestore = async () => {
    if (restoreDialog.type === "patient" && restoreDialog.patientId) {
      const success = await restoreWithPatient(
        restoreDialog.id,
        restoreDialog.patientId,
        restoreDialog.name
      );

      if (success) {
        setRestoreDialog({
          open: false,
          type: "prescription",
          id: "",
          name: "",
        });
        router.push("/dashboard/prescriptions");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Cargando receta...</p>
        </div>
      </div>
    );
  }

  if (!prescription || !doctor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Receta no encontrada</p>
          <Button onClick={() => router.push("/archived")}>
            Volver a Recetas
          </Button>
        </div>
      </div>
    );
  }

  // Verificación segura del teléfono del paciente
  const hasPatientPhone = Boolean(
    prescription.patient_phone && prescription.patient_phone.trim() !== ""
  );
  const formattedPhone = hasPatientPhone
    ? formatPhoneForWhatsApp(prescription.patient_phone!)
    : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Receta de {prescription.patient_name} (Archivada)
              </h1>
              <p className="text-gray-600">
                {new Date(prescription.date_prescribed).toLocaleDateString(
                  "es-ES",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreClick}
                disabled={operationLoading}
              >
                {operationLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Restaurando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restaurar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Stethoscope className="h-5 w-5 mr-2" />
                Información del Médico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Médico</p>
                  <p className="font-medium">
                    {doctor.gender === "female" ? "Dra." : "Dr."}{" "}
                    {doctor.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Matrícula</p>
                  <p className="font-medium">{doctor.license_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Especialidad</p>
                  <p className="font-medium">
                    {doctor.specialty || "Médico General"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Fecha de Prescripción
                  </p>
                  <p className="font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(prescription.date_prescribed).toLocaleDateString(
                      "es-ES",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Información del Paciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Nombre Completo
                  </p>
                  <p className="font-medium">{prescription.patient_name}</p>
                </div>
                {prescription.patient_age && (
                  <div>
                    <p className="text-sm text-muted-foreground">Edad</p>
                    <p className="font-medium">
                      {prescription.patient_age} años
                    </p>
                  </div>
                )}
                {prescription.patient_cedula && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Cédula de Identidad
                    </p>
                    <p className="font-medium">{prescription.patient_cedula}</p>
                  </div>
                )}
                {prescription.patient_phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-medium flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {prescription.patient_phone}
                      {hasPatientPhone && (
                        <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          WhatsApp: +{formattedPhone}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
              {prescription.patient_address && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Dirección</p>
                  <p className="font-medium flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {prescription.patient_address}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {prescription.diagnosis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Diagnóstico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">
                    {prescription.diagnosis}
                  </p>
                </CardContent>
              </Card>
            )}

            {prescription.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <StickyNote className="h-5 w-5 mr-2" />
                    Notas Adicionales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{prescription.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Pill className="h-5 w-5 mr-2" />
                Medicamentos Prescritos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <p className="whitespace-pre-wrap font-mono text-sm">
                  {prescription.medications}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardList className="h-5 w-5 mr-2" />
                Instrucciones para el Paciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="whitespace-pre-wrap">
                  {prescription.instructions}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Información de Creación */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>
                  Creada el{" "}
                  {new Date(prescription.created_at).toLocaleDateString(
                    "es-ES"
                  )}{" "}
                  a las{" "}
                  {new Date(prescription.created_at).toLocaleTimeString(
                    "es-ES",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </span>
                {prescription.updated_at !== prescription.created_at && (
                  <span>
                    Última modificación:{" "}
                    {new Date(prescription.updated_at).toLocaleDateString(
                      "es-ES"
                    )}{" "}
                    a las{" "}
                    {new Date(prescription.updated_at).toLocaleTimeString(
                      "es-ES",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Dialog de confirmación para restaurar con paciente */}
      <AlertDialog
        open={restoreDialog.open}
        onOpenChange={(open) => setRestoreDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restaurar paciente completo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta prescripción está asociada al paciente{" "}
              <strong>{restoreDialog.name}</strong> que también está archivado.
              <br />
              <br />
              Al restaurar esta prescripción se restaurará automáticamente:
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
              onClick={handleConfirmRestore}
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
    </div>
  );
}
