"use client";

import type React from "react";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Save, AlertCircle, Loader2, Info } from "lucide-react";
import { usePrescriptionForm } from "@/hooks/use-prescription-form";

export default function EditPrescriptionPage() {
  const router = useRouter();
  const { id } = useParams();
  const prescriptionId = typeof id === "string" ? id : null;

  const {
    loading,
    saving,
    doctor,
    prescription,
    formData,
    errors,
    handleInputChange,
    loadDoctor,
    loadPrescription,
    submitForm,
    setLoading,
  } = usePrescriptionForm({
    mode: "edit",
    prescriptionId: prescriptionId || undefined,
  });

  useEffect(() => {
    const initializePage = async () => {
      if (!prescriptionId) {
        router.push("/dashboard/prescriptions");
        return;
      }

      setLoading(true);
      const doctorSuccess = await loadDoctor();
      if (!doctorSuccess) {
        router.push("/dashboard");
        return;
      }

      const prescriptionSuccess = await loadPrescription();
      if (!prescriptionSuccess) {
        router.push("/dashboard/prescriptions");
        return;
      }

      setLoading(false);
    };

    initializePage();
  }, [prescriptionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando receta...</p>
        </div>
      </div>
    );
  }

  if (!prescription || !doctor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Receta no encontrada</p>
          <Button onClick={() => router.push("/dashboard/prescriptions")}>
            Volver a Recetas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Editar Receta Médica
          </h1>
          <p className="text-gray-600">
            Modifique los campos necesarios según normativa ecuatoriana
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Información del Médico */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Prescriptor</CardTitle>
              <CardDescription>
                Datos del médico que aparecerán en la receta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Apellidos y Nombres</Label>
                  <Input
                    value={`${doctor.gender === "female" ? "Dra." : "Dr."} ${doctor.full_name}`}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label>
                    Número de Registro Profesional (ACESS/Matrícula)
                  </Label>
                  <Input
                    value={doctor.license_number}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Especialidad</Label>
                  <Input
                    value={doctor.specialty || "Médico General"}
                    disabled
                    className="bg-muted"
                  />
                </div>
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
                    className={
                      errors.date_prescribed ? "border-destructive" : ""
                    }
                    required
                  />
                  {errors.date_prescribed && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.date_prescribed}
                    </p>
                  )}
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
                  <Label htmlFor="patient_name">
                    Nombre Completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="patient_name"
                    value={formData.patient_name}
                    onChange={(e) =>
                      handleInputChange("patient_name", e.target.value)
                    }
                    placeholder="Nombre completo del paciente"
                    className={errors.patient_name ? "border-destructive" : ""}
                    required
                  />
                  {errors.patient_name && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.patient_name}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="patient_age">
                    Edad <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="patient_age"
                    type="number"
                    min="0"
                    max="150"
                    value={formData.patient_age || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "patient_age",
                        e.target.value ? Number.parseInt(e.target.value) : 0
                      )
                    }
                    placeholder="Edad del paciente"
                    className={errors.patient_age ? "border-destructive" : ""}
                    required
                  />
                  {errors.patient_age && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.patient_age}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="patient_cedula">Cédula de Identidad</Label>
                  <Input
                    id="patient_cedula"
                    value={formData.patient_cedula || ""}
                    onChange={(e) =>
                      handleInputChange("patient_cedula", e.target.value)
                    }
                    placeholder="Cédula del paciente"
                    className={
                      errors.patient_cedula ? "border-destructive" : ""
                    }
                  />
                  {errors.patient_cedula && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.patient_cedula}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="patient_phone">Teléfono</Label>
                  <Input
                    id="patient_phone"
                    value={formData.patient_phone || ""}
                    onChange={(e) =>
                      handleInputChange("patient_phone", e.target.value)
                    }
                    placeholder="Teléfono del paciente"
                    className={errors.patient_phone ? "border-destructive" : ""}
                  />
                  {errors.patient_phone && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.patient_phone}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="patient_address">Dirección</Label>
                <Input
                  id="patient_address"
                  value={formData.patient_address || ""}
                  onChange={(e) =>
                    handleInputChange("patient_address", e.target.value)
                  }
                  placeholder="Dirección del paciente"
                  className={errors.patient_address ? "border-destructive" : ""}
                />
                {errors.patient_address && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.patient_address}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información Médica */}
          <Card>
            <CardHeader>
              <CardTitle>Información Médica</CardTitle>
              <CardDescription>
                Diagnóstico y antecedentes del paciente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="diagnosis">
                  Diagnóstico <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="diagnosis"
                  value={formData.diagnosis}
                  onChange={(e) =>
                    handleInputChange("diagnosis", e.target.value)
                  }
                  placeholder="Diagnóstico del paciente según CIE-10"
                  rows={3}
                  className={errors.diagnosis ? "border-destructive" : ""}
                  required
                />
                {errors.diagnosis && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.diagnosis}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="allergies">
                  Antecedentes de Alergias{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="allergies"
                  value={formData.allergies}
                  onChange={(e) =>
                    handleInputChange("allergies", e.target.value)
                  }
                  placeholder="Especifique las alergias conocidas del paciente o escriba 'Ninguna' si no tiene"
                  rows={2}
                  className={errors.allergies ? "border-destructive" : ""}
                  required
                />
                {errors.allergies && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.allergies}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  <Info className="h-4 w-4 inline mr-1" />
                  Campo obligatorio: debe especificar las alergias o escribir
                  "Ninguna"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Medicamentos */}
          <Card>
            <CardHeader>
              <CardTitle>Medicamentos Prescritos</CardTitle>
              <CardDescription>
                Incluya toda la información requerida: DCI, forma farmacéutica,
                concentración, vía de administración, cantidad, dosis,
                frecuencia y duración
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  placeholder={`Ejemplo de formato requerido:
1. PARACETAMOL (DCI)
   - Forma farmacéutica: Comprimidos
   - Concentración: 500mg
   - Vía de administración: Oral
   - Cantidad: 20 comprimidos
   - Dosis: 1 comprimido
   - Frecuencia: Cada 8 horas
   - Duración: 5 días`}
                  rows={12}
                  className={errors.medications ? "border-destructive" : ""}
                  required
                />
                {errors.medications && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.medications}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  <Info className="h-4 w-4 inline mr-1" />
                  Incluya: DCI, forma farmacéutica, concentración, vía,
                  cantidad, dosis, frecuencia y duración
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Instrucciones y Observaciones */}
          <Card>
            <CardHeader>
              <CardTitle>Instrucciones y Observaciones</CardTitle>
              <CardDescription>
                Indicaciones para el paciente y observaciones médicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="instructions">
                  Instrucciones para el Paciente{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) =>
                    handleInputChange("instructions", e.target.value)
                  }
                  placeholder={`Ejemplo:
- Tomar los medicamentos con alimentos
- Completar todo el tratamiento aunque se sienta mejor
- No suspender el tratamiento sin consultar al médico
- Regresar en 7 días para control
- Mantener reposo relativo`}
                  rows={5}
                  className={errors.instructions ? "border-destructive" : ""}
                  required
                />
                {errors.instructions && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.instructions}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="notes">Notas Adicionales</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ""}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Notas adicionales o comentarios especiales"
                    rows={3}
                    className={errors.notes ? "border-destructive" : ""}
                  />
                  {errors.notes && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.notes}
                    </p>
                  )}
                </div>
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
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Actualizar Receta
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

