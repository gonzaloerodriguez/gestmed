"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { PatientForm } from "@/components/forms/PatientForm";
import { supabase } from "@/lib/supabase/supabase";
import type { Doctor } from "@/lib/supabase/types/doctor";
import type { Patient } from "@/lib/supabase/types/patient";
import type { PatientRepresentative } from "@/lib/supabase/types/patientrepresentative";
import type { MedicalHistory } from "@/lib/supabase/types/medicalhistory";

export default function EditPatientPage() {
  const router = useRouter();
  const { id } = useParams();
  const patientId = typeof id === "string" ? id : null;

  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [representative, setRepresentative] =
    useState<PatientRepresentative | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory | null>(
    null
  );

  useEffect(() => {
    if (patientId) {
      loadData(patientId);
    }
  }, [patientId]);

  const loadData = async (id: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("*")
        .eq("id", user.id)
        .single();
      if (doctorError) throw doctorError;
      setDoctor(doctorData);

      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .eq("doctor_id", user.id)
        .single();
      if (patientError) throw patientError;
      setPatient(patientData);

      const { data: repData } = await supabase
        .from("patient_representatives")
        .select("*")
        .eq("patient_id", id)
        .eq("is_primary", true)
        .maybeSingle();
      if (repData) setRepresentative(repData);

      const { data: historyData, error: historyError } = await supabase
        .from("medical_histories")
        .select("*")
        .eq("patient_id", id)
        .single();
      if (historyError) throw historyError;
      setMedicalHistory(historyData);
    } catch (error: any) {
      console.error("Error cargando paciente:", error.message);
      router.push("/dashboard/patients");
    } finally {
      setLoading(false);
    }
  };

  const handleSaved = () => {
    if (patientId) {
      router.push(`/dashboard/patients/${patientId}`);
    } else {
      router.push("/dashboard/patients");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!patient || !doctor || !medicalHistory) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Paciente no encontrado</p>
          <button
            className="mt-4 underline"
            onClick={() => router.push("/dashboard/patients")}
          >
            Volver a pacientes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PatientForm
        doctorId={doctor.id}
        patient={patient}
        representative={representative}
        medicalHistory={medicalHistory}
        onSuccess={handleSaved}
        onCancel={() => router.push(`/dashboard/patients/${patientId}`)}
      />
    </div>
  );
}
