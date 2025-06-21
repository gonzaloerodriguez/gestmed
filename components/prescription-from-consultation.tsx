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
import { Badge } from "@/components/ui/badge";
import { Save, FileText, Calendar, User } from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { generatePrescriptionPDF } from "@/lib/pdf-generator";
import type { PrescriptionFromConsultationProps } from "@/lib/supabase/types/forms/prescriptionform";

export function PrescriptionFromConsultation({
  consultation,
  patient,
  doctor,
  medicalHistoryId,
  onSuccess,
  onCancel,
}: PrescriptionFromConsultationProps) {
  const [saving, setSaving] = useState(false);

  // Datos de la prescripción (pre-llenados desde la consulta)
  const [prescriptionData, setPrescriptionData] = useState({
    patient_name: patient.full_name,
    patient_age: patient.birth_date
      ? calculateAge(patient.birth_date).toString()
      : "",
    patient_cedula: patient.cedula || "",
    diagnosis: consultation.diagnosis || "",
    medications: "",
    instructions: "",
    notes: "",
  });

  function calculateAge(birthDate: string): number {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  }

  const handleChange = (field: string, value: string) => {
    setPrescriptionData((prev) => ({ ...prev, [field]: value }));
  };

  const savePrescription = async () => {
    if (!prescriptionData.medications.trim()) {
      alert("Los medicamentos son requeridos");
      return;
    }

    if (!prescriptionData.diagnosis.trim()) {
      alert("El diagnóstico es requerido");
      return;
    }

    setSaving(true);

    try {
      // Crear la prescripción
      const { data: prescription, error } = await supabase
        .from("prescriptions")
        .insert({
          consultation_id: consultation.id,
          medical_history_id: medicalHistoryId,
          doctor_id: doctor.id,
          patient_name: prescriptionData.patient_name,
          patient_age: prescriptionData.patient_age || null,
          patient_cedula: prescriptionData.patient_cedula || null,
          diagnosis: prescriptionData.diagnosis,
          medications: prescriptionData.medications,
          instructions: prescriptionData.instructions,
          notes: prescriptionData.notes || null,
          date_prescribed: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Generar PDF automáticamente
      try {
        const pdfBlob = await generatePrescriptionPDF(prescription, doctor);

        // Descargar PDF
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receta_${prescriptionData.patient_name.replace(
          /\s+/g,
          "_"
        )}_${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (pdfError) {
        console.error("Error generando PDF:", pdfError);
        // No fallar si el PDF no se puede generar
      }

      alert("Prescripción creada exitosamente");
      onSuccess();
    } catch (error: any) {
      console.error("Error guardando prescripción:", error);
      alert("Error guardando prescripción: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Nueva Prescripción
        </CardTitle>
        <CardDescription>
          Crear prescripción basada en la consulta médica
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Información de la consulta */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">
              Información de la Consulta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-blue-600" />
              <span className="text-sm">
                {new Date(consultation.consultation_date).toLocaleDateString(
                  "es-ES",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </span>
            </div>
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2 text-blue-600" />
              <span className="text-sm">{consultation.reason_for_visit}</span>
            </div>
            {consultation.symptoms && (
              <div>
                <Badge variant="secondary" className="text-xs">
                  Síntomas
                </Badge>
                <p className="text-sm mt-1">{consultation.symptoms}</p>
              </div>
            )}
            {consultation.physical_examination && (
              <div>
                <Badge variant="secondary" className="text-xs">
                  Examen Físico
                </Badge>
                <p className="text-sm mt-1">
                  {consultation.physical_examination}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Datos del paciente */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="patient_name">Nombre del Paciente</Label>
            <Input
              id="patient_name"
              value={prescriptionData.patient_name}
              onChange={(e) => handleChange("patient_name", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="patient_age">Edad</Label>
            <Input
              id="patient_age"
              value={prescriptionData.patient_age}
              onChange={(e) => handleChange("patient_age", e.target.value)}
              placeholder="35 años"
            />
          </div>
          <div>
            <Label htmlFor="patient_cedula">Cédula</Label>
            <Input
              id="patient_cedula"
              value={prescriptionData.patient_cedula}
              onChange={(e) => handleChange("patient_cedula", e.target.value)}
            />
          </div>
        </div>

        {/* Diagnóstico */}
        <div>
          <Label htmlFor="diagnosis">Diagnóstico *</Label>
          <Textarea
            id="diagnosis"
            value={prescriptionData.diagnosis}
            onChange={(e) => handleChange("diagnosis", e.target.value)}
            placeholder="Diagnóstico médico"
            rows={2}
          />
        </div>

        {/* Medicamentos */}
        <div>
          <Label htmlFor="medications">Medicamentos *</Label>
          <Textarea
            id="medications"
            value={prescriptionData.medications}
            onChange={(e) => handleChange("medications", e.target.value)}
            placeholder="Ej: Paracetamol 500mg - 1 comprimido cada 8 horas por 5 días"
            rows={4}
          />
        </div>

        {/* Instrucciones */}
        <div>
          <Label htmlFor="instructions">Instrucciones</Label>
          <Textarea
            id="instructions"
            value={prescriptionData.instructions}
            onChange={(e) => handleChange("instructions", e.target.value)}
            placeholder="Instrucciones para el paciente"
            rows={3}
          />
        </div>

        {/* Notas adicionales */}
        <div>
          <Label htmlFor="notes">Notas Adicionales</Label>
          <Textarea
            id="notes"
            value={prescriptionData.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Cualquier información adicional"
            rows={2}
          />
        </div>

        {/* Información de la fecha */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <strong>Fecha de prescripción:</strong>{" "}
            {new Date().toLocaleDateString("es-ES")} (se usará la fecha actual)
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex space-x-4">
          <Button
            onClick={savePrescription}
            disabled={saving}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Guardando..." : "Crear Prescripción y Generar PDF"}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
