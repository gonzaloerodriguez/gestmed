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

export default function NewPrescriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const [formData, setFormData] = useState({
    diagnosis: "",
    medications: "",
    instructions: "",
    notes: "",
    date_prescribed: new Date().toISOString().split("T")[0], // String format for input
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

      const { data, error } = await supabase
        .from("prescriptions")
        .insert(prescriptionData)
        .select()
        .single();

      if (error) throw error;

      alert("Receta creada exitosamente");
      router.push(`/dashboard/prescriptions/${data.id}`);
    } catch (error: any) {
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
                onPatientSelect={setSelectedPatient}
                selectedPatient={selectedPatient}
                allowOneTime={true}
              />

              {selectedPatient && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
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
                      value={selectedPatient.cedula}
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
// import { ArrowLeft, Save } from "lucide-react";
// import { supabase, type Doctor, type MedicationType } from "@/lib/supabase";

// export default function NewPrescriptionPage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [doctor, setDoctor] = useState<Doctor | null>(null);
//   const [medicationTypes, setMedicationTypes] = useState<MedicationType[]>([]);

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
//     date_prescribed: new Date().toISOString().split("T")[0], // Fecha actual
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

//       // Cargar tipos de medicamentos
//       const { data: medicationData, error: medicationError } = await supabase
//         .from("medication_types")
//         .select("*")
//         .order("name");

//       if (medicationError) throw medicationError;
//       setMedicationTypes(medicationData || []);
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

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!doctor) return;

//     // Validaciones básicas
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
//         doctor_id: doctor.id,
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

//       const { data, error } = await supabase
//         .from("prescriptions")
//         .insert(prescriptionData)
//         .select()
//         .single();

//       if (error) throw error;

//       alert("Receta creada exitosamente");
//       router.push(`/dashboard/prescriptions/${data.id}`);
//     } catch (error: any) {
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
//       {/* Header */}
//       <header className="bg-card shadow-sm">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center justify-between py-6">
//             <div className="flex items-center">
//               <Button
//                 variant="ghost"
//                 onClick={() => router.push("/dashboard/prescriptions")}
//                 className="mr-4"
//               >
//                 <ArrowLeft className="h-4 w-4 mr-2" />
//                 Volver
//               </Button>
//               <div>
//                 <h1 className="text-2xl font-bold text-foreground">
//                   Nueva Receta
//                 </h1>
//                 <p className="text-muted-foreground">
//                   Crear una nueva receta médica
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </header>

//       {/* Main Content */}
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