// "use client";

// import type React from "react";

// import { useEffect } from "react";
// import { useRouter, useParams } from "next/navigation";
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
// import { Save, AlertCircle, Loader2 } from "lucide-react";
// import { usePrescriptionForm } from "@/hooks/use-prescription-form";

// export default function EditPrescriptionPage() {
//   const router = useRouter();
//   const { id } = useParams();
//   const prescriptionId = typeof id === "string" ? id : null;

//   const {
//     loading,
//     saving,
//     doctor,
//     prescription,
//     formData,
//     errors,
//     handleInputChange,
//     loadDoctor,
//     loadPrescription,
//     submitForm,
//     setLoading,
//   } = usePrescriptionForm({
//     mode: "edit",
//     prescriptionId: prescriptionId || undefined,
//   });

//   useEffect(() => {
//     const initializePage = async () => {
//       if (!prescriptionId) {
//         router.push("/dashboard/prescriptions");
//         return;
//       }

//       setLoading(true);
//       const doctorSuccess = await loadDoctor();
//       if (!doctorSuccess) {
//         router.push("/dashboard");
//         return;
//       }

//       const prescriptionSuccess = await loadPrescription();
//       if (!prescriptionSuccess) {
//         router.push("/dashboard/prescriptions");
//         return;
//       }

