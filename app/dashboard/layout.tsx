"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserProvider } from "@/contexts/user-context";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { supabase, type Doctor } from "@/lib/supabase";

export default function DashboardLayoutWithContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Obtener datos del médico
      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("*")
        .eq("id", user.id)
        .single();

      if (doctorError) throw doctorError;
      setDoctor(doctorData);
    } catch (error: any) {
      console.error("Error:", error.message);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error al cargar información del médico</p>
        </div>
      </div>
    );
  }

  return (
    <UserProvider initialUser={doctor} initialUserType="doctor">
      <DashboardSidebar>{children}</DashboardSidebar>
    </UserProvider>
  );
}
