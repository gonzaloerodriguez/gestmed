"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PatientForm } from "@/components/forms/PatientForm";
import { supabase } from "@/lib/supabase/supabase";
import type { Doctor } from "@/lib/supabase/types/doctor";
import type { Patient } from "@/lib/supabase/types/patient";

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    loadDoctor();
  }, []);

  const loadDoctor = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: doctorData, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setDoctor(doctorData);
    } catch (error: any) {
      console.error("Error loading doctor:", error.message);
      router.push("/dashboard/patients");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const handlePatientCreated = (patient: Patient) => {
    router.push(`/dashboard/patients/${patient.id}`);
  };

  return (
    <div className="p-6">
      <PatientForm
        doctorId={doctor!.id}
        onSuccess={handlePatientCreated}
        onCancel={() => router.push("/dashboard/patients")}
      />
    </div>
  );
}
