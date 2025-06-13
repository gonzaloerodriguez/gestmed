"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function NewConsultationPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    consultation_date: "",
    observations: "",
  });

  // Obtener el ID del doctor autenticado
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) setUserId(data.user.id);
    };
    fetchUser();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!userId) {
      alert("Debes iniciar sesión.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("medical_records").insert({
      doctor_id: userId,
      patient_id: params.id,
      consultation_date: form.consultation_date,
      observations: form.observations,
      is_active: true,
    });

    setLoading(false);

    if (error) {
      alert("Error al guardar la consulta: " + error.message);
    } else {
      router.push(`/patients/${params.id}`);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow-lg rounded-2xl">
      <h2 className="text-2xl font-semibold mb-4">Nueva Consulta Médica</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="consultation_date">Fecha de consulta</Label>
          <Input
            type="date"
            id="consultation_date"
            name="consultation_date"
            value={form.consultation_date}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="observations">Observaciones</Label>
          <Textarea
            id="observations"
            name="observations"
            rows={5}
            value={form.observations}
            onChange={handleChange}
            placeholder="Síntomas, diagnóstico, tratamiento..."
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Guardando..." : "Registrar Consulta"}
        </Button>
      </form>
    </div>
  );
}
