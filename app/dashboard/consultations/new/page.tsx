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
import { supabase, type Doctor } from "@/lib/supabase";
import { PatientSelector } from "@/components/patient-selector";

export default function NewConsultationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const [formData, setFormData] = useState({
    consultation_date: new Date().toISOString().split("T")[0],
    reason_for_visit: "",
    symptoms: "",
    physical_examination: "",
    diagnosis: "",
    treatment_plan: "",
    follow_up_date: "",
    notes: "",
    blood_pressure: "",
    temperature: "",
    heart_rate: "",
    respiratory_rate: "",
    height: "",
    weight: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor || !selectedPatient) return;

    // Validaciones básicas
    if (!selectedPatient) {
      alert("Debes seleccionar un paciente");
      return;
    }

    if (!formData.reason_for_visit.trim()) {
      alert("El motivo de la consulta es obligatorio");
      return;
    }

    setSaving(true);
    try {
      let patientId = selectedPatient.id;
      let medicalHistoryId = null;

      // Si es un paciente temporal, crearlo primero
      if (selectedPatient.id.startsWith("temp_")) {
        const { data: newPatient, error: patientError } = await supabase
          .from("patients")
          .insert({
            full_name: selectedPatient.full_name,
            cedula: selectedPatient.cedula,
            phone: selectedPatient.phone || null,
            email: selectedPatient.email || null,
            birth_date: selectedPatient.birth_date || null,
            address: selectedPatient.address || null,
            doctor_id: doctor.id,
          })
          .select()
          .single();

        if (patientError) throw patientError;
        patientId = newPatient.id;
      }

      // Buscar o crear historial médico
      const { data: existingHistory, error: historyError } = await supabase
        .from("medical_histories")
        .select("id")
        .eq("patient_id", patientId)
        .eq("doctor_id", doctor.id)
        .single();

      if (historyError && historyError.code !== "PGRST116") {
        throw historyError;
      }

      if (!existingHistory) {
        // Crear nuevo historial médico
        const { data: newHistory, error: newHistoryError } = await supabase
          .from("medical_histories")
          .insert({
            patient_id: patientId,
            doctor_id: doctor.id,
          })
          .select()
          .single();

        if (newHistoryError) throw newHistoryError;
        medicalHistoryId = newHistory.id;
      } else {
        medicalHistoryId = existingHistory.id;
      }

      // Preparar signos vitales
      const vitalSigns = {
        bp: formData.blood_pressure || null,
        temp: formData.temperature
          ? Number.parseFloat(formData.temperature)
          : null,
        heart_rate: formData.heart_rate
          ? Number.parseInt(formData.heart_rate)
          : null,
        respiratory_rate: formData.respiratory_rate
          ? Number.parseInt(formData.respiratory_rate)
          : null,
        height: formData.height ? Number.parseFloat(formData.height) : null,
        weight: formData.weight ? Number.parseFloat(formData.weight) : null,
      };

      // Crear consulta
      const consultationData = {
        medical_history_id: medicalHistoryId,
        doctor_id: doctor.id,
        consultation_date: formData.consultation_date,
        reason_for_visit: formData.reason_for_visit.trim(),
        symptoms: formData.symptoms.trim() || null,
        physical_examination: formData.physical_examination.trim() || null,
        diagnosis: formData.diagnosis.trim() || null,
        treatment_plan: formData.treatment_plan.trim() || null,
        follow_up_date: formData.follow_up_date || null,
        notes: formData.notes.trim() || null,
        vital_signs: JSON.stringify(vitalSigns),
      };

      const { data, error } = await supabase
        .from("consultations")
        .insert(consultationData)
        .select()
        .single();

      if (error) throw error;

      alert("Consulta creada exitosamente");
      router.push(`/dashboard/consultations/${data.id}`);
    } catch (error: any) {
      alert("Error al crear consulta: " + error.message);
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
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Información del Médico */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Médico</CardTitle>
              <CardDescription>
                Datos del médico que realiza la consulta
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
                  <Label>Especialidad</Label>
                  <Input
                    value={doctor.specialty || "Médico General"}
                    disabled
                    className="bg-background"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selección de Paciente */}
          <Card>
            <CardHeader>
              <CardTitle>Paciente</CardTitle>
              <CardDescription>
                Selecciona el paciente para la consulta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PatientSelector
                onPatientSelect={setSelectedPatient}
                selectedPatient={selectedPatient}
                allowOneTime={false}
              />
            </CardContent>
          </Card>

          {/* Información de la Consulta */}
          <Card>
            <CardHeader>
              <CardTitle>Información de la Consulta</CardTitle>
              <CardDescription>Detalles de la consulta médica</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="consultation_date">Fecha de Consulta *</Label>
                  <Input
                    id="consultation_date"
                    type="date"
                    value={formData.consultation_date}
                    onChange={(e) =>
                      handleInputChange("consultation_date", e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="follow_up_date">Fecha de Seguimiento</Label>
                  <Input
                    id="follow_up_date"
                    type="date"
                    value={formData.follow_up_date}
                    onChange={(e) =>
                      handleInputChange("follow_up_date", e.target.value)
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="reason_for_visit">
                  Motivo de la Consulta *
                </Label>
                <Textarea
                  id="reason_for_visit"
                  value={formData.reason_for_visit}
                  onChange={(e) =>
                    handleInputChange("reason_for_visit", e.target.value)
                  }
                  placeholder="Motivo principal de la consulta"
                  rows={2}
                  required
                />
              </div>

              <div>
                <Label htmlFor="symptoms">Síntomas</Label>
                <Textarea
                  id="symptoms"
                  value={formData.symptoms}
                  onChange={(e) =>
                    handleInputChange("symptoms", e.target.value)
                  }
                  placeholder="Síntomas reportados por el paciente"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="physical_examination">Examen Físico</Label>
                <Textarea
                  id="physical_examination"
                  value={formData.physical_examination}
                  onChange={(e) =>
                    handleInputChange("physical_examination", e.target.value)
                  }
                  placeholder="Hallazgos del examen físico"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Signos Vitales */}
          <Card>
            <CardHeader>
              <CardTitle>Signos Vitales</CardTitle>
              <CardDescription>
                Mediciones tomadas durante la consulta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="blood_pressure">Presión Arterial</Label>
                  <Input
                    id="blood_pressure"
                    value={formData.blood_pressure}
                    onChange={(e) =>
                      handleInputChange("blood_pressure", e.target.value)
                    }
                    placeholder="120/80"
                  />
                </div>
                <div>
                  <Label htmlFor="temperature">Temperatura (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) =>
                      handleInputChange("temperature", e.target.value)
                    }
                    placeholder="36.5"
                  />
                </div>
                <div>
                  <Label htmlFor="heart_rate">Frecuencia Cardíaca</Label>
                  <Input
                    id="heart_rate"
                    type="number"
                    value={formData.heart_rate}
                    onChange={(e) =>
                      handleInputChange("heart_rate", e.target.value)
                    }
                    placeholder="75"
                  />
                </div>
                <div>
                  <Label htmlFor="respiratory_rate">
                    Frecuencia Respiratoria
                  </Label>
                  <Input
                    id="respiratory_rate"
                    type="number"
                    value={formData.respiratory_rate}
                    onChange={(e) =>
                      handleInputChange("respiratory_rate", e.target.value)
                    }
                    placeholder="16"
                  />
                </div>
                <div>
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={formData.height}
                    onChange={(e) =>
                      handleInputChange("height", e.target.value)
                    }
                    placeholder="170"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) =>
                      handleInputChange("weight", e.target.value)
                    }
                    placeholder="70"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diagnóstico y Tratamiento */}
          <Card>
            <CardHeader>
              <CardTitle>Diagnóstico y Tratamiento</CardTitle>
              <CardDescription>
                Conclusiones y plan de tratamiento
              </CardDescription>
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
                  placeholder="Diagnóstico médico"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="treatment_plan">Plan de Tratamiento</Label>
                <Textarea
                  id="treatment_plan"
                  value={formData.treatment_plan}
                  onChange={(e) =>
                    handleInputChange("treatment_plan", e.target.value)
                  }
                  placeholder="Plan de tratamiento recomendado"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Observaciones adicionales"
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
              onClick={() => router.push("/dashboard/consultations")}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Guardando..." : "Crear Consulta"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
