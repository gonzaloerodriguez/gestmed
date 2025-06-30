"use client";

import { ConsultationsTable } from "@/components/consultation/consultations-table";
import { Calendar, Stethoscope, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsultationWithPatientFlat } from "@/lib/supabase/types/consultations";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabase";
import { useRouter } from "next/navigation";

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState<
    ConsultationWithPatientFlat[]
  >([]);
  const router = useRouter();
  useEffect(() => {
    checkUserAndLoadConsultations();
  }, []);

  const checkUserAndLoadConsultations = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      await loadConsultations(user.id);
    } catch (error: any) {
      console.error("Error:", error.message);
    }
  };

  const loadConsultations = async (doctorId: string) => {
    try {
      const { data, error } = await supabase
        .from("consultations")
        .select(
          `
          id,
          consultation_date,
          reason_for_visit,
          diagnosis,
          created_at,
          medical_history:medical_histories!inner(
            patient:patients!inner(
              full_name,
              cedula
            )
          )
        `
        )
        .eq("doctor_id", doctorId)
        .order("consultation_date", { ascending: false });

      if (error) throw error;

      // Transformar los datos para que coincidan con la interfaz
      const transformedData: ConsultationWithPatientFlat[] = (data || []).map(
        (item: any) => ({
          id: item.id,
          consultation_date: item.consultation_date,
          reason_for_visit: item.reason_for_visit,
          diagnosis: item.diagnosis,
          created_at: item.created_at,
          medical_history: {
            patient: {
              full_name: item.medical_history.patient.full_name,
              cedula: item.medical_history.patient.cedula,
            },
          },
        })
      );

      setConsultations(transformedData);
    } catch (error: any) {
      console.error("Error loading consultations:", error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Consultas
              </CardTitle>
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{consultations.length}</div>
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
                  consultations.filter((c) => {
                    const consultationDate = new Date(c.consultation_date);
                    const now = new Date();
                    return (
                      consultationDate.getMonth() === now.getMonth() &&
                      consultationDate.getFullYear() === now.getFullYear()
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
                    consultations.map((c) => c.medical_history.patient.cedula)
                  ).size
                }
              </div>
            </CardContent>
          </Card>
        </div>
        <ConsultationsTable />
      </main>
    </div>
  );
}
