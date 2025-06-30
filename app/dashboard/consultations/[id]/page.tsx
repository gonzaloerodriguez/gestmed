"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  User,
  Stethoscope,
  FileText,
  Activity,
  Pill,
  Edit,
  Loader2,
} from "lucide-react";
import { PrescriptionFromConsultationDialog } from "@/components/prescription/prescription-from-consultation-dialog";
import type {
  ConsultationWithPatient,
  VitalSigns,
} from "@/lib/supabase/types/consultations";
import type { Doctor } from "@/lib/supabase/types/doctor";
import type { Patient } from "@/lib/supabase/types/patient";

export default function ConsultationDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [consultation, setConsultation] =
    useState<ConsultationWithPatient | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalHistoryId, setMedicalHistoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);

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
        router.push("/dashboard/consultations");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const handlePrescriptionSuccess = () => {
    setShowPrescriptionDialog(false);
    // Opcional: mostrar mensaje de éxito
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
          <Button onClick={() => router.push("/dashboard/consultations")}>
            Volver a Consultas
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
              <h1 className="text-2xl font-bold">Consulta Médica</h1>
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
              onClick={() => setShowPrescriptionDialog(true)}
            >
              <Pill className="h-4 w-4 mr-2" />
              Crear Receta
            </Button>
            <Button
              onClick={() =>
                router.push(`/dashboard/consultations/${consultation.id}/edit`)
              }
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
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
                  <Badge variant="secondary">Completada</Badge>
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

        {/* Dialog para crear receta */}
        {showPrescriptionDialog &&
          consultation &&
          doctor &&
          patient &&
          medicalHistoryId && (
            <PrescriptionFromConsultationDialog
              open={showPrescriptionDialog}
              onOpenChange={setShowPrescriptionDialog}
              consultation={consultation}
              patient={patient}
              doctor={doctor}
              medicalHistoryId={medicalHistoryId}
              onSuccess={handlePrescriptionSuccess}
            />
          )}
      </div>
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabase/supabase";
// import {
//   ConsultationWithPatient,
//   VitalSigns,
// } from "@/lib/supabase/types/consultations";

// export default function ConsultationDetailPage() {
//   const { id } = useParams();
//   const router = useRouter();

//   const [consultation, setConsultation] =
//     useState<ConsultationWithPatient | null>(null);
//   const [loading, setLoading] = useState(true);

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

//       // Consulta + paciente relacionado (mediante medical_history)
//       const { data, error } = await supabase
//         .from("consultations")
//         .select(
//           `
//           id,
//           medical_history_id,
//           doctor_id,
//           consultation_date,
//           reason_for_visit,
//           symptoms,
//           physical_examination,
//           diagnosis,
//           treatment_plan,
//           notes,
//           follow_up_date,
//           vital_signs,
//           created_at,
//           updated_at,
//           medical_histories!inner(
//             patients (
//               full_name,
//               cedula
//             )
//           )
//         `
//         )
//         .eq("id", id)
//         .eq("doctor_id", user.id)
//         .single();

//       if (error || !data) {
//         console.error("Error:", error?.message);
//         router.push("/dashboard/consultations");
//         return;
//       }

//       const vitalSignsParsed: VitalSigns =
//         typeof data.vital_signs === "string"
//           ? JSON.parse(data.vital_signs.replace(/""/g, '"'))
//           : data.vital_signs;

//       const patientData = data.medical_histories?.[0]?.patients?.[0];

//       setConsultation({
//         id: data.id,
//         medical_history_id: data.medical_history_id,
//         doctor_id: data.doctor_id,
//         consultation_date: data.consultation_date,
//         reason_for_visit: data.reason_for_visit,
//         symptoms: data.symptoms,
//         physical_examination: data.physical_examination,
//         diagnosis: data.diagnosis,
//         treatment_plan: data.treatment_plan,
//         notes: data.notes,
//         follow_up_date: data.follow_up_date,
//         vital_signs: vitalSignsParsed,
//         created_at: data.created_at,
//         updated_at: data.updated_at,
//         patient: patientData
//           ? {
//               full_name: patientData.full_name,
//               cedula: patientData.cedula,
//             }
//           : undefined,
//       });

//       setLoading(false);
//     };

//     fetchData();
//   }, [id, router]);

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center text-muted-foreground">
//         <div className="text-center">
//           <div className="animate-spin h-10 w-10 border-b-2 border-primary rounded-full mx-auto mb-4" />
//           <p>Cargando consulta médica...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!consultation) return null;

//   const { patient, vital_signs } = consultation;

//   return (
//     <div className="max-w-3xl mx-auto px-4 py-10">
//       <h1 className="text-2xl font-bold mb-4">Consulta Médica</h1>

//       <div className="space-y-6">
//         <div>
//           <h2 className="text-sm text-muted-foreground">Paciente</h2>
//           <p className="text-lg font-semibold">{patient?.full_name}</p>
//           <p className="text-sm text-muted-foreground">CI: {patient?.cedula}</p>
//         </div>

//         <div>
//           <h2 className="text-sm text-muted-foreground">Fecha</h2>
//           <p>
//             {new Date(consultation.consultation_date).toLocaleString("es-EC")}
//           </p>
//         </div>

//         <div>
//           <h2 className="text-sm text-muted-foreground">Motivo</h2>
//           <p>{consultation.reason_for_visit}</p>
//         </div>

//         <div>
//           <h2 className="text-sm text-muted-foreground">Síntomas</h2>
//           <p>{consultation.symptoms || "No registrados"}</p>
//         </div>

//         <div>
//           <h2 className="text-sm text-muted-foreground">Examen Físico</h2>
//           <p>{consultation.physical_examination || "No registrado"}</p>
//         </div>

//         <div>
//           <h2 className="text-sm text-muted-foreground">Diagnóstico</h2>
//           <p>{consultation.diagnosis || "No registrado"}</p>
//         </div>

//         <div>
//           <h2 className="text-sm text-muted-foreground">Tratamiento</h2>
//           <p>{consultation.treatment_plan || "No definido"}</p>
//         </div>

//         <div>
//           <h2 className="text-sm text-muted-foreground">Notas</h2>
//           <p>{consultation.notes || "Sin notas adicionales"}</p>
//         </div>

//         <div>
//           <h2 className="text-sm text-muted-foreground">Signos Vitales</h2>
//           <ul className="text-sm text-muted-foreground space-y-1 mt-1">
//             <li>Presión: {vital_signs?.bp || "—"}</li>
//             <li>Temperatura: {vital_signs?.temp ?? "—"} °C</li>
//             <li>Peso: {vital_signs?.weight ?? "—"} kg</li>
//             <li>Altura: {vital_signs?.height ?? "—"} cm</li>
//             <li>Frecuencia cardíaca: {vital_signs?.heart_rate ?? "—"} bpm</li>
//             <li>
//               Frecuencia respiratoria: {vital_signs?.respiratory_rate ?? "—"}{" "}
//               rpm
//             </li>
//           </ul>
//         </div>

//         {consultation.follow_up_date && (
//           <div>
//             <h2 className="text-sm text-muted-foreground">Próxima cita</h2>
//             <p>
//               {new Date(consultation.follow_up_date).toLocaleDateString(
//                 "es-EC"
//               )}
//             </p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
