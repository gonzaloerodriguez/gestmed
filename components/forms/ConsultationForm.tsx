"use client";

import { useState } from "react";
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
import { Save, Stethoscope, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import type { VitalSigns } from "@/lib/supabase/types/consultations";
import type { ConsultationFormProps } from "@/lib/supabase/types/forms/consultationform";

export function ConsultationForm({
  medicalHistoryId,
  doctorId,
  patient,
  onSuccess,
  onCancel,
}: ConsultationFormProps) {
  const [saving, setSaving] = useState(false);

  // Datos de la consulta
  const [consultationData, setConsultationData] = useState({
    reason_for_visit: "",
    symptoms: "",
    physical_examination: "",
    diagnosis: "",
    treatment_plan: "",
    follow_up_date: "",
    notes: "",
  });

  // Signos vitales
  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    weight: null,
    height: null,
    bp: "",
    temp: null,
    heart_rate: null,
    respiratory_rate: null,
  });

  const handleConsultationChange = (field: string, value: string) => {
    setConsultationData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVitalSignChange = (
    field: keyof VitalSigns,
    value: string | number | null
  ) => {
    setVitalSigns((prev) => ({ ...prev, [field]: value }));
  };

  const saveConsultation = async () => {
    if (!consultationData.reason_for_visit.trim()) {
      alert("El motivo de la consulta es requerido");
      return;
    }

    setSaving(true);

    try {
      // ✅ SOLUCIÓN: Preparar signos vitales de forma más específica
      const filteredVitalSigns: VitalSigns = {};

      // Manejar cada campo individualmente para evitar problemas de tipado
      if (vitalSigns.weight !== null && vitalSigns.weight !== undefined) {
        filteredVitalSigns.weight = vitalSigns.weight;
      }

      if (vitalSigns.height !== null && vitalSigns.height !== undefined) {
        filteredVitalSigns.height = vitalSigns.height;
      }

      if (vitalSigns.bp && vitalSigns.bp.trim() !== "") {
        filteredVitalSigns.bp = vitalSigns.bp;
      }

      if (vitalSigns.temp !== null && vitalSigns.temp !== undefined) {
        filteredVitalSigns.temp = vitalSigns.temp;
      }

      if (
        vitalSigns.heart_rate !== null &&
        vitalSigns.heart_rate !== undefined
      ) {
        filteredVitalSigns.heart_rate = vitalSigns.heart_rate;
      }

      if (
        vitalSigns.respiratory_rate !== null &&
        vitalSigns.respiratory_rate !== undefined
      ) {
        filteredVitalSigns.respiratory_rate = vitalSigns.respiratory_rate;
      }

      // Crear la consulta
      const { data: consultation, error } = await supabase
        .from("consultations")
        .insert({
          medical_history_id: medicalHistoryId,
          doctor_id: doctorId,
          consultation_date: new Date().toISOString(),
          reason_for_visit: consultationData.reason_for_visit,
          symptoms: consultationData.symptoms || null,
          physical_examination: consultationData.physical_examination || null,
          diagnosis: consultationData.diagnosis || null,
          treatment_plan: consultationData.treatment_plan || null,
          follow_up_date: consultationData.follow_up_date || null,
          notes: consultationData.notes || null,
          vital_signs:
            Object.keys(filteredVitalSigns).length > 0
              ? filteredVitalSigns
              : null,
        })
        .select()
        .single();

      if (error) throw error;

      alert("Consulta registrada exitosamente");
      onSuccess();
    } catch (error: any) {
      console.error("Error guardando consulta:", error);
      alert("Error guardando consulta: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Stethoscope className="h-5 w-5 mr-2" />
          Nueva Consulta - {patient.full_name}
        </CardTitle>
        <CardDescription>Registrar nueva consulta médica</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Información básica de la consulta */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="reason_for_visit">Motivo de la Consulta *</Label>
            <Input
              id="reason_for_visit"
              value={consultationData.reason_for_visit}
              onChange={(e) =>
                handleConsultationChange("reason_for_visit", e.target.value)
              }
              placeholder="¿Por qué viene el paciente?"
            />
          </div>

          <div>
            <Label htmlFor="symptoms">Síntomas Reportados</Label>
            <Textarea
              id="symptoms"
              value={consultationData.symptoms}
              onChange={(e) =>
                handleConsultationChange("symptoms", e.target.value)
              }
              placeholder="Síntomas que reporta el paciente"
              rows={3}
            />
          </div>
        </div>

        {/* Signos vitales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Activity className="h-5 w-5 mr-2" />
              Signos Vitales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={vitalSigns.weight || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleVitalSignChange(
                      "weight",
                      val ? Number.parseFloat(val) : null
                    );
                  }}
                  placeholder="70.5"
                />
              </div>
              <div>
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={vitalSigns.height || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleVitalSignChange(
                      "height",
                      val ? Number.parseInt(val) : null
                    );
                  }}
                  placeholder="175"
                />
              </div>
              <div>
                <Label htmlFor="bp">Presión Arterial</Label>
                <Input
                  id="bp"
                  value={vitalSigns.bp || ""}
                  onChange={(e) =>
                    handleVitalSignChange("bp", e.target.value || "")
                  }
                  placeholder="120/80"
                />
              </div>
              <div>
                <Label htmlFor="temp">Temperatura (°C)</Label>
                <Input
                  id="temp"
                  type="number"
                  step="0.1"
                  value={vitalSigns.temp || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleVitalSignChange(
                      "temp",
                      val ? Number.parseFloat(val) : null
                    );
                  }}
                  placeholder="36.5"
                />
              </div>
              <div>
                <Label htmlFor="heart_rate">Frecuencia Cardíaca</Label>
                <Input
                  id="heart_rate"
                  type="number"
                  value={vitalSigns.heart_rate || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleVitalSignChange(
                      "heart_rate",
                      val ? Number.parseInt(val) : null
                    );
                  }}
                  placeholder="72"
                />
              </div>
              <div>
                <Label htmlFor="respiratory_rate">
                  Frecuencia Respiratoria
                </Label>
                <Input
                  id="respiratory_rate"
                  type="number"
                  value={vitalSigns.respiratory_rate || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleVitalSignChange(
                      "respiratory_rate",
                      val ? Number.parseInt(val) : null
                    );
                  }}
                  placeholder="16"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Examen físico y diagnóstico */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="physical_examination">Examen Físico</Label>
            <Textarea
              id="physical_examination"
              value={consultationData.physical_examination}
              onChange={(e) =>
                handleConsultationChange("physical_examination", e.target.value)
              }
              placeholder="Hallazgos del examen físico"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="diagnosis">Diagnóstico</Label>
            <Textarea
              id="diagnosis"
              value={consultationData.diagnosis}
              onChange={(e) =>
                handleConsultationChange("diagnosis", e.target.value)
              }
              placeholder="Diagnóstico médico"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="treatment_plan">Plan de Tratamiento</Label>
            <Textarea
              id="treatment_plan"
              value={consultationData.treatment_plan}
              onChange={(e) =>
                handleConsultationChange("treatment_plan", e.target.value)
              }
              placeholder="Plan de tratamiento recomendado"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="follow_up_date">Fecha de Seguimiento</Label>
            <Input
              id="follow_up_date"
              type="date"
              value={consultationData.follow_up_date}
              onChange={(e) =>
                handleConsultationChange("follow_up_date", e.target.value)
              }
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              value={consultationData.notes}
              onChange={(e) =>
                handleConsultationChange("notes", e.target.value)
              }
              placeholder="Cualquier información adicional"
              rows={2}
            />
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex space-x-4">
          <Button
            onClick={saveConsultation}
            disabled={saving}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Guardando..." : "Guardar Consulta"}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
