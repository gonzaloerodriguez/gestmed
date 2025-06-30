"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Stethoscope,
  FileText,
  Activity,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import { useConsultationOperations } from "@/hooks/use-consultation-operations";
import type {
  ConsultationWithPatient,
  VitalSigns,
} from "@/lib/supabase/types/consultations";
import type { Doctor } from "@/lib/supabase/types/doctor";
import type { Patient } from "@/lib/supabase/types/patient";

interface RestoreDialog {
  open: boolean;
  type: "consultation";
  id: string;
  name: string;
  patientId?: string;
}

export default function ConsultationArchivedDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showError, showSuccess } = useToastEnhanced();

  const [consultation, setConsultation] =
    useState<ConsultationWithPatient | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalHistoryId, setMedicalHistoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoreDialog, setRestoreDialog] = useState<RestoreDialog>({
    open: false,
    type: "consultation",
    id: "",
    name: "",
  });

  const {
    handleRestore,
    restoreWithPatient,
    restoreConsultation,
    //deleteConsultationPermanently,
    loading: operationLoading,
  } = useConsultationOperations();

  useEffect(() => {
    if (typeof id !== "string") return;

    const fetchData = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!user || userError) {
        router.push("/login");
        return;
      }

      try {
        // Cargar consulta con datos del paciente
        const { data: consultationData, error: consultationError } =
          await supabase
            .from("consultations")
            .select(
              `
            *,
            medical_histories!inner(
              id,
              patients (*)
            )
          `
            )
            .eq("id", id)
            .eq("is_active", false)
            .eq("doctor_id", user.id)
            .single();

        if (consultationError) throw consultationError;

        // Cargar datos del doctor
        const { data: doctorData, error: doctorError } = await supabase
          .from("doctors")
          .select("*")
          .eq("id", user.id)
          .single();

        if (doctorError) throw doctorError;

        const vitalSignsParsed: VitalSigns =
          typeof consultationData.vital_signs === "string"
            ? JSON.parse(consultationData.vital_signs.replace(/""/g, '"'))
            : consultationData.vital_signs;

        const patientData = consultationData.medical_histories.patients;

        setConsultation({
          ...consultationData,
          vital_signs: vitalSignsParsed,
          patient: patientData
            ? {
                full_name: patientData.full_name,
                cedula: patientData.cedula,
              }
            : undefined,
        });

        setDoctor(doctorData);
        setPatient(patientData);
        setMedicalHistoryId(consultationData.medical_history_id);
      } catch (error: any) {
        console.error("Error:", error?.message);
        showError("Error de carga", "No se pudo cargar la consulta");
        router.push("/archived/consultations");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const handleRestoreClick = async () => {
    if (!id || typeof id !== "string") return;

    const result = await handleRestore(id);

    if (result.needsConfirmation && result.patientData) {
      setRestoreDialog({
        open: true,
        type: "consultation",
        id: id,
        name: result.patientData.full_name,
        patientId: result.patientData.id,
      });
    } else {
      // Si no necesita confirmación, la consulta ya fue restaurada
      router.push("/dashboard/consultations");
    }
  };

  const handleConfirmRestore = async () => {
    if (restoreDialog.patientId) {
      const success = await restoreWithPatient(
        restoreDialog.id,
        restoreDialog.patientId,
        restoreDialog.name
      );

      if (success) {
        setRestoreDialog({
          open: false,
          type: "consultation",
          id: "",
          name: "",
        });
        router.push("/dashboard/consultations");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando consulta médica...</p>
        </div>
      </div>
    );
  }

  if (!consultation || !doctor || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">No se pudo cargar la consulta</p>
          <Button onClick={() => router.push("/archived/consultations")}>
            Volver a Consultas Archivadas
          </Button>
        </div>
      </div>
    );
  }

  const { vital_signs } = consultation;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold">
                Consulta Médica (Archivada)
              </h1>
              <p className="text-muted-foreground">
                {new Date(consultation.consultation_date).toLocaleDateString(
                  "es-ES",
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información del Paciente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Información del Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-medium">{consultation.patient?.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cédula</p>
                <p className="font-medium">
                  {consultation.patient?.cedula || "No registrada"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Fecha de consulta
                </p>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <p className="font-medium">
                    {new Date(consultation.consultation_date).toLocaleString(
                      "es-ES"
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signos Vitales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Signos Vitales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Presión</p>
                  <p className="font-medium">{vital_signs?.bp || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Temperatura</p>
                  <p className="font-medium">
                    {vital_signs?.temp ? `${vital_signs.temp}°C` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Peso</p>
                  <p className="font-medium">
                    {vital_signs?.weight ? `${vital_signs.weight} kg` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Altura</p>
                  <p className="font-medium">
                    {vital_signs?.height ? `${vital_signs.height} cm` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">FC</p>
                  <p className="font-medium">
                    {vital_signs?.heart_rate
                      ? `${vital_signs.heart_rate} bpm`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">FR</p>
                  <p className="font-medium">
                    {vital_signs?.respiratory_rate
                      ? `${vital_signs.respiratory_rate} rpm`
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estado de la Consulta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Stethoscope className="h-5 w-5 mr-2" />
                Estado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Estado actual
                  </p>
                  <Badge
                    variant="secondary"
                    className="bg-orange-100 text-orange-800"
                  >
                    Archivada
                  </Badge>
                </div>
                {consultation.follow_up_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Próxima cita
                    </p>
                    <p className="font-medium">
                      {new Date(consultation.follow_up_date).toLocaleDateString(
                        "es-ES"
                      )}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detalles de la Consulta */}
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Detalles de la Consulta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-2">
                  Motivo de la Consulta
                </h3>
                <p className="text-sm leading-relaxed">
                  {consultation.reason_for_visit}
                </p>
              </div>

              {consultation.symptoms && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">
                      Síntomas
                    </h3>
                    <p className="text-sm leading-relaxed">
                      {consultation.symptoms}
                    </p>
                  </div>
                </>
              )}

              {consultation.physical_examination && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">
                      Examen Físico
                    </h3>
                    <p className="text-sm leading-relaxed">
                      {consultation.physical_examination}
                    </p>
                  </div>
                </>
              )}

              {consultation.diagnosis && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">
                      Diagnóstico
                    </h3>
                    <p className="text-sm leading-relaxed">
                      {consultation.diagnosis}
                    </p>
                  </div>
                </>
              )}

              {consultation.treatment_plan && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">
                      Plan de Tratamiento
                    </h3>
                    <p className="text-sm leading-relaxed">
                      {consultation.treatment_plan}
                    </p>
                  </div>
                </>
              )}

              {consultation.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-2">
                      Notas Adicionales
                    </h3>
                    <p className="text-sm leading-relaxed">
                      {consultation.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dialog de confirmación para restaurar con paciente */}
        <AlertDialog
          open={restoreDialog.open}
          onOpenChange={(open) =>
            setRestoreDialog((prev) => ({ ...prev, open }))
          }
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Restaurar paciente completo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta consulta está asociada al paciente{" "}
                <strong>{restoreDialog.name}</strong> que también está
                archivado.
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
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabase/supabase";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
// import {
//   ArrowLeft,
//   Calendar,
//   User,
//   Stethoscope,
//   FileText,
//   Activity,
//   Pill,
//   Edit,
//   Loader2,
// } from "lucide-react";
// import { PrescriptionFromConsultationDialog } from "@/components/prescription/prescription-from-consultation-dialog";
// import type {
//   ConsultationWithPatient,
//   VitalSigns,
// } from "@/lib/supabase/types/consultations";
// import type { Doctor } from "@/lib/supabase/types/doctor";
// import type { Patient } from "@/lib/supabase/types/patient";

// export default function ConsultationArchivedDetailPage() {
//   const { id } = useParams();
//   const router = useRouter();

//   const [consultation, setConsultation] =
//     useState<ConsultationWithPatient | null>(null);
//   const [doctor, setDoctor] = useState<Doctor | null>(null);
//   const [patient, setPatient] = useState<Patient | null>(null);
//   const [medicalHistoryId, setMedicalHistoryId] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);

//   useEffect(() => {
//     if (typeof id !== "string") return;

//     const fetchData = async () => {
//       const {
//         data: { user },
//         error: userError,
//       } = await supabase.auth.getUser();

//       if (!user || userError) {
//         router.push("/login");
//         return;
//       }

//       try {
//         // Cargar consulta con datos del paciente
//         const { data: consultationData, error: consultationError } =
//           await supabase
//             .from("consultations")
//             .select(
//               `
//             *,
//             medical_histories!inner(
//               id,
//               patients (*)
//             )
//           `
//             )
//             .eq("id", id)
//             .eq("doctor_id", user.id)
//             .single();

//         if (consultationError) throw consultationError;

//         // Cargar datos del doctor
//         const { data: doctorData, error: doctorError } = await supabase
//           .from("doctors")
//           .select("*")
//           .eq("id", user.id)
//           .single();

//         if (doctorError) throw doctorError;

//         const vitalSignsParsed: VitalSigns =
//           typeof consultationData.vital_signs === "string"
//             ? JSON.parse(consultationData.vital_signs.replace(/""/g, '"'))
//             : consultationData.vital_signs;

//         const patientData = consultationData.medical_histories.patients;

//         setConsultation({
//           ...consultationData,
//           vital_signs: vitalSignsParsed,
//           patient: patientData
//             ? {
//                 full_name: patientData.full_name,
//                 cedula: patientData.cedula,
//               }
//             : undefined,
//         });

//         setDoctor(doctorData);
//         setPatient(patientData);
//         setMedicalHistoryId(consultationData.medical_history_id);
//       } catch (error: any) {
//         console.error("Error:", error?.message);
//         router.push("/dashboard/consultations");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [id, router]);

//   console.log(consultation);
//   const handlePrescriptionSuccess = () => {
//     setShowPrescriptionDialog(false);
//     // Opcional: mostrar mensaje de éxito
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
//           <p className="text-muted-foreground">Cargando consulta médica...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!consultation || !doctor || !patient) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-red-600 mb-4">No se pudo cargar la consulta</p>
//           <Button onClick={() => router.push("/dashboard/consultations")}>
//             Volver a Consultas
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   const { vital_signs } = consultation;

//   return (
//     <div className="min-h-screen bg-background">
//       <div className="max-w-4xl mx-auto px-4 py-8">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-6">
//           <div className="flex items-center space-x-4">
//             <div>
//               <h1 className="text-2xl font-bold">Consulta Médica</h1>
//               <p className="text-muted-foreground">
//                 {new Date(consultation.consultation_date).toLocaleDateString(
//                   "es-ES",
//                   {
//                     weekday: "long",
//                     year: "numeric",
//                     month: "long",
//                     day: "numeric",
//                   }
//                 )}
//               </p>
//             </div>
//           </div>
//           <div className="flex space-x-2">
//             <Button
//               variant="outline"
//               onClick={() => setShowPrescriptionDialog(true)}
//             >
//               <Pill className="h-4 w-4 mr-2" />
//               Restaurar
//             </Button>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* Información del Paciente */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <User className="h-5 w-5 mr-2" />
//                 Información del Paciente
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div>
//                 <p className="text-sm text-muted-foreground">Nombre</p>
//                 <p className="font-medium">{consultation.patient?.full_name}</p>
//               </div>
//               <div>
//                 <p className="text-sm text-muted-foreground">Cédula</p>
//                 <p className="font-medium">
//                   {consultation.patient?.cedula || "No registrada"}
//                 </p>
//               </div>
//               <div>
//                 <p className="text-sm text-muted-foreground">
//                   Fecha de consulta
//                 </p>
//                 <div className="flex items-center">
//                   <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
//                   <p className="font-medium">
//                     {new Date(consultation.consultation_date).toLocaleString(
//                       "es-ES"
//                     )}
//                   </p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Signos Vitales */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <Activity className="h-5 w-5 mr-2" />
//                 Signos Vitales
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-3">
//               <div className="grid grid-cols-2 gap-3 text-sm">
//                 <div>
//                   <p className="text-muted-foreground">Presión</p>
//                   <p className="font-medium">{vital_signs?.bp || "—"}</p>
//                 </div>
//                 <div>
//                   <p className="text-muted-foreground">Temperatura</p>
//                   <p className="font-medium">
//                     {vital_signs?.temp ? `${vital_signs.temp}°C` : "—"}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-muted-foreground">Peso</p>
//                   <p className="font-medium">
//                     {vital_signs?.weight ? `${vital_signs.weight} kg` : "—"}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-muted-foreground">Altura</p>
//                   <p className="font-medium">
//                     {vital_signs?.height ? `${vital_signs.height} cm` : "—"}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-muted-foreground">FC</p>
//                   <p className="font-medium">
//                     {vital_signs?.heart_rate
//                       ? `${vital_signs.heart_rate} bpm`
//                       : "—"}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-muted-foreground">FR</p>
//                   <p className="font-medium">
//                     {vital_signs?.respiratory_rate
//                       ? `${vital_signs.respiratory_rate} rpm`
//                       : "—"}
//                   </p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Estado de la Consulta */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <Stethoscope className="h-5 w-5 mr-2" />
//                 Estado
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-4">
//                 <div>
//                   <p className="text-sm text-muted-foreground mb-2">
//                     Estado actual
//                   </p>
//                   <Badge
//                     variant="secondary"
//                     className="bg-orange-100 text-orange-800"
//                   >
//                     {consultation.is_active ? "" : "Archivada"}{" "}
//                   </Badge>
//                 </div>
//                 {consultation.follow_up_date && (
//                   <div>
//                     <p className="text-sm text-muted-foreground">
//                       Próxima cita
//                     </p>
//                     <p className="font-medium">
//                       {new Date(consultation.follow_up_date).toLocaleDateString(
//                         "es-ES"
//                       )}
//                     </p>
//                   </div>
//                 )}
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Detalles de la Consulta */}
//         <div className="mt-6 space-y-6">
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <FileText className="h-5 w-5 mr-2" />
//                 Detalles de la Consulta
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-6">
//               <div>
//                 <h3 className="font-medium text-sm text-muted-foreground mb-2">
//                   Motivo de la Consulta
//                 </h3>
//                 <p className="text-sm leading-relaxed">
//                   {consultation.reason_for_visit}
//                 </p>
//               </div>

//               {consultation.symptoms && (
//                 <>
//                   <Separator />
//                   <div>
//                     <h3 className="font-medium text-sm text-muted-foreground mb-2">
//                       Síntomas
//                     </h3>
//                     <p className="text-sm leading-relaxed">
//                       {consultation.symptoms}
//                     </p>
//                   </div>
//                 </>
//               )}

//               {consultation.physical_examination && (
//                 <>
//                   <Separator />
//                   <div>
//                     <h3 className="font-medium text-sm text-muted-foreground mb-2">
//                       Examen Físico
//                     </h3>
//                     <p className="text-sm leading-relaxed">
//                       {consultation.physical_examination}
//                     </p>
//                   </div>
//                 </>
//               )}

//               {consultation.diagnosis && (
//                 <>
//                   <Separator />
//                   <div>
//                     <h3 className="font-medium text-sm text-muted-foreground mb-2">
//                       Diagnóstico
//                     </h3>
//                     <p className="text-sm leading-relaxed">
//                       {consultation.diagnosis}
//                     </p>
//                   </div>
//                 </>
//               )}

//               {consultation.treatment_plan && (
//                 <>
//                   <Separator />
//                   <div>
//                     <h3 className="font-medium text-sm text-muted-foreground mb-2">
//                       Plan de Tratamiento
//                     </h3>
//                     <p className="text-sm leading-relaxed">
//                       {consultation.treatment_plan}
//                     </p>
//                   </div>
//                 </>
//               )}

//               {consultation.notes && (
//                 <>
//                   <Separator />
//                   <div>
//                     <h3 className="font-medium text-sm text-muted-foreground mb-2">
//                       Notas Adicionales
//                     </h3>
//                     <p className="text-sm leading-relaxed">
//                       {consultation.notes}
//                     </p>
//                   </div>
//                 </>
//               )}
//             </CardContent>
//           </Card>
//         </div>

//         {/* Dialog para crear receta */}
//         {showPrescriptionDialog &&
//           consultation &&
//           doctor &&
//           patient &&
//           medicalHistoryId && (
//             <PrescriptionFromConsultationDialog
//               open={showPrescriptionDialog}
//               onOpenChange={setShowPrescriptionDialog}
//               consultation={consultation}
//               patient={patient}
//               doctor={doctor}
//               medicalHistoryId={medicalHistoryId}
//               onSuccess={handlePrescriptionSuccess}
//             />
//           )}
//       </div>
//     </div>
//   );
// }
