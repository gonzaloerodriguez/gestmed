"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface VitalSigns {
  weight?: number | null;
  height?: number | null;
  bp?: string | null;
  temp?: number | null;
  heart_rate?: number | null;
  respiratory_rate?: number | null;
}

interface Consultation {
  id: string;
  consultation_date: string;
  reason_for_visit: string;
  symptoms?: string;
  diagnosis?: string;
  treatment_plan?: string;
  physical_examination?: string;
  notes?: string;
  follow_up_date?: string;
  vital_signs?: VitalSigns;
  created_at: string;
  updated_at: string;
  patient?: {
    full_name: string;
    cedula: string;
  };
}

export default function ConsultationDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);

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

      // Consulta + paciente relacionado (mediante medical_history)
      const { data, error } = await supabase
        .from("consultations")
        .select(
          `
          id,
          consultation_date,
          reason_for_visit,
          symptoms,
          physical_examination,
          diagnosis,
          treatment_plan,
          notes,
          follow_up_date,
          vital_signs,
          created_at,
          updated_at,
          medical_histories!inner(
            patients (
              full_name,
              cedula
            )
          )
        `
        )
        .eq("id", id)
        .eq("doctor_id", user.id)
        .single();

      if (error || !data) {
        console.error("Error:", error?.message);
        router.push("/dashboard/consultations");
        return;
      }

      const vitalSignsParsed: VitalSigns =
        typeof data.vital_signs === "string"
          ? JSON.parse(data.vital_signs.replace(/""/g, '"'))
          : data.vital_signs;

      const patientData = data.medical_histories?.[0]?.patients?.[0];

      setConsultation({
        id: data.id,
        consultation_date: data.consultation_date,
        reason_for_visit: data.reason_for_visit,
        symptoms: data.symptoms,
        physical_examination: data.physical_examination,
        diagnosis: data.diagnosis,
        treatment_plan: data.treatment_plan,
        notes: data.notes,
        follow_up_date: data.follow_up_date,
        vital_signs: vitalSignsParsed,
        created_at: data.created_at,
        updated_at: data.updated_at,
        patient: patientData
          ? {
              full_name: patientData.full_name,
              cedula: patientData.cedula,
            }
          : undefined,
      });

      setLoading(false);
    };

    fetchData();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-b-2 border-primary rounded-full mx-auto mb-4" />
          <p>Cargando consulta médica...</p>
        </div>
      </div>
    );
  }

  if (!consultation) return null;

  const { patient, vital_signs } = consultation;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-4">Consulta Médica</h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-sm text-muted-foreground">Paciente</h2>
          <p className="text-lg font-semibold">{patient?.full_name}</p>
          <p className="text-sm text-muted-foreground">CI: {patient?.cedula}</p>
        </div>

        <div>
          <h2 className="text-sm text-muted-foreground">Fecha</h2>
          <p>
            {new Date(consultation.consultation_date).toLocaleString("es-EC")}
          </p>
        </div>

        <div>
          <h2 className="text-sm text-muted-foreground">Motivo</h2>
          <p>{consultation.reason_for_visit}</p>
        </div>

        <div>
          <h2 className="text-sm text-muted-foreground">Síntomas</h2>
          <p>{consultation.symptoms || "No registrados"}</p>
        </div>

        <div>
          <h2 className="text-sm text-muted-foreground">Examen Físico</h2>
          <p>{consultation.physical_examination || "No registrado"}</p>
        </div>

        <div>
          <h2 className="text-sm text-muted-foreground">Diagnóstico</h2>
          <p>{consultation.diagnosis || "No registrado"}</p>
        </div>

        <div>
          <h2 className="text-sm text-muted-foreground">Tratamiento</h2>
          <p>{consultation.treatment_plan || "No definido"}</p>
        </div>

        <div>
          <h2 className="text-sm text-muted-foreground">Notas</h2>
          <p>{consultation.notes || "Sin notas adicionales"}</p>
        </div>

        <div>
          <h2 className="text-sm text-muted-foreground">Signos Vitales</h2>
          <ul className="text-sm text-muted-foreground space-y-1 mt-1">
            <li>Presión: {vital_signs?.bp || "—"}</li>
            <li>Temperatura: {vital_signs?.temp ?? "—"} °C</li>
            <li>Peso: {vital_signs?.weight ?? "—"} kg</li>
            <li>Altura: {vital_signs?.height ?? "—"} cm</li>
            <li>Frecuencia cardíaca: {vital_signs?.heart_rate ?? "—"} bpm</li>
            <li>
              Frecuencia respiratoria: {vital_signs?.respiratory_rate ?? "—"}{" "}
              rpm
            </li>
          </ul>
        </div>

        {consultation.follow_up_date && (
          <div>
            <h2 className="text-sm text-muted-foreground">Próxima cita</h2>
            <p>
              {new Date(consultation.follow_up_date).toLocaleDateString(
                "es-EC"
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
