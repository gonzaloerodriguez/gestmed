"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { supabase, type Doctor, type Prescription } from "@/lib/supabase";

interface EditPrescriptionPageProps {
  params: {
    id: string;
  };
}

export default function EditPrescriptionPage({
  params,
}: EditPrescriptionPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [prescription, setPrescription] = useState<Prescription | null>(null);

  const [formData, setFormData] = useState({
    patient_name: "",
    patient_age: "",
    patient_cedula: "",
    patient_phone: "",
    patient_address: "",
    diagnosis: "",
    medications: "",
    instructions: "",
    notes: "",
    date_prescribed: "",
  });

  useEffect(() => {
    loadPrescription();
  }, [params.id]);

  const loadPrescription = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Cargar receta con datos del médico
      const { data: prescriptionData, error: prescriptionError } =
        await supabase
          .from("prescriptions")
          .select(
            `
          *,
          doctor:doctors(*)
        `
          )
          .eq("id", params.id)
          .eq("doctor_id", user.id) // Asegurar que solo edite sus propias recetas
          .single();

      if (prescriptionError) throw prescriptionError;

      setPrescription(prescriptionData);
      setDoctor(prescriptionData.doctor);

      // Inicializar formulario con datos de la receta
      setFormData({
        patient_name: prescriptionData.patient_name || "",
        patient_age: prescriptionData.patient_age
          ? String(prescriptionData.patient_age)
          : "",
        patient_cedula: prescriptionData.patient_cedula || "",
        patient_phone: prescriptionData.patient_phone || "",
        patient_address: prescriptionData.patient_address || "",
        diagnosis: prescriptionData.diagnosis || "",
        medications: prescriptionData.medications || "",
        instructions: prescriptionData.instructions || "",
        notes: prescriptionData.notes || "",
        date_prescribed:
          prescriptionData.date_prescribed ||
          new Date().toISOString().split("T")[0],
      });
    } catch (error: any) {
      console.error("Error loading prescription:", error.message);
      router.push("/dashboard/prescriptions");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor || !prescription) return;

    // Validaciones básicas
    if (!formData.patient_name.trim()) {
      alert("El nombre del paciente es obligatorio");
      return;
    }

    if (!formData.medications.trim()) {
      alert("Los medicamentos son obligatorios");
      return;
    }

    if (!formData.instructions.trim()) {
      alert("Las instrucciones son obligatorias");
      return;
    }

    setSaving(true);
    try {
      const prescriptionData = {
        patient_name: formData.patient_name.trim(),
        patient_age: formData.patient_age
          ? Number.parseInt(formData.patient_age)
          : null,
        patient_cedula: formData.patient_cedula.trim() || null,
        patient_phone: formData.patient_phone.trim() || null,
        patient_address: formData.patient_address.trim() || null,
        diagnosis: formData.diagnosis.trim() || null,
        medications: formData.medications.trim(),
        instructions: formData.instructions.trim(),
        notes: formData.notes.trim() || null,
        date_prescribed: formData.date_prescribed,
      };

      const { error } = await supabase
        .from("prescriptions")
        .update(prescriptionData)
        .eq("id", prescription.id);

      if (error) throw error;

      alert("Receta actualizada exitosamente");
      router.push(`/dashboard/prescriptions/${prescription.id}`);
    } catch (error: any) {
      alert("Error al actualizar receta: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando receta...</p>
        </div>
      </div>
    );
  }

  if (!prescription || !doctor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Receta no encontrada</p>
          <Button
            onClick={() => router.push("/dashboard/prescriptions")}
            className="mt-4"
          >
            Volver a Recetas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() =>
                  router.push(`/dashboard/prescriptions/${prescription.id}`)
                }
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Editar Receta
                </h1>
                <p className="text-muted-foreground">
                  Paciente: {prescription.patient_name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Información del Médico */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Médico</CardTitle>
              <CardDescription>
                Datos que aparecerán en la receta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Médico</Label>
                  <Input
                    value={`${doctor.gender === "female" ? "Dra." : "Dr."} ${
                      doctor.full_name
                    }`}
                    disabled
                    className="bg-background"
                  />
                </div>
                <div>
                  <Label>Matrícula</Label>
                  <Input
                    value={doctor.license_number}
                    disabled
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Especialidad</Label>
                  <Input
                    value={doctor.specialty || "Médico General"}
                    disabled
                    className="bg-background"
                  />
                </div>
                <div>
                  <Label>Fecha de Prescripción</Label>
                  <Input
                    type="date"
                    value={formData.date_prescribed}
                    onChange={(e) =>
                      handleInputChange("date_prescribed", e.target.value)
                    }
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del Paciente */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Paciente</CardTitle>
              <CardDescription>
                Datos del paciente para la receta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patient_name">Nombre Completo *</Label>
                  <Input
                    id="patient_name"
                    value={formData.patient_name}
                    onChange={(e) =>
                      handleInputChange("patient_name", e.target.value)
                    }
                    placeholder="Nombre completo del paciente"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="patient_age">Edad</Label>
                  <Input
                    id="patient_age"
                    type="number"
                    min="0"
                    max="150"
                    value={formData.patient_age}
                    onChange={(e) =>
                      handleInputChange("patient_age", e.target.value)
                    }
                    placeholder="Edad del paciente"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patient_cedula">Cédula de Identidad</Label>
                  <Input
                    id="patient_cedula"
                    value={formData.patient_cedula}
                    onChange={(e) =>
                      handleInputChange("patient_cedula", e.target.value)
                    }
                    placeholder="Cédula del paciente"
                  />
                </div>
                <div>
                  <Label htmlFor="patient_phone">Teléfono</Label>
                  <Input
                    id="patient_phone"
                    value={formData.patient_phone}
                    onChange={(e) =>
                      handleInputChange("patient_phone", e.target.value)
                    }
                    placeholder="Teléfono del paciente"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="patient_address">Dirección</Label>
                <Input
                  id="patient_address"
                  value={formData.patient_address}
                  onChange={(e) =>
                    handleInputChange("patient_address", e.target.value)
                  }
                  placeholder="Dirección del paciente"
                />
              </div>
            </CardContent>
          </Card>

          {/* Información Médica */}
          <Card>
            <CardHeader>
              <CardTitle>Información Médica</CardTitle>
              <CardDescription>Diagnóstico y tratamiento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="diagnosis">Diagnóstico</Label>
                <Textarea
                  id="diagnosis"
                  value={formData.diagnosis}
                  onChange={(e) =>
                    handleInputChange("diagnosis", e.target.value)
                  }
                  placeholder="Diagnóstico del paciente"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="medications">Medicamentos *</Label>
                <Textarea
                  id="medications"
                  value={formData.medications}
                  onChange={(e) =>
                    handleInputChange("medications", e.target.value)
                  }
                  placeholder="Lista de medicamentos prescritos&#10;Ejemplo:&#10;- Paracetamol 500mg - 1 tableta cada 8 horas&#10;- Ibuprofeno 400mg - 1 tableta cada 12 horas"
                  rows={6}
                  required
                />
              </div>

              <div>
                <Label htmlFor="instructions">Instrucciones *</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) =>
                    handleInputChange("instructions", e.target.value)
                  }
                  placeholder="Instrucciones para el paciente&#10;Ejemplo:&#10;- Tomar con alimentos&#10;- Completar todo el tratamiento&#10;- Regresar en 7 días para control"
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Notas adicionales o recomendaciones especiales"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Botones de Acción */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(`/dashboard/prescriptions/${prescription.id}`)
              }
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Guardando..." : "Actualizar Receta"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
