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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import type { Doctor } from "@/lib/supabase/types/doctor";
import type { MedicalSpecialty } from "@/lib/supabase/types/medicalspeciality";

interface PersonalDataTabProps {
  doctor: Doctor;
  specialties: MedicalSpecialty[];
  onSuccess: () => void;
  updateUserData: (updates: Partial<Doctor>) => void;
}

interface ValidationErrors {
  [key: string]: string;
}

export function PersonalDataTab({
  doctor,
  specialties,
  onSuccess,
  updateUserData,
}: PersonalDataTabProps) {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const { showSuccess, showError } = useToastEnhanced();

  const [personalData, setPersonalData] = useState({
    full_name: doctor.full_name || "",
    email: doctor.email || "",
    specialty: doctor.specialty || "",
    license_number: doctor.license_number || "",
  });

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case "full_name":
        if (!value.trim()) return "El nombre completo es requerido";
        if (value.trim().length < 2)
          return "El nombre debe tener al menos 2 caracteres";
        return "";

      case "email":
        if (!value.trim()) return "El correo electrónico es requerido";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value))
          return "Formato de correo electrónico inválido";
        return "";

      case "license_number":
        if (!value.trim()) return "El número de matrícula es requerido";
        if (value.trim().length < 3)
          return "El número de matrícula debe tener al menos 3 caracteres";
        return "";

      default:
        return "";
    }
  };

  const handlePersonalDataChange = (field: string, value: string) => {
    setPersonalData((prev) => ({ ...prev, [field]: value }));

    // Validar campo en tiempo real
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const validateAllFields = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.entries(personalData).forEach(([field, value]) => {
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const savePersonalData = async () => {
    if (!validateAllFields()) {
      showError(
        "Datos incompletos",
        "Por favor corrige los errores antes de continuar"
      );
      return;
    }

    setSaving(true);
    try {
      // Actualización optimista - UI se actualiza inmediatamente
      updateUserData({
        full_name: personalData.full_name,
        email: personalData.email,
        specialty: personalData.specialty,
        license_number: personalData.license_number,
      });

      const { error } = await supabase
        .from("doctors")
        .update({
          full_name: personalData.full_name.trim(),
          email: personalData.email.trim(),
          specialty: personalData.specialty || null,
          license_number: personalData.license_number.trim(),
        })
        .eq("id", doctor.id);

      if (error) {
        // Si falla, revertir cambios
        updateUserData(doctor);
        throw error;
      }

      // Actualizar email en Auth si cambió
      if (personalData.email !== doctor.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: personalData.email.trim(),
        });
        if (authError) throw authError;
      }

      showSuccess(
        "Datos actualizados",
        "Tu información personal ha sido actualizada correctamente"
      );
      onSuccess();
    } catch (error: any) {
      showError(
        "Error al actualizar",
        error.message || "Ha ocurrido un error inesperado"
      );
    } finally {
      setSaving(false);
    }
  };

  const ErrorMessage = ({ error }: { error: string }) =>
    error ? (
      <div className="flex items-center gap-1 text-destructive text-sm mt-1">
        <AlertCircle className="h-3 w-3" />
        <span>{error}</span>
      </div>
    ) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información Personal</CardTitle>
        <CardDescription>
          Actualiza tu información personal y profesional
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="full_name">
              Nombre Completo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full_name"
              value={personalData.full_name}
              onChange={(e) =>
                handlePersonalDataChange("full_name", e.target.value)
              }
              className={errors.full_name ? "border-destructive" : ""}
              placeholder="Ingresa tu nombre completo"
            />
            <ErrorMessage error={errors.full_name} />
          </div>

          <div>
            <Label htmlFor="email">
              Correo Electrónico <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={personalData.email}
              onChange={(e) =>
                handlePersonalDataChange("email", e.target.value)
              }
              className={errors.email ? "border-destructive" : ""}
              placeholder="tu@correo.com"
            />
            <ErrorMessage error={errors.email} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="license_number">
              Número de Matrícula <span className="text-destructive">*</span>
            </Label>
            <Input
              id="license_number"
              value={personalData.license_number}
              onChange={(e) =>
                handlePersonalDataChange("license_number", e.target.value)
              }
              className={errors.license_number ? "border-destructive" : ""}
              placeholder="Número de matrícula profesional"
            />
            <ErrorMessage error={errors.license_number} />
          </div>

          <div>
            <Label htmlFor="specialty">Especialidad</Label>
            <Select
              value={personalData.specialty}
              onValueChange={(value) =>
                handlePersonalDataChange("specialty", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar especialidad" />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty.id} value={specialty.name}>
                    {specialty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={savePersonalData} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