//       setLoading(false);
//     };

//     initializePage();
//   }, [prescriptionId]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     await submitForm();
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
//           <p className="text-muted-foreground">Cargando receta...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!prescription || !doctor) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
//           <p className="text-red-600 mb-4">Receta no encontrada</p>
//           <Button onClick={() => router.push("/dashboard/prescriptions")}>
//             Volver a Recetas
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <form onSubmit={handleSubmit} className="space-y-8">
//           {/* Información del Médico */}
//           <Card>
//             <CardHeader>
//               <CardTitle>Información del Médico</CardTitle>
//               <CardDescription>
//                 Datos que aparecerán en la receta
//               </CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <Label>Médico</Label>
//                   <Input
//                     value={`${doctor.gender === "female" ? "Dra." : "Dr."} ${doctor.full_name}`}
//                     disabled
//                     className="bg-muted"
//                   />
//                 </div>
//                 <div>
//                   <Label>Matrícula</Label>
//                   <Input
//                     value={doctor.license_number}
//                     disabled
//                     className="bg-muted"
//                   />
//                 </div>
//               </div>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <Label>Especialidad</Label>
//                   <Input
//                     value={doctor.specialty || "Médico General"}
//                     disabled
//                     className="bg-muted"
//                   />
//                 </div>
//                 <div>
//                   <Label htmlFor="date_prescribed">
//                     Fecha de Prescripción{" "}
//                     <span className="text-destructive">*</span>
//                   </Label>
//                   <Input
//                     id="date_prescribed"
//                     type="date"
//                     value={formData.date_prescribed}
//                     onChange={(e) =>
//                       handleInputChange("date_prescribed", e.target.value)
//                     }
//                     className={
//                       errors.date_prescribed ? "border-destructive" : ""
//                     }
//                     required
//                   />
//                   {errors.date_prescribed && (
//                     <p className="text-sm text-destructive mt-1">
//                       {errors.date_prescribed}
//                     </p>
//                   )}
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Información del Paciente */}
//           <Card>
//             <CardHeader>
//               <CardTitle>Información del Paciente</CardTitle>
//               <CardDescription>
//                 Datos del paciente para la receta
//               </CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <Label htmlFor="patient_name">
//                     Nombre Completo <span className="text-destructive">*</span>
//                   </Label>
//                   <Input
//                     id="patient_name"
//                     value={formData.patient_name}
//                     onChange={(e) =>
//                       handleInputChange("patient_name", e.target.value)
//                     }
//                     placeholder="Nombre completo del paciente"
//                     className={errors.patient_name ? "border-destructive" : ""}
//                     required
//                   />
//                   {errors.patient_name && (
//                     <p className="text-sm text-destructive mt-1">
//                       {errors.patient_name}
//                     </p>
//                   )}
//                 </div>
//                 <div>
//                   <Label htmlFor="patient_age">Edad</Label>
//                   <Input
//                     id="patient_age"
//                     type="number"
//                     min="0"
//                     max="150"
//                     value={formData.patient_age || ""}
//                     onChange={(e) =>
//                       handleInputChange(
//                         "patient_age",
//                         e.target.value ? Number.parseInt(e.target.value) : null
//                       )
//                     }
//                     placeholder="Edad del paciente"
//                     className={errors.patient_age ? "border-destructive" : ""}
//                   />
//                   {errors.patient_age && (
//                     <p className="text-sm text-destructive mt-1">
//                       {errors.patient_age}
//                     </p>
//                   )}
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <Label htmlFor="patient_cedula">Cédula de Identidad</Label>
//                   <Input
//                     id="patient_cedula"
//                     value={formData.patient_cedula || ""}
//                     onChange={(e) =>
//                       handleInputChange("patient_cedula", e.target.value)
//                     }
//                     placeholder="Cédula del paciente"
//                     className={
//                       errors.patient_cedula ? "border-destructive" : ""
//                     }
//                   />
//                   {errors.patient_cedula && (
//                     <p className="text-sm text-destructive mt-1">
//                       {errors.patient_cedula}
//                     </p>
//                   )}
//                 </div>
//                 <div>
//                   <Label htmlFor="patient_phone">Teléfono</Label>
//                   <Input
//                     id="patient_phone"
//                     value={formData.patient_phone || ""}
//                     onChange={(e) =>
//                       handleInputChange("patient_phone", e.target.value)
//                     }
//                     placeholder="Teléfono del paciente"
//                     className={errors.patient_phone ? "border-destructive" : ""}
//                   />
//                   {errors.patient_phone && (
//                     <p className="text-sm text-destructive mt-1">
//                       {errors.patient_phone}
//                     </p>
//                   )}
//                 </div>
//               </div>

