"use client";

import type React from "react";

import { useEffect } from "react";
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
import { Save, AlertCircle, Loader2, Info } from "lucide-react";
import { PatientSelector } from "@/components/patient-selector";
import { usePrescriptionForm } from "@/hooks/use-prescription-form";

export default function NewPrescriptionPage() {
  const router = useRouter();

  const {
    loading,
    saving,
    doctor,
    selectedPatient,
    medicalHistoryId,
    formData,
    errors,
    handleInputChange,
    handlePatientSelect,
    loadDoctor,
    submitForm,
    setLoading,
  } = usePrescriptionForm({ mode: "create" });

  useEffect(() => {
    const initializePage = async () => {
      setLoading(true);
      const success = await loadDoctor();
      if (!success) {
        router.push("/dashboard");
      }
      setLoading(false);
    };

    initializePage();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Error al cargar datos del médico</p>
          <Button onClick={() => router.push("/dashboard")}>
            Volver al Dashboard
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
            Nueva Receta Médica
          </h1>
          <p className="text-gray-600">
            Complete todos los campos obligatorios según normativa ecuatoriana
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
                Selecciona un paciente existente o crea uno nuevo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PatientSelector
                onPatientSelect={handlePatientSelect}
                selectedPatient={selectedPatient}
                allowOneTime={true}
              />

              {selectedPatient && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="patient_name">
                        Nombre Completo{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="patient_name"
                        value={formData.patient_name}
                        onChange={(e) =>
                          handleInputChange("patient_name", e.target.value)
                        }
                        placeholder="Nombre completo del paciente"
                        className={
                          errors.patient_name ? "border-destructive" : ""
                        }
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
                        className={
                          errors.patient_age ? "border-destructive" : ""
                        }
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
                      <Label htmlFor="patient_cedula">
                        Cédula de Identidad
                      </Label>
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
                        className={
                          errors.patient_phone ? "border-destructive" : ""
                        }
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
                      className={
                        errors.patient_address ? "border-destructive" : ""
                      }
                    />
                    {errors.patient_address && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.patient_address}
                      </p>
                    )}
                  </div>

                  {/* Estado del historial médico */}
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
                    ) : selectedPatient.id &&
                      !selectedPatient.id.toString().startsWith("temp_") ? (
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
                  placeholder="Especifique las alergias conocidas del paciente o escriba 'Ninguna' si no tiene alergias conocidas"
                  rows={3}
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
                  placeholder={`Formato requerido por ley ecuatoriana:

1. [DCI - Denominación Común Internacional]
   Forma farmacéutica: [Comprimidos/Cápsulas/Jarabe/etc.]
   Concentración: [mg/ml/g]
   Vía de administración: [Oral/Tópica/Intramuscular/etc.]
   Cantidad: [Número de unidades]
   Dosis: [Cantidad por toma]
   Frecuencia: [Cada X horas/veces al día]
   Duración: [X días/semanas]

Ejemplo:
PARACETAMOL 
Forma farmacéutica: Comprimidos
Concentración: 500mg
Vía de administración: Oral
Cantidad: 20 comprimidos
`}
                  rows={15}
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
- Dosis: 1 comprimido
- Frecuencia: Cada 8 horas
- Duración: 5 días                    
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
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
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Crear Receta
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
// import { useRouter } from "next/navigation";
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
// import { PatientSelector } from "@/components/patient-selector";
// import { usePrescriptionForm } from "@/hooks/use-prescription-form";

// export default function NewPrescriptionPage() {
//   const router = useRouter();

//   const {
//     loading,
//     saving,
//     doctor,
//     selectedPatient,
//     medicalHistoryId,
//     formData,
//     errors,
//     handleInputChange,
//     handlePatientSelect,
//     loadDoctor,
//     submitForm,
//     setLoading,
//   } = usePrescriptionForm({ mode: "create" });

//   useEffect(() => {
//     const initializePage = async () => {
//       setLoading(true);
//       const success = await loadDoctor();
//       if (!success) {
//         router.push("/dashboard");
//       }
//       setLoading(false);
//     };

//     initializePage();
//   }, []);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     await submitForm();
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
//           <p className="text-muted-foreground">Cargando formulario...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!doctor) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
//           <p className="text-red-600 mb-4">Error al cargar datos del médico</p>
//           <Button onClick={() => router.push("/dashboard")}>
//             Volver al Dashboard
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
//                 Selecciona un paciente existente o crea uno nuevo
//               </CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <PatientSelector
//                 onPatientSelect={handlePatientSelect}
//                 selectedPatient={selectedPatient}
//                 allowOneTime={true}
//               />

//               {selectedPatient && (
//                 <div className="space-y-4">
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
//                     <div>
//                       <Label>Nombre Completo</Label>
//                       <Input
//                         value={formData.patient_name}
//                         disabled
//                         className="bg-background"
//                       />
//                     </div>
//                     <div>
//                       <Label>Cédula</Label>
//                       <Input
//                         value={formData.patient_cedula || "N/A"}
//                         disabled
//                         className="bg-background"
//                       />
//                     </div>
//                     {formData.patient_phone && (
//                       <div>
//                         <Label>Teléfono</Label>
//                         <Input
//                           value={formData.patient_phone}
//                           disabled
//                           className="bg-background"
//                         />
//                       </div>
//                     )}
//                     {formData.patient_age && (
//                       <div>
//                         <Label>Edad</Label>
//                         <Input
//                           value={`${formData.patient_age} años`}
//                           disabled
//                           className="bg-background"
//                         />
//                       </div>
//                     )}
//                   </div>

//                   {/* Estado del historial médico */}
//                   <div className="p-4 rounded-lg border">
//                     {medicalHistoryId ? (
//                       <div className="flex items-center text-green-700 bg-green-50 p-3 rounded">
//                         <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
//                         <div>
//                           <p className="font-medium">
//                             Historial médico encontrado
//                           </p>
//                           <p className="text-sm">
//                             La receta se asociará automáticamente al historial
//                             del paciente
//                           </p>
//                         </div>
//                       </div>
//                     ) : selectedPatient.id &&
//                       !selectedPatient.id.toString().startsWith("temp_") ? (
//                       <div className="flex items-center text-amber-700 bg-amber-50 p-3 rounded">
//                         <AlertCircle className="w-5 h-5 mr-3" />
//                         <div>
//                           <p className="font-medium">Sin historial médico</p>
//                           <p className="text-sm">
//                             Este paciente no tiene historial médico registrado
//                           </p>
//                         </div>
//                       </div>
//                     ) : (
//                       <div className="flex items-center text-blue-700 bg-blue-50 p-3 rounded">
//                         <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
//                         <div>
//                           <p className="font-medium">Paciente temporal</p>
//                           <p className="text-sm">
//                             Esta receta no se asociará a un historial médico
//                           </p>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}
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
//               onClick={() => router.push("/dashboard/prescriptions")}
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
//                   Crear Receta
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

// import type React from "react";
// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
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
// import { Save, AlertCircle } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import { PatientSelector } from "@/components/patient-selector";
// import type { Doctor } from "@/lib/supabase/types/doctor";

// export default function NewPrescriptionPage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [doctor, setDoctor] = useState<Doctor | null>(null);
//   const [selectedPatient, setSelectedPatient] = useState<any>(null);
//   const [medicalHistoryId, setMedicalHistoryId] = useState<string | null>(null);

//   const [formData, setFormData] = useState({
//     diagnosis: "",
//     medications: "",
//     instructions: "",
//     notes: "",
//     date_prescribed: new Date().toISOString().split("T")[0],
//   });

//   useEffect(() => {
//     checkUserAndLoadData();
//   }, []);

//   const checkUserAndLoadData = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         router.push("/login");
//         return;
//       }

//       // Cargar datos del médico
//       const { data: doctorData, error: doctorError } = await supabase
//         .from("doctors")
//         .select("*")
//         .eq("id", user.id)
//         .single();

//       if (doctorError) throw doctorError;
//       setDoctor(doctorData);
//     } catch (error: any) {
//       console.error("Error:", error.message);
//       router.push("/dashboard");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleInputChange = (field: string, value: string) => {
//     setFormData((prev) => ({ ...prev, [field]: value }));
//   };

//   // NUEVA FUNCIÓN: Manejar selección de paciente y cargar historial médico
//   const handlePatientSelect = async (patient: any) => {
//     setSelectedPatient(patient);
//     setMedicalHistoryId(null);

//     if (patient && patient.id) {
//       try {
//         console.log("Buscando historial médico para paciente:", patient.id);

//         // Buscar historial médico del paciente
//         const { data: medicalHistory, error: historyError } = await supabase
//           .from("medical_histories")
//           .select("id")
//           .eq("patient_id", patient.id)
//           .single();

//         if (historyError) {
//           console.error("Error buscando historial médico:", historyError);
//           // Si no existe historial médico, podríamos crearlo automáticamente
//           // o mostrar una advertencia al usuario
//         } else {
//           console.log("Historial médico encontrado:", medicalHistory.id);
//           setMedicalHistoryId(medicalHistory.id);
//         }
//       } catch (error: any) {
//         console.error("Error al buscar historial médico:", error);
//       }
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!doctor) return;

//     // Validaciones básicas
//     if (!selectedPatient) {
//       alert("Debes seleccionar un paciente");
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
//         doctor_id: doctor.id,
//         medical_history_id: medicalHistoryId, // AGREGADO: Incluir el ID del historial médico
//         patient_name: selectedPatient.full_name,
//         patient_age: selectedPatient.birth_date
//           ? new Date().getFullYear() -
//             new Date(selectedPatient.birth_date).getFullYear()
//           : null,
//         patient_cedula: selectedPatient.cedula,
//         patient_phone: selectedPatient.phone || null,
//         patient_address: selectedPatient.address || null,
//         diagnosis: formData.diagnosis.trim() || null,
//         medications: formData.medications.trim(),
//         instructions: formData.instructions.trim(),
//         notes: formData.notes.trim() || null,
//         date_prescribed: formData.date_prescribed,
//       };

//       console.log("Datos a insertar:", prescriptionData);

//       const { data, error } = await supabase
//         .from("prescriptions")
//         .insert(prescriptionData)
//         .select()
//         .single();

//       if (error) throw error;

//       alert("Receta creada exitosamente");
//       router.push(`/dashboard/prescriptions/${data.id}`);
//     } catch (error: any) {
//       console.error("Error completo:", error);
//       alert("Error al crear receta: " + error.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-muted-foreground">Cargando formulario...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!doctor) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-red-600">Error al cargar datos del médico</p>
//           <Button onClick={() => router.push("/dashboard")} className="mt-4">
//             Volver al Dashboard
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
//                     value={`${doctor.gender === "female" ? "Dra." : "Dr."} ${doctor.full_name}`}
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

//           <Card>
//             <CardHeader>
//               <CardTitle>Información del Paciente</CardTitle>
//               <CardDescription>
//                 Selecciona un paciente existente o crea uno nuevo
//               </CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <PatientSelector
//                 onPatientSelect={handlePatientSelect} // CAMBIADO: usar la nueva función
//                 selectedPatient={selectedPatient}
//                 allowOneTime={true}
//               />

//               {selectedPatient && (
//                 <div className="space-y-4">
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
//                     <div>
//                       <Label>Nombre Completo</Label>
//                       <Input
//                         value={selectedPatient.full_name}
//                         disabled
//                         className="bg-white"
//                       />
//                     </div>
//                     <div>
//                       <Label>Cédula</Label>
//                       <Input
//                         value={selectedPatient.cedula || "N/A"}
//                         disabled
//                         className="bg-white"
//                       />
//                     </div>
//                     {selectedPatient.phone && (
//                       <div>
//                         <Label>Teléfono</Label>
//                         <Input
//                           value={selectedPatient.phone}
//                           disabled
//                           className="bg-white"
//                         />
//                       </div>
//                     )}
//                     {selectedPatient.email && (
//                       <div>
//                         <Label>Email</Label>
//                         <Input
//                           value={selectedPatient.email}
//                           disabled
//                           className="bg-white"
//                         />
//                       </div>
//                     )}
//                   </div>

//                   <div className="p-4 rounded-lg border">
//                     {medicalHistoryId ? (
//                       <div className="flex items-center text-green-700 bg-green-50 p-3 rounded">
//                         <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
//                         <div>
//                           <p className="font-medium">
//                             Historial médico encontrado
//                           </p>
//                           <p className="text-sm">
//                             La receta se asociará automáticamente al historial
//                             del paciente
//                           </p>
//                         </div>
//                       </div>
//                     ) : selectedPatient.id ? (
//                       <div className="flex items-center text-amber-700 bg-amber-50 p-3 rounded">
//                         <AlertCircle className="w-5 h-5 mr-3" />
//                         <div>
//                           <p className="font-medium">Sin historial médico</p>
//                           <p className="text-sm">
//                             Este paciente no tiene historial médico registrado
//                           </p>
//                         </div>
//                       </div>
//                     ) : (
//                       <div className="flex items-center text-blue-700 bg-blue-50 p-3 rounded">
//                         <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
//                         <div>
//                           <p className="font-medium">Paciente temporal</p>
//                           <p className="text-sm">
//                             Esta receta no se asociará a un historial médico
//                           </p>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </CardContent>
//           </Card>

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

//           <div className="flex justify-end space-x-4">
//             <Button
//               type="button"
//               variant="outline"
//               onClick={() => router.push("/dashboard/prescriptions")}
//               disabled={saving}
//             >
//               Cancelar
//             </Button>
//             <Button type="submit" disabled={saving}>
//               <Save className="h-4 w-4 mr-2" />
//               {saving ? "Guardando..." : "Crear Receta"}
//             </Button>
//           </div>
//         </form>
//       </main>
//     </div>
//   );
// }
