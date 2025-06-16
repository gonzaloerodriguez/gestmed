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
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { supabase, type Doctor } from "@/lib/supabase";
import { PatientSelector } from "@/components/patient-selector";

export default function NewPrescriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [medicalHistoryId, setMedicalHistoryId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    diagnosis: "",
    medications: "",
    instructions: "",
    notes: "",
    date_prescribed: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  const checkUserAndLoadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Cargar datos del médico
      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("*")
        .eq("id", user.id)
        .single();

      if (doctorError) throw doctorError;
      setDoctor(doctorData);
    } catch (error: any) {
      console.error("Error:", error.message);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // NUEVA FUNCIÓN: Manejar selección de paciente y cargar historial médico
  const handlePatientSelect = async (patient: any) => {
    setSelectedPatient(patient);
    setMedicalHistoryId(null);

    if (patient && patient.id) {
      try {
        console.log("Buscando historial médico para paciente:", patient.id);

        // Buscar historial médico del paciente
        const { data: medicalHistory, error: historyError } = await supabase
          .from("medical_histories")
          .select("id")
          .eq("patient_id", patient.id)
          .single();

        if (historyError) {
          console.error("Error buscando historial médico:", historyError);
          // Si no existe historial médico, podríamos crearlo automáticamente
          // o mostrar una advertencia al usuario
        } else {
          console.log("Historial médico encontrado:", medicalHistory.id);
          setMedicalHistoryId(medicalHistory.id);
        }
      } catch (error: any) {
        console.error("Error al buscar historial médico:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor) return;

    // Validaciones básicas
    if (!selectedPatient) {
      alert("Debes seleccionar un paciente");
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
        doctor_id: doctor.id,
        medical_history_id: medicalHistoryId, // AGREGADO: Incluir el ID del historial médico
        patient_name: selectedPatient.full_name,
        patient_age: selectedPatient.birth_date
          ? new Date().getFullYear() -
            new Date(selectedPatient.birth_date).getFullYear()
          : null,
        patient_cedula: selectedPatient.cedula,
        patient_phone: selectedPatient.phone || null,
        patient_address: selectedPatient.address || null,
        diagnosis: formData.diagnosis.trim() || null,
        medications: formData.medications.trim(),
        instructions: formData.instructions.trim(),
        notes: formData.notes.trim() || null,
        date_prescribed: formData.date_prescribed,
      };

      console.log("Datos a insertar:", prescriptionData);

      const { data, error } = await supabase
        .from("prescriptions")
        .insert(prescriptionData)
        .select()
        .single();

      if (error) throw error;

      alert("Receta creada exitosamente");
      router.push(`/dashboard/prescriptions/${data.id}`);
    } catch (error: any) {
      console.error("Error completo:", error);
      alert("Error al crear receta: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error al cargar datos del médico</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            Volver al Dashboard
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
                onClick={() => router.push("/dashboard/prescriptions")}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Nueva Receta
                </h1>
                <p className="text-muted-foreground">
                  Crear una nueva receta médica
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
                    value={`${doctor.gender === "female" ? "Dra." : "Dr."} ${doctor.full_name}`}
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

          {/* Selección de Paciente */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Paciente</CardTitle>
              <CardDescription>
                Selecciona un paciente existente o crea uno nuevo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PatientSelector
                onPatientSelect={handlePatientSelect} // CAMBIADO: usar la nueva función
                selectedPatient={selectedPatient}
                allowOneTime={true}
              />

              {selectedPatient && (
                <div className="space-y-4">
                  {/* Información del paciente */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label>Nombre Completo</Label>
                      <Input
                        value={selectedPatient.full_name}
                        disabled
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label>Cédula</Label>
                      <Input
                        value={selectedPatient.cedula || "N/A"}
                        disabled
                        className="bg-white"
                      />
                    </div>
                    {selectedPatient.phone && (
                      <div>
                        <Label>Teléfono</Label>
                        <Input
                          value={selectedPatient.phone}
                          disabled
                          className="bg-white"
                        />
                      </div>
                    )}
                    {selectedPatient.email && (
                      <div>
                        <Label>Email</Label>
                        <Input
                          value={selectedPatient.email}
                          disabled
                          className="bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* NUEVO: Estado del historial médico */}
                  <div className="p-4 rounded-lg border">
                    {medicalHistoryId ? (
                      <div className="flex items-center text-green-700 bg-green-50 p-3 rounded">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                        <div>
                          <p className="font-medium">
                            Historial médico encontrado
                          </p>
                          <p className="text-sm">
                            La receta se asociará automáticamente al historial
                            del paciente
                          </p>
                        </div>
                      </div>
                    ) : selectedPatient.id ? (
                      <div className="flex items-center text-amber-700 bg-amber-50 p-3 rounded">
                        <AlertCircle className="w-5 h-5 mr-3" />
                        <div>
                          <p className="font-medium">Sin historial médico</p>
                          <p className="text-sm">
                            Este paciente no tiene historial médico registrado
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center text-blue-700 bg-blue-50 p-3 rounded">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        <div>
                          <p className="font-medium">Paciente temporal</p>
                          <p className="text-sm">
                            Esta receta no se asociará a un historial médico
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
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
              onClick={() => router.push("/dashboard/prescriptions")}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Guardando..." : "Crear Receta"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