//               <div>
//                 <Label htmlFor="patient_address">Dirección</Label>
//                 <Input
//                   id="patient_address"
//                   value={formData.patient_address || ""}
//                   onChange={(e) =>
//                     handleInputChange("patient_address", e.target.value)
//                   }
//                   placeholder="Dirección del paciente"
//                   className={errors.patient_address ? "border-destructive" : ""}
//                 />
//                 {errors.patient_address && (
//                   <p className="text-sm text-destructive mt-1">
//                     {errors.patient_address}
//                   </p>
//                 )}
//               </div>
//             </CardContent>
//           </Card>

//           {/* Información Médica */}
//           <Card>
//             <CardHeader>
//               <CardTitle>Información Médica</CardTitle>
//               <CardDescription>Diagnóstico y tratamiento</CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div>
//                 <Label htmlFor="diagnosis">Diagnóstico</Label>
//                 <Textarea
//                   id="diagnosis"
//                   value={formData.diagnosis || ""}
//                   onChange={(e) =>
//                     handleInputChange("diagnosis", e.target.value)
//                   }
//                   placeholder="Diagnóstico del paciente"
//                   rows={3}
//                   className={errors.diagnosis ? "border-destructive" : ""}
//                 />
//                 {errors.diagnosis && (
//                   <p className="text-sm text-destructive mt-1">
//                     {errors.diagnosis}
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <Label htmlFor="medications">
//                   Medicamentos <span className="text-destructive">*</span>
//                 </Label>
//                 <Textarea
//                   id="medications"
//                   value={formData.medications}
//                   onChange={(e) =>
//                     handleInputChange("medications", e.target.value)
//                   }
//                   placeholder="Lista de medicamentos prescritos&#10;Ejemplo:&#10;- Paracetamol 500mg - 1 tableta cada 8 horas&#10;- Ibuprofeno 400mg - 1 tableta cada 12 horas"
//                   rows={6}
//                   className={errors.medications ? "border-destructive" : ""}
//                   required
//                 />
//                 {errors.medications && (
//                   <p className="text-sm text-destructive mt-1">
//                     {errors.medications}
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <Label htmlFor="instructions">
//                   Instrucciones <span className="text-destructive">*</span>
//                 </Label>
//                 <Textarea
//                   id="instructions"
//                   value={formData.instructions}
//                   onChange={(e) =>
//                     handleInputChange("instructions", e.target.value)
//                   }
//                   placeholder="Instrucciones para el paciente&#10;Ejemplo:&#10;- Tomar con alimentos&#10;- Completar todo el tratamiento&#10;- Regresar en 7 días para control"
//                   rows={4}
//                   className={errors.instructions ? "border-destructive" : ""}
//                   required
//                 />
//                 {errors.instructions && (
//                   <p className="text-sm text-destructive mt-1">
//                     {errors.instructions}
//                   </p>
//                 )}
//               </div>

