"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, User, UserCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import type { PatientFormProps } from "@/lib/supabase/types/forms/patientform";
import type { Patient } from "@/lib/supabase/types/patient";
import {
  patientSchema,
  representativeSchema,
  type PatientFormData,
  type RepresentativeFormData,
} from "@/lib/validation/patient-schema";

interface ValidationErrors {
  [key: string]: string;
}

export function PatientForm({
  doctorId,
  onSuccess,
  onCancel,
  patient,
  representative,
  medicalHistory,
}: PatientFormProps) {
  const [saving, setSaving] = useState(false);
  const [hasRepresentative, setHasRepresentative] = useState(!!representative);
  const [currentStep, setCurrentStep] = useState("patient");

  // Estados de datos
  const [patientData, setPatientData] = useState<PatientFormData>({
    full_name: patient?.full_name || "",
    cedula: patient?.cedula || "",
    phone: patient?.phone || "",
    address: patient?.address || "",
    birth_date: patient?.birth_date || "",
  });

  const [representativeData, setRepresentativeData] =
    useState<RepresentativeFormData>({
      full_name: representative?.full_name || "",
      relationship: representative?.relationship || "",
      cedula: representative?.cedula || "",
      phone: representative?.phone || "",
      email: representative?.email || "",
      address: representative?.address || "",
    });

  const [medicalData, setMedicalData] = useState({
    blood_type: medicalHistory?.blood_type || "",
    allergies: medicalHistory?.allergies || "",
    chronic_conditions: medicalHistory?.chronic_conditions || "",
    current_medications: medicalHistory?.current_medications || "",
    family_history: medicalHistory?.family_history || "",
    notes: medicalHistory?.notes || "",
  });

  // Estados de errores
  const [patientErrors, setPatientErrors] = useState<ValidationErrors>({});
  const [representativeErrors, setRepresentativeErrors] =
    useState<ValidationErrors>({});

  // Estados de validación de campos
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Limpiar errores del representante cuando se desactiva
  useEffect(() => {
    if (!hasRepresentative) {
      setRepresentativeErrors({});
      setRepresentativeData({
        full_name: "",
        relationship: "",
        cedula: "",
        phone: "",
        email: "",
        address: "",
      });
    }
  }, [hasRepresentative]);

  // Función para calcular edad
  const calculateAge = useCallback((birthDate: string): number => {
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
  }, []);

  const isMinor = patientData.birth_date
    ? calculateAge(patientData.birth_date) < 18
    : false;

  // Validación individual de campos del paciente
  const validatePatientField = useCallback(
    async (field: keyof PatientFormData, value: string) => {
      try {
        await patientSchema.validateAt(field, {
          ...patientData,
          [field]: value,
        });
        setPatientErrors((prev) => ({ ...prev, [field]: "" }));
        return true;
      } catch (error: any) {
        setPatientErrors((prev) => ({ ...prev, [field]: error.message }));
        return false;
      }
    },
    [patientData]
  );

  // Validación individual de campos del representante
  const validateRepresentativeField = useCallback(
    async (field: keyof RepresentativeFormData, value: string) => {
      try {
        await representativeSchema.validateAt(
          field,
          { ...representativeData, [field]: value },
          { context: { isRequired: hasRepresentative && isMinor } }
        );
        setRepresentativeErrors((prev) => ({ ...prev, [field]: "" }));
        return true;
      } catch (error: any) {
        setRepresentativeErrors((prev) => ({
          ...prev,
          [field]: error.message,
        }));
        return false;
      }
    },
    [representativeData, hasRepresentative, isMinor]
  );

  // Manejadores de cambio con validación en tiempo real
  const handlePatientChange = useCallback(
    (field: keyof PatientFormData, value: string) => {
      setPatientData((prev) => ({ ...prev, [field]: value }));
      setTouchedFields((prev) => new Set(prev).add(`patient.${field}`));

      // Validar después de un pequeño delay para mejor UX
      const timeoutId = setTimeout(() => {
        validatePatientField(field, value);
      }, 300);

      return () => clearTimeout(timeoutId);
    },
    [validatePatientField]
  );

  const handleRepresentativeChange = useCallback(
    (field: keyof RepresentativeFormData, value: string) => {
      setRepresentativeData((prev) => ({ ...prev, [field]: value }));
      setTouchedFields((prev) => new Set(prev).add(`representative.${field}`));

      // Validar después de un pequeño delay para mejor UX
      const timeoutId = setTimeout(() => {
        validateRepresentativeField(field, value);
      }, 300);

      return () => clearTimeout(timeoutId);
    },
    [validateRepresentativeField]
  );

  const handleMedicalChange = useCallback((field: string, value: string) => {
    setMedicalData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Validación completa antes de guardar
  const validateAllFields = async (): Promise<boolean> => {
    let isValid = true;

    // Validar datos del paciente
    try {
      await patientSchema.validate(patientData, { abortEarly: false });
      setPatientErrors({});
    } catch (error: any) {
      const errors: ValidationErrors = {};
      error.inner.forEach((err: any) => {
        errors[err.path] = err.message;
      });
      setPatientErrors(errors);
      isValid = false;
    }

    // Validar datos del representante si es necesario
    if (hasRepresentative) {
      try {
        await representativeSchema.validate(representativeData, {
          abortEarly: false,
          context: { isRequired: isMinor },
        });
        setRepresentativeErrors({});
      } catch (error: any) {
        const errors: ValidationErrors = {};
        error.inner.forEach((err: any) => {
          errors[err.path] = err.message;
        });
        setRepresentativeErrors(errors);
        isValid = false;
      }
    }

    return isValid;
  };

  // Función para guardar paciente
  const savePatient = async () => {
    const isValid = await validateAllFields();

    if (!isValid) {
      // Cambiar al primer tab con errores
      if (Object.keys(patientErrors).length > 0) {
        setCurrentStep("patient");
      } else if (Object.keys(representativeErrors).length > 0) {
        setCurrentStep("representative");
      }
      return;
    }

    setSaving(true);

    try {
      let currentPatient = patient as Patient | null;

      // Helper function para convertir strings vacíos a null
      const emptyToNull = (value: string) =>
        value.trim() === "" ? null : value;

      // 1. Crear o actualizar paciente
      if (patient) {
        const { data, error } = await supabase
          .from("patients")
          .update({
            full_name: patientData.full_name,
            cedula: emptyToNull(patientData.cedula),
            phone: emptyToNull(patientData.phone),
            address: emptyToNull(patientData.address),
            birth_date: emptyToNull(patientData.birth_date),
          })
          .eq("id", patient.id)
          .select()
          .single();

        if (error) throw error;
        currentPatient = data;
      } else {
        const { data, error } = await supabase
          .from("patients")
          .insert({
            doctor_id: doctorId,
            full_name: patientData.full_name,
            cedula: emptyToNull(patientData.cedula),
            phone: emptyToNull(patientData.phone),
            address: emptyToNull(patientData.address),
            birth_date: emptyToNull(patientData.birth_date),
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        currentPatient = data;
      }

      if (!currentPatient) throw new Error("No se pudo obtener el paciente");

      // 2. Manejar representante
      if (
        hasRepresentative &&
        representativeData.full_name &&
        representativeData.full_name.trim()
      ) {
        if (representative) {
          const { error } = await supabase
            .from("patient_representatives")
            .update({
              full_name: representativeData.full_name,
              relationship: representativeData.relationship,
              cedula: emptyToNull(representativeData.cedula),
              phone: emptyToNull(representativeData.phone),
              email: emptyToNull(representativeData.email),
              address: emptyToNull(representativeData.address),
            })
            .eq("id", representative.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("patient_representatives")
            .insert({
              patient_id: currentPatient.id,
              full_name: representativeData.full_name,
              relationship: representativeData.relationship,
              cedula: emptyToNull(representativeData.cedula),
              phone: emptyToNull(representativeData.phone),
              email: emptyToNull(representativeData.email),
              address: emptyToNull(representativeData.address),
              is_primary: true,
            });

          if (error) throw error;
        }
      } else if (representative) {
        // Eliminar representante existente si se desmarca
        const { error } = await supabase
          .from("patient_representatives")
          .delete()
          .eq("id", representative.id);

        if (error) throw error;
      }

      // 3. Actualizar historia clínica
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { error: historyError } = await supabase
        .from("medical_histories")
        .update({
          blood_type: medicalData.blood_type || null,
          allergies: medicalData.allergies || null,
          chronic_conditions: medicalData.chronic_conditions || null,
          current_medications: medicalData.current_medications || null,
          family_history: medicalData.family_history || null,
          notes: medicalData.notes || null,
        })
        .eq("patient_id", currentPatient.id);

      if (historyError) {
        console.warn("Error actualizando historia clínica:", historyError);
      }

      onSuccess(currentPatient);
    } catch (error: any) {
      console.error("Error guardando paciente:", error);
      alert("Error guardando paciente: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Navegación entre pasos
  const steps = ["patient", "representative", "medical"] as const;
  const stepIndex = steps.indexOf(currentStep as (typeof steps)[number]);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    const idx = steps.indexOf(currentStep as (typeof steps)[number]);
    if (idx < steps.length - 1) {
      setCurrentStep(steps[idx + 1]);
    }
  };

  const handlePrevious = () => {
    const idx = steps.indexOf(currentStep as (typeof steps)[number]);
    if (idx > 0) {
      setCurrentStep(steps[idx - 1]);
    }
  };

  // Componente para mostrar errores
  const ErrorMessage = ({ error }: { error: string }) =>
    error ? (
      <div className="flex items-center gap-1 text-destructive text-sm mt-1">
        <AlertCircle className="h-3 w-3" />
        <span>{error}</span>
      </div>
    ) : null;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="h-5 w-5 mr-2" />
          {patient ? "Editar Paciente" : "Nuevo Paciente"}
        </CardTitle>
        <CardDescription>
          {patient
            ? "Actualizar la información del paciente"
            : "Crear un nuevo paciente con su historia clínica inicial"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Barra de progreso */}
        <div className="mb-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center mt-2 text-muted-foreground">
            Paso {stepIndex + 1} de {steps.length}
          </p>
        </div>

        <Tabs
          value={currentStep}
          onValueChange={setCurrentStep}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="patient" className="text-xs sm:text-sm">
              1. Datos del Paciente
            </TabsTrigger>
            <TabsTrigger value="representative" className="text-xs sm:text-sm">
              2. Representante
            </TabsTrigger>
            <TabsTrigger value="medical" className="text-xs sm:text-sm">
              3. Historia Clínica
            </TabsTrigger>
          </TabsList>

          {/* Tab: Datos del Paciente */}
          <TabsContent value="patient" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">
                  Nombre Completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="full_name"
                  value={patientData.full_name}
                  onChange={(e) =>
                    handlePatientChange("full_name", e.target.value)
                  }
                  placeholder="Nombre completo del paciente"
                  className={
                    patientErrors.full_name ? "border-destructive" : ""
                  }
                />
                <ErrorMessage error={patientErrors.full_name} />
              </div>

              <div>
                <Label htmlFor="cedula">Cédula de Identidad</Label>
                <Input
                  id="cedula"
                  value={patientData.cedula}
                  onChange={(e) =>
                    handlePatientChange("cedula", e.target.value)
                  }
                  placeholder="Número de cédula"
                  className={patientErrors.cedula ? "border-destructive" : ""}
                />
                <ErrorMessage error={patientErrors.cedula} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={patientData.phone}
                  onChange={(e) => handlePatientChange("phone", e.target.value)}
                  placeholder="Número de teléfono"
                  className={patientErrors.phone ? "border-destructive" : ""}
                />
                <ErrorMessage error={patientErrors.phone} />
              </div>

              <div>
                <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={patientData.birth_date}
                  onChange={(e) =>
                    handlePatientChange("birth_date", e.target.value)
                  }
                  className={
                    patientErrors.birth_date ? "border-destructive" : ""
                  }
                />
                <ErrorMessage error={patientErrors.birth_date} />
                {patientData.birth_date && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Edad: {calculateAge(patientData.birth_date)} años
                    {isMinor && " (menor de edad)"}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="address">Dirección</Label>
              <Textarea
                id="address"
                value={patientData.address}
                onChange={(e) => handlePatientChange("address", e.target.value)}
                placeholder="Dirección completa"
                rows={2}
                className={patientErrors.address ? "border-destructive" : ""}
              />
              <ErrorMessage error={patientErrors.address} />
            </div>

            {isMinor && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_representative"
                    checked={hasRepresentative}
                    onCheckedChange={(checked) =>
                      setHasRepresentative(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="has_representative"
                    className="text-amber-800"
                  >
                    Este paciente es menor de edad y requiere un representante
                    legal
                  </Label>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab: Representante */}
          <TabsContent value="representative" className="space-y-4">
            {!isMinor && !hasRepresentative ? (
              <div className="text-center py-8">
                <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  El paciente es mayor de edad. No se requiere representante
                  legal.
                </p>
                <div className="flex items-center space-x-2 justify-center">
                  <Checkbox
                    id="add_representative_adult"
                    checked={hasRepresentative}
                    onCheckedChange={(checked) =>
                      setHasRepresentative(checked as boolean)
                    }
                  />
                  <Label htmlFor="add_representative_adult">
                    Agregar representante o contacto de emergencia (opcional)
                  </Label>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rep_full_name">
                      Nombre Completo{" "}
                      {isMinor && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="rep_full_name"
                      value={representativeData.full_name}
                      onChange={(e) =>
                        handleRepresentativeChange("full_name", e.target.value)
                      }
                      placeholder="Nombre del representante"
                      className={
                        representativeErrors.full_name
                          ? "border-destructive"
                          : ""
                      }
                    />
                    <ErrorMessage error={representativeErrors.full_name} />
                  </div>

                  <div>
                    <Label htmlFor="relationship">
                      Parentesco{" "}
                      {isMinor && <span className="text-destructive">*</span>}
                    </Label>
                    <Select
                      value={representativeData.relationship}
                      onValueChange={(value) =>
                        handleRepresentativeChange("relationship", value)
                      }
                    >
                      <SelectTrigger
                        className={
                          representativeErrors.relationship
                            ? "border-destructive"
                            : ""
                        }
                      >
                        <SelectValue placeholder="Seleccionar parentesco" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="padre">Padre</SelectItem>
                        <SelectItem value="madre">Madre</SelectItem>
                        <SelectItem value="tutor">Tutor Legal</SelectItem>
                        <SelectItem value="abuelo">Abuelo/a</SelectItem>
                        <SelectItem value="tio">Tío/a</SelectItem>
                        <SelectItem value="hermano">Hermano/a</SelectItem>
                        <SelectItem value="contacto_emergencia">
                          Contacto de Emergencia
                        </SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <ErrorMessage error={representativeErrors.relationship} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rep_cedula">Cédula</Label>
                    <Input
                      id="rep_cedula"
                      value={representativeData.cedula}
                      onChange={(e) =>
                        handleRepresentativeChange("cedula", e.target.value)
                      }
                      placeholder="Cédula del representante"
                      className={
                        representativeErrors.cedula ? "border-destructive" : ""
                      }
                    />
                    <ErrorMessage error={representativeErrors.cedula} />
                  </div>

                  <div>
                    <Label htmlFor="rep_phone">Teléfono</Label>
                    <Input
                      id="rep_phone"
                      value={representativeData.phone}
                      onChange={(e) =>
                        handleRepresentativeChange("phone", e.target.value)
                      }
                      placeholder="Teléfono del representante"
                      className={
                        representativeErrors.phone ? "border-destructive" : ""
                      }
                    />
                    <ErrorMessage error={representativeErrors.phone} />
                  </div>
                </div>

                <div>
                  <Label htmlFor="rep_email">Correo Electrónico</Label>
                  <Input
                    id="rep_email"
                    type="email"
                    value={representativeData.email}
                    onChange={(e) =>
                      handleRepresentativeChange("email", e.target.value)
                    }
                    placeholder="Email del representante"
                    className={
                      representativeErrors.email ? "border-destructive" : ""
                    }
                  />
                  <ErrorMessage error={representativeErrors.email} />
                </div>

                <div>
                  <Label htmlFor="rep_address">Dirección</Label>
                  <Textarea
                    id="rep_address"
                    value={representativeData.address}
                    onChange={(e) =>
                      handleRepresentativeChange("address", e.target.value)
                    }
                    placeholder="Dirección del representante"
                    rows={2}
                    className={
                      representativeErrors.address ? "border-destructive" : ""
                    }
                  />
                  <ErrorMessage error={representativeErrors.address} />
                </div>
              </>
            )}
          </TabsContent>

          {/* Tab: Historia Clínica */}
          <TabsContent value="medical" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="blood_type">Tipo de Sangre</Label>
                <Select
                  value={medicalData.blood_type}
                  onValueChange={(value) =>
                    handleMedicalChange("blood_type", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo de sangre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="allergies">Alergias Conocidas</Label>
              <Textarea
                id="allergies"
                value={medicalData.allergies}
                onChange={(e) =>
                  handleMedicalChange("allergies", e.target.value)
                }
                placeholder="Describir alergias conocidas (medicamentos, alimentos, etc.)"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="chronic_conditions">Condiciones Crónicas</Label>
              <Textarea
                id="chronic_conditions"
                value={medicalData.chronic_conditions}
                onChange={(e) =>
                  handleMedicalChange("chronic_conditions", e.target.value)
                }
                placeholder="Enfermedades crónicas o condiciones médicas permanentes"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="current_medications">Medicamentos Actuales</Label>
              <Textarea
                id="current_medications"
                value={medicalData.current_medications}
                onChange={(e) =>
                  handleMedicalChange("current_medications", e.target.value)
                }
                placeholder="Medicamentos que toma actualmente"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="family_history">Antecedentes Familiares</Label>
              <Textarea
                id="family_history"
                value={medicalData.family_history}
                onChange={(e) =>
                  handleMedicalChange("family_history", e.target.value)
                }
                placeholder="Enfermedades hereditarias o antecedentes familiares relevantes"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={medicalData.notes}
                onChange={(e) => handleMedicalChange("notes", e.target.value)}
                placeholder="Cualquier información adicional relevante"
                rows={3}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Botones de navegación */}
        <div className="flex justify-between items-center mt-6 gap-4">
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={saving}
              >
                Anterior
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>

            {currentStep === "medical" ? (
              <Button onClick={savePatient} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving
                  ? "Guardando..."
                  : patient
                    ? "Guardar Cambios"
                    : "Crear Paciente"}
              </Button>
            ) : (
              <Button onClick={handleNext}>Siguiente</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// "use client";

// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Checkbox } from "@/components/ui/checkbox";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Save, User, UserCheck } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import type { PatientFormProps } from "@/lib/supabase/types/forms/patientform";
// import type { Patient } from "@/lib/supabase/types/patient";

// export function PatientForm({
//   doctorId,
//   onSuccess,
//   onCancel,
//   patient,
//   representative,
//   medicalHistory,
// }: PatientFormProps) {
//   const [saving, setSaving] = useState(false);
//   const [hasRepresentative, setHasRepresentative] = useState(!!representative);

//   // Datos del paciente
//   const [patientData, setPatientData] = useState({
//     full_name: patient?.full_name || "",
//     cedula: patient?.cedula || "",
//     phone: patient?.phone || "",
//     address: patient?.address || "",
//     birth_date: patient?.birth_date || "",
//   });

//   // Datos del representante
//   const [representativeData, setRepresentativeData] = useState({
//     full_name: representative?.full_name || "",
//     relationship: representative?.relationship || "",
//     cedula: representative?.cedula || "",
//     phone: representative?.phone || "",
//     email: representative?.email || "",
//     address: representative?.address || "",
//   });

//   // Datos de historia clínica inicial
//   const [medicalData, setMedicalData] = useState({
//     blood_type: medicalHistory?.blood_type || "",
//     allergies: medicalHistory?.allergies || "",
//     chronic_conditions: medicalHistory?.chronic_conditions || "",
//     current_medications: medicalHistory?.current_medications || "",
//     family_history: medicalHistory?.family_history || "",
//     notes: medicalHistory?.notes || "",
//   });

//   const handlePatientChange = (field: string, value: string) => {
//     setPatientData((prev) => ({ ...prev, [field]: value }));
//   };

//   const handleRepresentativeChange = (field: string, value: string) => {
//     setRepresentativeData((prev) => ({ ...prev, [field]: value }));
//   };

//   const handleMedicalChange = (field: string, value: string) => {
//     setMedicalData((prev) => ({ ...prev, [field]: value }));
//   };

//   // Calcular edad basada en fecha de nacimiento
//   const calculateAge = (birthDate: string): number => {
//     if (!birthDate) return 0;
//     const today = new Date();
//     const birth = new Date(birthDate);
//     let age = today.getFullYear() - birth.getFullYear();
//     const monthDiff = today.getMonth() - birth.getMonth();
//     if (
//       monthDiff < 0 ||
//       (monthDiff === 0 && today.getDate() < birth.getDate())
//     ) {
//       age--;
//     }
//     return age;
//   };

//   const isMinor = patientData.birth_date
//     ? calculateAge(patientData.birth_date) < 18
//     : false;

//   const savePatient = async () => {
//     if (!patientData.full_name.trim()) {
//       alert("El nombre del paciente es requerido");
//       return;
//     }

//     if (isMinor && hasRepresentative && !representativeData.full_name.trim()) {
//       alert("El nombre del representante es requerido para menores de edad");
//       return;
//     }

//     setSaving(true);

//     try {
//       let currentPatient = patient as Patient | null;
//       if (patient) {
//         // Actualizar paciente existente
//         const { data, error } = await supabase
//           .from("patients")
//           .update({
//             full_name: patientData.full_name,
//             cedula: patientData.cedula || null,
//             phone: patientData.phone || null,
//             address: patientData.address || null,
//             birth_date: patientData.birth_date || null,
//           })
//           .eq("id", patient.id)
//           .select()
//           .single();
//         if (error) throw error;
//         currentPatient = data;
//       } else {
//         // Crear nuevo paciente
//         const { data, error } = await supabase
//           .from("patients")
//           .insert({
//             doctor_id: doctorId,
//             full_name: patientData.full_name,
//             cedula: patientData.cedula || null,
//             phone: patientData.phone || null,
//             address: patientData.address || null,
//             birth_date: patientData.birth_date || null,
//             is_active: true,
//           })
//           .select()
//           .single();
//         if (error) throw error;
//         currentPatient = data;
//       }

//       if (!currentPatient) throw new Error("No se pudo obtener paciente");
//       // 2. Crear representante si es necesario
//       if (hasRepresentative && representativeData.full_name.trim()) {
//         if (representative) {
//           const { error } = await supabase
//             .from("patient_representatives")
//             .update({
//               full_name: representativeData.full_name,
//               relationship: representativeData.relationship,
//               cedula: representativeData.cedula || null,
//               phone: representativeData.phone || null,
//               email: representativeData.email || null,
//               address: representativeData.address || null,
//             })
//             .eq("id", representative.id);
//           if (error) throw error;
//         } else {
//           const { error } = await supabase
//             .from("patient_representatives")
//             .insert({
//               patient_id: currentPatient.id,
//               full_name: representativeData.full_name,
//               relationship: representativeData.relationship,
//               cedula: representativeData.cedula || null,
//               phone: representativeData.phone || null,
//               email: representativeData.email || null,
//               address: representativeData.address || null,
//               is_primary: true,
//             });
//           if (error) throw error;
//         }
//       } else if (representative) {
//         // Eliminar representante existente si se desmarca
//         const { error } = await supabase
//           .from("patient_representatives")
//           .delete()
//           .eq("id", representative.id);
//         if (error) throw error;
//       }

//       // 3. Actualizar historia clínica (se crea automáticamente por trigger)

//       await new Promise((resolve) => setTimeout(resolve, 500));

//       const { error: historyError } = await supabase
//         .from("medical_histories")
//         .update({
//           blood_type: medicalData.blood_type || null,
//           allergies: medicalData.allergies || null,
//           chronic_conditions: medicalData.chronic_conditions || null,
//           current_medications: medicalData.current_medications || null,
//           family_history: medicalData.family_history || null,
//           notes: medicalData.notes || null,
//         })
//         .eq("patient_id", currentPatient.id);

//       if (historyError) {
//         console.warn("Error actualizando historia clínica:");
//       }

//       alert(patient ? "Paciente actualizado" : "Paciente creado exitosamente");
//       onSuccess(currentPatient);
//     } catch (error: any) {
//       console.error("Error creando paciente:", error);
//       alert("Error creando paciente: " + error.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const [currentStep, setCurrentStep] = useState("patient");
//   const steps = ["patient", "representative", "medical"] as const;

//   const handleNext = () => {
//     const idx = steps.indexOf(currentStep as (typeof steps)[number]);
//     if (idx < steps.length - 1) {
//       setCurrentStep(steps[idx + 1]);
//     }
//   };

//   const stepIndex = steps.indexOf(currentStep as (typeof steps)[number]);
//   const progress = ((stepIndex + 1) / steps.length) * 100;

//   return (
//     <Card className="w-full max-w-4xl mx-auto">
//       <CardHeader>
//         <CardTitle className="flex items-center">
//           <User className="h-5 w-5 mr-2" />
//           {patient ? "Editar Paciente" : "Nuevo Paciente"}
//         </CardTitle>
//         <CardDescription>
//           {patient
//             ? "Actualizar la información del paciente"
//             : "Crear un nuevo paciente con su historia clínica inicial"}
//         </CardDescription>
//       </CardHeader>
//       <CardContent>
//         {/* <Tabs defaultValue="patient" className="space-y-6"> */}
//         <div className="mb-4">
//           <div className="h-2 bg-gray-200 rounded">
//             <div
//               className="bg-blue-600 h-full rounded transition-all"
//               style={{ width: `${progress}%` }}
//             ></div>
//           </div>
//           <p className="text-sm text-center mt-2">
//             Paso {stepIndex + 1} de {steps.length}
//           </p>
//         </div>
//         <Tabs
//           value={currentStep}
//           onValueChange={setCurrentStep}
//           className="space-y-6"
//         >
//           <TabsList className="grid w-full grid-cols-3">
//             <TabsTrigger value="patient">1. Datos del Paciente</TabsTrigger>
//             <TabsTrigger value="representative">2. Representante</TabsTrigger>
//             <TabsTrigger value="medical">3. Historia Clínica</TabsTrigger>
//           </TabsList>

//           {/* Tab: Datos del Paciente */}
//           <TabsContent value="patient" className="space-y-4">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <Label htmlFor="full_name">Nombre Completo *</Label>
//                 <Input
//                   id="full_name"
//                   value={patientData.full_name}
//                   onChange={(e) =>
//                     handlePatientChange("full_name", e.target.value)
//                   }
//                   placeholder="Nombre completo del paciente"
//                 />
//               </div>
//               <div>
//                 <Label htmlFor="cedula">Cédula de Identidad</Label>
//                 <Input
//                   id="cedula"
//                   value={patientData.cedula}
//                   onChange={(e) =>
//                     handlePatientChange("cedula", e.target.value)
//                   }
//                   placeholder="Número de cédula"
//                 />
//               </div>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <Label htmlFor="phone">Teléfono</Label>
//                 <Input
//                   id="phone"
//                   value={patientData.phone}
//                   onChange={(e) => handlePatientChange("phone", e.target.value)}
//                   placeholder="Número de teléfono"
//                 />
//               </div>
//               <div>
//                 <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
//                 <Input
//                   id="birth_date"
//                   type="date"
//                   value={patientData.birth_date}
//                   onChange={(e) =>
//                     handlePatientChange("birth_date", e.target.value)
//                   }
//                 />
//                 {patientData.birth_date && (
//                   <p className="text-sm text-gray-500 mt-1">
//                     Edad: {calculateAge(patientData.birth_date)} años
//                     {isMinor && " (menor de edad)"}
//                   </p>
//                 )}
//               </div>
//             </div>

//             <div>
//               <Label htmlFor="address">Dirección</Label>
//               <Textarea
//                 id="address"
//                 value={patientData.address}
//                 onChange={(e) => handlePatientChange("address", e.target.value)}
//                 placeholder="Dirección completa"
//                 rows={2}
//               />
//             </div>

//             {isMinor && (
//               <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
//                 <div className="flex items-center space-x-2">
//                   <Checkbox
//                     id="has_representative"
//                     checked={hasRepresentative}
//                     onCheckedChange={(checked) =>
//                       setHasRepresentative(checked as boolean)
//                     }
//                   />
//                   <Label
//                     htmlFor="has_representative"
//                     className="text-amber-800"
//                   >
//                     Este paciente es menor de edad y requiere un representante
//                     legal
//                   </Label>
//                 </div>
//               </div>
//             )}
//           </TabsContent>

//           {/* Tab: Representante */}
//           <TabsContent value="representative" className="space-y-4">
//             {!isMinor && !hasRepresentative ? (
//               <div className="text-center py-8">
//                 <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                 <p className="text-gray-500">
//                   El paciente es mayor de edad. No se requiere representante
//                   legal.
//                 </p>
//                 <div className="mt-4">
//                   <div className="flex items-center space-x-2 justify-center">
//                     <Checkbox
//                       id="add_representative_adult"
//                       checked={hasRepresentative}
//                       onCheckedChange={(checked) =>
//                         setHasRepresentative(checked as boolean)
//                       }
//                     />
//                     <Label htmlFor="add_representative_adult">
//                       Agregar representante o contacto de emergencia (opcional)
//                     </Label>
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               <>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <Label htmlFor="rep_full_name">
//                       Nombre Completo {isMinor ? "*" : ""}
//                     </Label>
//                     <Input
//                       id="rep_full_name"
//                       value={representativeData.full_name}
//                       onChange={(e) =>
//                         handleRepresentativeChange("full_name", e.target.value)
//                       }
//                       placeholder="Nombre del representante"
//                     />
//                   </div>
//                   <div>
//                     <Label htmlFor="relationship">Parentesco</Label>
//                     <Select
//                       value={representativeData.relationship}
//                       onValueChange={(value) =>
//                         handleRepresentativeChange("relationship", value)
//                       }
//                     >
//                       <SelectTrigger>
//                         <SelectValue placeholder="Seleccionar parentesco" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="padre">Padre</SelectItem>
//                         <SelectItem value="madre">Madre</SelectItem>
//                         <SelectItem value="tutor">Tutor Legal</SelectItem>
//                         <SelectItem value="abuelo">Abuelo/a</SelectItem>
//                         <SelectItem value="tio">Tío/a</SelectItem>
//                         <SelectItem value="hermano">Hermano/a</SelectItem>
//                         <SelectItem value="contacto_emergencia">
//                           Contacto de Emergencia
//                         </SelectItem>
//                         <SelectItem value="otro">Otro</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <Label htmlFor="rep_cedula">Cédula</Label>
//                     <Input
//                       id="rep_cedula"
//                       value={representativeData.cedula}
//                       onChange={(e) =>
//                         handleRepresentativeChange("cedula", e.target.value)
//                       }
//                       placeholder="Cédula del representante"
//                     />
//                   </div>
//                   <div>
//                     <Label htmlFor="rep_phone">Teléfono</Label>
//                     <Input
//                       id="rep_phone"
//                       value={representativeData.phone}
//                       onChange={(e) =>
//                         handleRepresentativeChange("phone", e.target.value)
//                       }
//                       placeholder="Teléfono del representante"
//                     />
//                   </div>
//                 </div>

//                 <div>
//                   <Label htmlFor="rep_email">Correo Electrónico</Label>
//                   <Input
//                     id="rep_email"
//                     type="email"
//                     value={representativeData.email}
//                     onChange={(e) =>
//                       handleRepresentativeChange("email", e.target.value)
//                     }
//                     placeholder="Email del representante"
//                   />
//                 </div>

//                 <div>
//                   <Label htmlFor="rep_address">Dirección</Label>
//                   <Textarea
//                     id="rep_address"
//                     value={representativeData.address}
//                     onChange={(e) =>
//                       handleRepresentativeChange("address", e.target.value)
//                     }
//                     placeholder="Dirección del representante"
//                     rows={2}
//                   />
//                 </div>
//               </>
//             )}
//           </TabsContent>

//           {/* Tab: Historia Clínica */}
//           <TabsContent value="medical" className="space-y-4">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <Label htmlFor="blood_type">Tipo de Sangre</Label>
//                 <Select
//                   value={medicalData.blood_type}
//                   onValueChange={(value) =>
//                     handleMedicalChange("blood_type", value)
//                   }
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="Seleccionar tipo de sangre" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="A+">A+</SelectItem>
//                     <SelectItem value="A-">A-</SelectItem>
//                     <SelectItem value="B+">B+</SelectItem>
//                     <SelectItem value="B-">B-</SelectItem>
//                     <SelectItem value="AB+">AB+</SelectItem>
//                     <SelectItem value="AB-">AB-</SelectItem>
//                     <SelectItem value="O+">O+</SelectItem>
//                     <SelectItem value="O-">O-</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//             </div>

//             <div>
//               <Label htmlFor="allergies">Alergias Conocidas</Label>
//               <Textarea
//                 id="allergies"
//                 value={medicalData.allergies}
//                 onChange={(e) =>
//                   handleMedicalChange("allergies", e.target.value)
//                 }
//                 placeholder="Describir alergias conocidas (medicamentos, alimentos, etc.)"
//                 rows={2}
//               />
//             </div>

//             <div>
//               <Label htmlFor="chronic_conditions">Condiciones Crónicas</Label>
//               <Textarea
//                 id="chronic_conditions"
//                 value={medicalData.chronic_conditions}
//                 onChange={(e) =>
//                   handleMedicalChange("chronic_conditions", e.target.value)
//                 }
//                 placeholder="Enfermedades crónicas o condiciones médicas permanentes"
//                 rows={2}
//               />
//             </div>

//             <div>
//               <Label htmlFor="current_medications">Medicamentos Actuales</Label>
//               <Textarea
//                 id="current_medications"
//                 value={medicalData.current_medications}
//                 onChange={(e) =>
//                   handleMedicalChange("current_medications", e.target.value)
//                 }
//                 placeholder="Medicamentos que toma actualmente"
//                 rows={2}
//               />
//             </div>

//             <div>
//               <Label htmlFor="family_history">Antecedentes Familiares</Label>
//               <Textarea
//                 id="family_history"
//                 value={medicalData.family_history}
//                 onChange={(e) =>
//                   handleMedicalChange("family_history", e.target.value)
//                 }
//                 placeholder="Enfermedades hereditarias o antecedentes familiares relevantes"
//                 rows={2}
//               />
//             </div>

//             <div>
//               <Label htmlFor="notes">Notas Adicionales</Label>
//               <Textarea
//                 id="notes"
//                 value={medicalData.notes}
//                 onChange={(e) => handleMedicalChange("notes", e.target.value)}
//                 placeholder="Cualquier información adicional relevante"
//                 rows={3}
//               />
//             </div>
//           </TabsContent>
//         </Tabs>

//         {/* Botones de acción */}
//         <div className="flex space-x-4 mt-6">
//           {currentStep === "medical" ? (
//             <Button onClick={savePatient} disabled={saving} className="flex-1">
//               <Save className="h-4 w-4 mr-2" />
//               {saving
//                 ? "Guardando..."
//                 : patient
//                   ? "Guardar Cambios"
//                   : "Crear Paciente"}
//             </Button>
//           ) : (
//             <Button onClick={handleNext} className="flex-1">
//               Siguiente
//             </Button>
//           )}
//           <Button variant="outline" onClick={onCancel} disabled={saving}>
//             Cancelar
//           </Button>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }
