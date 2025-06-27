"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Save, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import type { Doctor } from "@/lib/supabase/types/doctor";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import { useEditConsultationForm } from "@/hooks/use-edit-consultation-form";
import { DoctorInfoCard } from "@/components/consultation/doctor-info-card";
import { PatientSelectionCard } from "@/components/consultation/patient-selection-card";
import { ConsultationInfoCard } from "@/components/consultation/consultation-info-card";
import { VitalSignsCard } from "@/components/consultation/vital-signs-card";
import { DiagnosisTreatmentCard } from "@/components/consultation/diagnosis-treatment-card";

export default function EditConsultationPage() {
  const router = useRouter();
  const params = useParams();
  const consultationId = params.id as string;

  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  const { showError, showWarning, showSuccess } = useToastEnhanced();

  const {
    formData,
    selectedPatient,
    errors,
    touchedFields,
    loading: consultationLoading,
    consultation,
    handleInputChange,
    handlePatientSelect,
    markFieldAsTouched,
    validateAllFields,
    markAllFieldsAsTouched,
  } = useEditConsultationForm({ consultationId });

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
      showError("Error de carga", "No se pudieron cargar los datos del médico");
      router.push("/dashboard");
    } finally {
      setPageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!consultation) {
      showError("Error", "No se encontraron datos de la consulta");
      return;
    }

    // Marcar todos los campos como tocados
    markAllFieldsAsTouched();

    const { isValid, currentErrors } = await validateAllFields();

    if (!isValid) {
      const firstErrorKey = Object.keys(
        currentErrors
      )[0] as keyof typeof currentErrors;
      const firstErrorMessage = currentErrors[firstErrorKey];

      if (currentErrors.selectedPatient) {
        showWarning("Paciente Requerido", currentErrors.selectedPatient);
      } else if (currentErrors.reason_for_visit) {
        showWarning(
          "Motivo de Consulta Requerido",
          currentErrors.reason_for_visit
        );
      } else {
        showWarning(
          "Datos Incompletos",
          firstErrorMessage || "Por favor, corrija los errores en el formulario"
        );
      }
      return;
    }

    if (!doctor || !selectedPatient) {
      showError("Error", "Faltan datos necesarios para actualizar la consulta");
      return;
    }

    setSaving(true);
    try {
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

      // Actualizar consulta
      const consultationData = {
        consultation_date: formData.consultation_date,
        reason_for_visit: formData.reason_for_visit.trim(),
        symptoms: formData.symptoms.trim() || null,
        physical_examination: formData.physical_examination.trim() || null,
        diagnosis: formData.diagnosis.trim() || null,
        treatment_plan: formData.treatment_plan.trim() || null,
        follow_up_date: formData.follow_up_date || null,
        notes: formData.notes.trim() || null,
        vital_signs: JSON.stringify(vitalSigns),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("consultations")
        .update(consultationData)
        .eq("id", consultationId);

      if (error) throw error;

      showSuccess(
        "Consulta Actualizada",
        `La consulta para ${selectedPatient.full_name} se ha actualizado exitosamente`
      );

      // Redirigir después de un momento
      setTimeout(() => {
        router.push(`/dashboard/consultations/${consultationId}`);
      }, 1500);
    } catch (error: any) {
      console.error("Error al actualizar consulta:", error);
      if (error.message.includes("duplicate key")) {
        showError(
          "Consulta Duplicada",
          "Ya existe una consulta similar. Verifica los datos ingresados."
        );
      } else if (error.message.includes("foreign key")) {
        showError(
          "Error de Referencia",
          "Hay un problema con los datos relacionados. Contacta al administrador."
        );
      } else {
        showError(
          "Error al Actualizar Consulta",
          error.message || "Ha ocurrido un error inesperado"
        );
      }
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading || consultationLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando consulta...</p>
        </div>
      </div>
    );
  }

  if (!doctor || !consultation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error al cargar datos de la consulta</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Editar Consulta</h1>
          <p className="text-gray-600">
            Modificar los datos de la consulta médica
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          <DoctorInfoCard doctor={doctor} />

          <PatientSelectionCard
            selectedPatient={selectedPatient}
            onPatientSelect={handlePatientSelect}
            errors={errors}
            touchedFields={touchedFields}
          />

          <ConsultationInfoCard
            formData={formData}
            errors={errors}
            touchedFields={touchedFields}
            saving={saving}
            onInputChange={handleInputChange}
            onFieldTouch={markFieldAsTouched}
          />

          <VitalSignsCard
            formData={formData}
            errors={errors}
            touchedFields={touchedFields}
            saving={saving}
            onInputChange={handleInputChange}
            onFieldTouch={markFieldAsTouched}
          />

          <DiagnosisTreatmentCard
            formData={formData}
            errors={errors}
            touchedFields={touchedFields}
            saving={saving}
            onInputChange={handleInputChange}
            onFieldTouch={markFieldAsTouched}
          />

          {/* Botones de Acción */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(`/dashboard/consultations/${consultationId}`)
              }
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Guardando..." : "Actualizar Consulta"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