//               <div>
//                 <Label htmlFor="notes">Notas Adicionales</Label>
//                 <Textarea
//                   id="notes"
//                   value={formData.notes || ""}
//                   onChange={(e) => handleInputChange("notes", e.target.value)}
//                   placeholder="Notas adicionales o recomendaciones especiales"
//                   rows={3}
//                   className={errors.notes ? "border-destructive" : ""}
//                 />
//                 {errors.notes && (
//                   <p className="text-sm text-destructive mt-1">
//                     {errors.notes}
//                   </p>
//                 )}
//               </div>
//             </CardContent>
//           </Card>

//           {/* Botones de Acción */}
//           <div className="flex justify-end space-x-4">
//             <Button
//               type="button"
//               variant="outline"
//               onClick={() =>
//                 router.push(`/dashboard/prescriptions/${prescription.id}`)
//               }
//               disabled={saving}
//             >
//               Cancelar
//             </Button>
//             <Button type="submit" disabled={saving}>
//               {saving ? (
//                 <>
//                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                   Guardando...
//                 </>
//               ) : (
//                 <>
//                   <Save className="h-4 w-4 mr-2" />
//                   Actualizar Receta
//                 </>
//               )}
//             </Button>
//           </div>
//         </form>
//       </main>
//     </div>
//   );
// }

// "use client";

// import { useEffect, useState } from "react";
// import { useRouter, useParams } from "next/navigation";
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
// import { Save } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import type { Doctor } from "@/lib/supabase/types/doctor";
// import type { Prescription } from "@/lib/supabase/types/prescription";

// export default function EditPrescriptionPage() {
//   const router = useRouter();
//   const { id } = useParams();
//   const prescriptionId = typeof id === "string" ? id : null;
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [doctor, setDoctor] = useState<Doctor | null>(null);
//   const [prescription, setPrescription] = useState<Prescription | null>(null);

//   const [formData, setFormData] = useState({
//     patient_name: "",
//     patient_age: "",
//     patient_cedula: "",
//     patient_phone: "",
//     patient_address: "",
//     diagnosis: "",
//     medications: "",
//     instructions: "",
//     notes: "",
//     date_prescribed: "",
//   });

//   useEffect(() => {
//     if (prescriptionId) {
//       loadPrescription(prescriptionId);
//     }
//   }, [prescriptionId]);

//   const loadPrescription = async (id: string) => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         // ✅ Solución segura para redireccionar al login
//         if (typeof window !== "undefined") {
//           window.location.href = "/login";
//         } else {
//           router.push("/login");
//         }
//         return;
//       }

//       const { data, error } = await supabase
//         .from("prescriptions")
//         .select(`*, doctor:doctors(*)`)
//         .eq("id", id)
//         .eq("doctor_id", user.id)
//         .single();

//       if (error || !data) throw error;

//       setPrescription(data);
//       setDoctor(data.doctor);

