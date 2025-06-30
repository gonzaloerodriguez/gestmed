"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, User, Calendar, Stethoscope } from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import type { ConsultationWithPatient } from "@/lib/supabase/types/consultations";
import type { Doctor } from "@/lib/supabase/types/doctor";
import type { Patient } from "@/lib/supabase/types/patient";

interface PrescriptionFromConsultationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultation: ConsultationWithPatient;
  patient: Patient;
  doctor: Doctor;
  medicalHistoryId: string;
  onSuccess: () => void;
}

export function PrescriptionFromConsultationDialog({
  open,
  onOpenChange,
  consultation,
  patient,
  doctor,
  medicalHistoryId,
  onSuccess,
}: PrescriptionFromConsultationDialogProps) {
  const router = useRouter();
  const { showSuccess, showError } = useToastEnhanced();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    diagnosis: consultation.diagnosis || "",
    medications: "",
    instructions: "",
    notes: "",
    date_prescribed: new Date().toISOString().split("T")[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpiar error cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.medications.trim()) {
      newErrors.medications = "Los medicamentos son obligatorios";
    }

    if (!formData.instructions.trim()) {
      newErrors.instructions = "Las instrucciones son obligatorias";
    }

    if (!formData.date_prescribed) {
      newErrors.date_prescribed = "La fecha de prescripción es obligatoria";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // Calcular edad si hay fecha de nacimiento
      let patientAge = null;
      if (patient.birth_date) {
        const birthDate = new Date(patient.birth_date);
        const today = new Date();
        patientAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          patientAge--;
        }
      }

      const prescriptionData = {
        doctor_id: doctor.id,
        medical_history_id: medicalHistoryId,
        consultation_id: consultation.id, // Asociar con la consulta
        patient_name: patient.full_name,
        patient_age: patientAge,
        patient_cedula: patient.cedula || null,
        patient_phone: patient.phone || null,
        patient_address: patient.address || null,
        diagnosis: formData.diagnosis.trim() || null,
        medications: formData.medications.trim(),
        instructions: formData.instructions.trim(),
        notes: formData.notes.trim() || null,
        date_prescribed: formData.date_prescribed,
        is_active: true,
      };

      const { data, error } = await supabase
        .from("prescriptions")
        .insert(prescriptionData)
        .select()
        .single();

      if (error) throw error;

      showSuccess(
        "¡Receta creada!",
        "La receta se ha creado exitosamente y está asociada a la consulta"
      );

      onSuccess();

      // Navegar a la receta creada
      router.push(`/dashboard/prescriptions/${data.id}`);
    } catch (error: any) {
      console.error("Error al crear receta:", error);
      showError(
        "Error al crear receta",
        "No se pudo crear la receta. Intenta nuevamente."
      );
    } finally {
      setSaving(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Save className="h-5 w-5 mr-2" />
            Crear Receta desde Consulta
          </DialogTitle>
          <DialogDescription>
            Crea una nueva receta basada en los datos de esta consulta médica
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información de contexto */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <p className="font-medium">{patient.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    CI: {patient.cedula || "No registrada"}
                  </p>
                  {patient.birth_date && (
                    <p className="text-sm text-muted-foreground">
                      {calculateAge(patient.birth_date)} años
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Consulta
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <p className="text-sm">
                    {new Date(
                      consultation.consultation_date
                    ).toLocaleDateString("es-ES")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {consultation.reason_for_visit}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center">
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Médico
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  <p className="font-medium">
                    {doctor.gender === "female" ? "Dra." : "Dr."}{" "}
                    {doctor.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {doctor.specialty || "Médico General"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulario de receta */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date_prescribed">
                  Fecha de Prescripción{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date_prescribed"
                  type="date"
                  value={formData.date_prescribed}
                  onChange={(e) =>
                    handleInputChange("date_prescribed", e.target.value)
                  }
                  className={errors.date_prescribed ? "border-destructive" : ""}
                  required
                />
                {errors.date_prescribed && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.date_prescribed}
                  </p>
                )}
              </div>
              <div className="flex items-end">
                <Badge variant="secondary" className="mb-2">
                  Asociada a consulta del{" "}
                  {new Date(consultation.consultation_date).toLocaleDateString(
                    "es-ES"
                  )}
                </Badge>
              </div>
            </div>

            <div>
              <Label htmlFor="diagnosis">Diagnóstico</Label>
              <Textarea
                id="diagnosis"
                value={formData.diagnosis}
                onChange={(e) => handleInputChange("diagnosis", e.target.value)}
                placeholder="Diagnóstico del paciente (pre-llenado desde la consulta)"
                rows={3}
                className={errors.diagnosis ? "border-destructive" : ""}
              />
              {errors.diagnosis && (
                <p className="text-sm text-destructive mt-1">
                  {errors.diagnosis}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="medications">
                Medicamentos <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="medications"
                value={formData.medications}
                onChange={(e) =>
                  handleInputChange("medications", e.target.value)
                }
                placeholder="Lista de medicamentos prescritos&#10;Ejemplo:&#10;- Paracetamol 500mg - 1 tableta cada 8 horas&#10;- Ibuprofeno 400mg - 1 tableta cada 12 horas"
                rows={6}
                className={errors.medications ? "border-destructive" : ""}
                required
              />
              {errors.medications && (
                <p className="text-sm text-destructive mt-1">
                  {errors.medications}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="instructions">
                Instrucciones <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) =>
                  handleInputChange("instructions", e.target.value)
                }
                placeholder="Instrucciones para el paciente&#10;Ejemplo:&#10;- Tomar con alimentos&#10;- Completar todo el tratamiento&#10;- Regresar en 7 días para control"
                rows={4}
                className={errors.instructions ? "border-destructive" : ""}
                required
              />
              {errors.instructions && (
                <p className="text-sm text-destructive mt-1">
                  {errors.instructions}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Notas adicionales o recomendaciones especiales"
                rows={3}
                className={errors.notes ? "border-destructive" : ""}
              />
              {errors.notes && (
                <p className="text-sm text-destructive mt-1">{errors.notes}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Crear Receta
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