//       setFormData({
//         patient_name: data.patient_name || "",
//         patient_age: data.patient_age ? String(data.patient_age) : "",
//         patient_cedula: data.patient_cedula || "",
//         patient_phone: data.patient_phone || "",
//         patient_address: data.patient_address || "",
//         diagnosis: data.diagnosis || "",
//         medications: data.medications || "",
//         instructions: data.instructions || "",
//         notes: data.notes || "",
//         date_prescribed:
//           data.date_prescribed || new Date().toISOString().split("T")[0],
//       });
//     } catch (error: any) {
//       console.error("Error loading prescription:", error.message);
//       router.push("/dashboard/prescriptions");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleInputChange = (field: string, value: string) => {
//     setFormData((prev) => ({ ...prev, [field]: value }));
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!doctor || !prescription) return;

//     if (!formData.patient_name.trim()) {
//       alert("El nombre del paciente es obligatorio");
//       return;
//     }

//     if (!formData.medications.trim()) {
//       alert("Los medicamentos son obligatorios");
//       return;
//     }

//     if (!formData.instructions.trim()) {
//       alert("Las instrucciones son obligatorias");
//       return;
//     }

//     setSaving(true);
//     try {
//       const prescriptionData = {
//         patient_name: formData.patient_name.trim(),
//         patient_age: formData.patient_age
//           ? Number.parseInt(formData.patient_age)
//           : null,
//         patient_cedula: formData.patient_cedula.trim() || null,
//         patient_phone: formData.patient_phone.trim() || null,
//         patient_address: formData.patient_address.trim() || null,
//         diagnosis: formData.diagnosis.trim() || null,
//         medications: formData.medications.trim(),
//         instructions: formData.instructions.trim(),
//         notes: formData.notes.trim() || null,
//         date_prescribed: formData.date_prescribed,
//       };

//       const { error } = await supabase
//         .from("prescriptions")
//         .update(prescriptionData)
//         .eq("id", prescription.id);

//       if (error) throw error;

//       alert("Receta actualizada exitosamente");
//       router.push(`/dashboard/prescriptions/${prescription.id}`);
//     } catch (error: any) {
//       alert("Error al actualizar receta: " + error.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full mx-auto mb-4" />
//           <p className="text-muted-foreground">Cargando receta...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!prescription || !doctor) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-red-600">Receta no encontrada</p>
//           <Button
//             onClick={() => router.push("/dashboard/prescriptions")}
//             className="mt-4"
//           >
//             Volver a Recetas
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <form onSubmit={handleSubmit} className="space-y-8">
//           <Card>
//             <CardHeader>
//               <CardTitle>Información del Médico</CardTitle>
//               <CardDescription>
//                 Datos que aparecerán en la receta
//               </CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <Label>Médico</Label>
//                   <Input
//                     value={`${doctor.gender === "female" ? "Dra." : "Dr."} ${
//                       doctor.full_name
//                     }`}
//                     disabled
//                     className="bg-background"
//                   />
//                 </div>
//                 <div>
//                   <Label>Matrícula</Label>
//                   <Input
//                     value={doctor.license_number}
//                     disabled
//                     className="bg-background"
//                   />
//                 </div>
//               </div>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <Label>Especialidad</Label>
//                   <Input
//                     value={doctor.specialty || "Médico General"}
//                     disabled
//                     className="bg-background"
//                   />
//                 </div>
//                 <div>
//                   <Label>Fecha de Prescripción</Label>
//                   <Input
//                     type="date"
//                     value={formData.date_prescribed}
//                     onChange={(e) =>
//                       handleInputChange("date_prescribed", e.target.value)
//                     }
//                     required
//                   />
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Información del Paciente */}
//           <Card>
//             <CardHeader>
//               <CardTitle>Información del Paciente</CardTitle>
//               <CardDescription>
//                 Datos del paciente para la receta
//               </CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <Label htmlFor="patient_name">Nombre Completo *</Label>
//                   <Input
//                     id="patient_name"
//                     value={formData.patient_name}
//                     onChange={(e) =>
//                       handleInputChange("patient_name", e.target.value)
//                     }
//                     placeholder="Nombre completo del paciente"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <Label htmlFor="patient_age">Edad</Label>
//                   <Input
//                     id="patient_age"
//                     type="number"
//                     min="0"
//                     max="150"
//                     value={formData.patient_age}
//                     onChange={(e) =>
//                       handleInputChange("patient_age", e.target.value)
//                     }
//                     placeholder="Edad del paciente"
//                   />
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <Label htmlFor="patient_cedula">Cédula de Identidad</Label>
//                   <Input
//                     id="patient_cedula"
//                     value={formData.patient_cedula}
//                     onChange={(e) =>
//                       handleInputChange("patient_cedula", e.target.value)
//                     }
//                     placeholder="Cédula del paciente"
//                   />
//                 </div>
//                 <div>
//                   <Label htmlFor="patient_phone">Teléfono</Label>
//                   <Input
//                     id="patient_phone"
//                     value={formData.patient_phone}
//                     onChange={(e) =>
//                       handleInputChange("patient_phone", e.target.value)
//                     }
//                     placeholder="Teléfono del paciente"
//                   />
//                 </div>
//               </div>

//               <div>
//                 <Label htmlFor="patient_address">Dirección</Label>
//                 <Input
//                   id="patient_address"
//                   value={formData.patient_address}
//                   onChange={(e) =>
//                     handleInputChange("patient_address", e.target.value)
//                   }
//                   placeholder="Dirección del paciente"
//                 />
//               </div>
//             </CardContent>
//           </Card>

//           {/* Información Médica */}
//           <Card>
//             <CardHeader>
//               <CardTitle>Información Médica</CardTitle>
//               <CardDescription>Diagnóstico y tratamiento</CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div>
//                 <Label htmlFor="diagnosis">Diagnóstico</Label>
//                 <Textarea
//                   id="diagnosis"
//                   value={formData.diagnosis}
//                   onChange={(e) =>
//                     handleInputChange("diagnosis", e.target.value)
//                   }
//                   placeholder="Diagnóstico del paciente"
//                   rows={3}
//                 />
//               </div>

//               <div>
//                 <Label htmlFor="medications">Medicamentos *</Label>
//                 <Textarea
//                   id="medications"
//                   value={formData.medications}
//                   onChange={(e) =>
//                     handleInputChange("medications", e.target.value)
//                   }
//                   placeholder="Lista de medicamentos prescritos&#10;Ejemplo:&#10;- Paracetamol 500mg - 1 tableta cada 8 horas&#10;- Ibuprofeno 400mg - 1 tableta cada 12 horas"
//                   rows={6}
//                   required
//                 />
//               </div>

//               <div>
//                 <Label htmlFor="instructions">Instrucciones *</Label>
//                 <Textarea
//                   id="instructions"
//                   value={formData.instructions}
//                   onChange={(e) =>
//                     handleInputChange("instructions", e.target.value)
//                   }
//                   placeholder="Instrucciones para el paciente&#10;Ejemplo:&#10;- Tomar con alimentos&#10;- Completar todo el tratamiento&#10;- Regresar en 7 días para control"
//                   rows={4}
//                   required
//                 />
//               </div>

//               <div>
//                 <Label htmlFor="notes">Notas Adicionales</Label>
//                 <Textarea
//                   id="notes"
//                   value={formData.notes}
//                   onChange={(e) => handleInputChange("notes", e.target.value)}
//                   placeholder="Notas adicionales o recomendaciones especiales"
//                   rows={3}
//                 />
//               </div>
//             </CardContent>
//           </Card>

//           {/* Botones de Acción */}
//           <div className="flex justify-end space-x-4">
//             <Button
//               type="button"
//               variant="outline"
//               onClick={() =>
//                 router.push(`/dashboard/prescriptions/${prescription.id}`)
//               }
//               disabled={saving}
//             >
//               Cancelar
//             </Button>
//             <Button type="submit" disabled={saving}>
//               <Save className="h-4 w-4 mr-2" />
//               {saving ? "Guardando..." : "Actualizar Receta"}
//             </Button>
//           </div>
//         </form>
//       </main>
//     </div>
//   );
// }
