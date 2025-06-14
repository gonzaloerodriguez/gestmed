"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface Patient {
  id: string;
  full_name: string;
  cedula: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  address?: string;
}

interface PatientSelectorProps {
  onPatientSelect: (patient: Patient | null) => void;
  selectedPatient: Patient | null;
  allowOneTime?: boolean; // Para recetas de una sola vez
}

export function PatientSelector({
  onPatientSelect,
  selectedPatient,
  allowOneTime = false,
}: PatientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);
  const [savePatient, setSavePatient] = useState(true); // Por defecto guardar paciente
  const [newPatientForm, setNewPatientForm] = useState({
    full_name: "",
    cedula: "",
    phone: "",
    email: "",
    birth_date: "",
    address: "",
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, cedula, phone, email, birth_date, address")
        .eq("doctor_id", user.id)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      console.error("Error loading patients:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async () => {
    if (!newPatientForm.full_name.trim() || !newPatientForm.cedula.trim()) {
      alert("Nombre y cédula son obligatorios");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      let newPatient: Patient;

      if (savePatient) {
        // Guardar paciente en la base de datos
        const { data, error } = await supabase
          .from("patients")
          .insert({
            full_name: newPatientForm.full_name.trim(),
            cedula: newPatientForm.cedula.trim(),
            phone: newPatientForm.phone.trim() || null,
            email: newPatientForm.email.trim() || null,
            birth_date: newPatientForm.birth_date || null,
            address: newPatientForm.address.trim() || null,
            doctor_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        newPatient = data as Patient;

        // Agregar a la lista local
        setPatients((prev) => [newPatient, ...prev]);
      } else {
        // Crear paciente temporal (solo para esta receta)
        newPatient = {
          id: `temp_${Date.now()}`,
          full_name: newPatientForm.full_name.trim(),
          cedula: newPatientForm.cedula.trim(),
          phone: newPatientForm.phone.trim() || undefined,
          email: newPatientForm.email.trim() || undefined,
          birth_date: newPatientForm.birth_date || undefined,
          address: newPatientForm.address.trim() || undefined,
        };
      }

      // Seleccionar automáticamente
      onPatientSelect(newPatient);

      // Limpiar formulario y cerrar dialog
      setNewPatientForm({
        full_name: "",
        cedula: "",
        phone: "",
        email: "",
        birth_date: "",
        address: "",
      });
      setShowNewPatientDialog(false);
      setOpen(false);
    } catch (error: any) {
      alert("Error al crear paciente: " + error.message);
    }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
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
  };

  return (
    <div className="space-y-2">
      <Label>Paciente</Label>
      <div className="flex space-x-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between"
            >
              {selectedPatient ? (
                <span className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  {selectedPatient.full_name}
                </span>
              ) : (
                "Seleccionar paciente..."
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="Buscar paciente..." />
              <CommandList>
                <CommandEmpty>No se encontraron pacientes.</CommandEmpty>
                <CommandGroup>
                  {patients.map((patient) => (
                    <CommandItem
                      key={patient.id}
                      value={`${patient.full_name} ${patient.cedula}`}
                      onSelect={() => {
                        onPatientSelect(patient);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedPatient?.id === patient.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div>
                        <div className="font-medium">{patient.full_name}</div>
                        <div className="text-sm text-gray-500">
                          CI: {patient.cedula}
                          {patient.birth_date && (
                            <span className="ml-2">
                              ({calculateAge(patient.birth_date)} años)
                            </span>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Dialog
          open={showNewPatientDialog}
          onOpenChange={setShowNewPatientDialog}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Paciente</DialogTitle>
              <DialogDescription>Crear un nuevo paciente</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="patient_name">Nombre Completo *</Label>
                <Input
                  id="patient_name"
                  value={newPatientForm.full_name}
                  onChange={(e) =>
                    setNewPatientForm((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  placeholder="Nombre completo del paciente"
                />
              </div>
              <div>
                <Label htmlFor="patient_cedula">Cédula *</Label>
                <Input
                  id="patient_cedula"
                  value={newPatientForm.cedula}
                  onChange={(e) =>
                    setNewPatientForm((prev) => ({
                      ...prev,
                      cedula: e.target.value,
                    }))
                  }
                  placeholder="Cédula de identidad"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="patient_phone">Teléfono</Label>
                  <Input
                    id="patient_phone"
                    value={newPatientForm.phone}
                    onChange={(e) =>
                      setNewPatientForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="Teléfono"
                  />
                </div>
                <div>
                  <Label htmlFor="patient_birth_date">Fecha Nac.</Label>
                  <Input
                    id="patient_birth_date"
                    type="date"
                    value={newPatientForm.birth_date}
                    onChange={(e) =>
                      setNewPatientForm((prev) => ({
                        ...prev,
                        birth_date: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="patient_email">Email</Label>
                <Input
                  id="patient_email"
                  type="email"
                  value={newPatientForm.email}
                  onChange={(e) =>
                    setNewPatientForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="Correo electrónico"
                />
              </div>
              <div>
                <Label htmlFor="patient_address">Dirección</Label>
                <Input
                  id="patient_address"
                  value={newPatientForm.address}
                  onChange={(e) =>
                    setNewPatientForm((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder="Dirección"
                />
              </div>

              {allowOneTime && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="save_patient"
                    checked={savePatient}
                    onChange={(e) => setSavePatient(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="save_patient" className="text-sm">
                    Guardar paciente para futuras consultas
                  </Label>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewPatientDialog(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreatePatient}>
                  {savePatient ? "Crear y Guardar" : "Usar Solo Esta Vez"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedPatient && (
        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
          <strong>{selectedPatient.full_name}</strong> - CI:{" "}
          {selectedPatient.cedula}
          {selectedPatient.birth_date && (
            <span className="ml-2">
              ({calculateAge(selectedPatient.birth_date)} años)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// "use client";

// import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import {
//   Command,
//   CommandEmpty,
//   CommandGroup,
//   CommandInput,
//   CommandItem,
//   CommandList,
// } from "@/components/ui/command";
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";
// import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { supabase } from "@/lib/supabase";

// interface Patient {
//   id: string;
//   full_name: string;
//   cedula: string;
//   phone?: string;
//   email?: string;
// }

// interface PatientSelectorProps {
//   onPatientSelect: (patient: Patient | null) => void;
//   selectedPatient: Patient | null;
// }

// export function PatientSelector({
//   onPatientSelect,
//   selectedPatient,
// }: PatientSelectorProps) {
//   const [open, setOpen] = useState(false);
//   const [patients, setPatients] = useState<Patient[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);
//   const [newPatientForm, setNewPatientForm] = useState({
//     full_name: "",
//     cedula: "",
//     phone: "",
//     email: "",
//   });

//   useEffect(() => {
//     loadPatients();
//   }, []);

//   // Actualizar el componente para usar doctor_id en lugar de created_by
//   const loadPatients = async () => {
//     setLoading(true);
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();
//       if (!user) throw new Error("Usuario no autenticado");

//       const { data, error } = await supabase
//         .from("patients")
//         .select("id, full_name, cedula, phone, email")
//         .eq("doctor_id", user.id) // Cambiar de created_by a doctor_id
//         .eq("is_active", true)
//         .order("full_name");

//       if (error) throw error;
//       setPatients(data || []);
//     } catch (error: any) {
//       console.error("Error loading patients:", error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCreatePatient = async () => {
//     if (!newPatientForm.full_name.trim() || !newPatientForm.cedula.trim()) {
//       alert("Nombre y cédula son obligatorios");
//       return;
//     }

//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();
//       if (!user) throw new Error("Usuario no autenticado");

//       const { data, error } = await supabase
//         .from("patients")
//         .insert({
//           full_name: newPatientForm.full_name.trim(),
//           cedula: newPatientForm.cedula.trim(),
//           phone: newPatientForm.phone.trim() || null,
//           email: newPatientForm.email.trim() || null,
//           doctor_id: user.id, // Cambiar de created_by a doctor_id
//         })
//         .select()
//         .single();

//       if (error) throw error;

//       // Agregar a la lista local
//       const newPatient = data as Patient;
//       setPatients((prev) => [newPatient, ...prev]);

//       // Seleccionar automáticamente
//       onPatientSelect(newPatient);

//       // Limpiar formulario y cerrar dialog
//       setNewPatientForm({ full_name: "", cedula: "", phone: "", email: "" });
//       setShowNewPatientDialog(false);
//       setOpen(false);
//     } catch (error: any) {
//       alert("Error al crear paciente: " + error.message);
//     }
//   };

//   return (
//     <div className="space-y-2">
//       <Label>Paciente</Label>
//       <div className="flex space-x-2">
//         <Popover open={open} onOpenChange={setOpen}>
//           <PopoverTrigger asChild>
//             <Button
//               variant="outline"
//               role="combobox"
//               aria-expanded={open}
//               className="flex-1 justify-between"
//             >
//               {selectedPatient ? (
//                 <span className="flex items-center">
//                   <User className="h-4 w-4 mr-2" />
//                   {selectedPatient.full_name}
//                 </span>
//               ) : (
//                 "Seleccionar paciente..."
//               )}
//               <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//             </Button>
//           </PopoverTrigger>
//           <PopoverContent className="w-full p-0">
//             <Command>
//               <CommandInput placeholder="Buscar paciente..." />
//               <CommandList>
//                 <CommandEmpty>No se encontraron pacientes.</CommandEmpty>
//                 <CommandGroup>
//                   {patients.map((patient) => (
//                     <CommandItem
//                       key={patient.id}
//                       value={`${patient.full_name} ${patient.cedula}`}
//                       onSelect={() => {
//                         onPatientSelect(patient);
//                         setOpen(false);
//                       }}
//                     >
//                       <Check
//                         className={cn(
//                           "mr-2 h-4 w-4",
//                           selectedPatient?.id === patient.id
//                             ? "opacity-100"
//                             : "opacity-0"
//                         )}
//                       />
//                       <div>
//                         <div className="font-medium">{patient.full_name}</div>
//                         <div className="text-sm text-gray-500">
//                           CI: {patient.cedula}
//                         </div>
//                       </div>
//                     </CommandItem>
//                   ))}
//                 </CommandGroup>
//               </CommandList>
//             </Command>
//           </PopoverContent>
//         </Popover>

//         <Dialog
//           open={showNewPatientDialog}
//           onOpenChange={setShowNewPatientDialog}
//         >
//           <DialogTrigger asChild>
//             <Button variant="outline" size="icon">
//               <Plus className="h-4 w-4" />
//             </Button>
//           </DialogTrigger>
//           <DialogContent>
//             <DialogHeader>
//               <DialogTitle>Nuevo Paciente</DialogTitle>
//               <DialogDescription>
//                 Crear un nuevo paciente para asignar a la consulta
//               </DialogDescription>
//             </DialogHeader>
//             <div className="space-y-4">
//               <div>
//                 <Label htmlFor="patient_name">Nombre Completo *</Label>
//                 <Input
//                   id="patient_name"
//                   value={newPatientForm.full_name}
//                   onChange={(e) =>
//                     setNewPatientForm((prev) => ({
//                       ...prev,
//                       full_name: e.target.value,
//                     }))
//                   }
//                   placeholder="Nombre completo del paciente"
//                 />
//               </div>
//               <div>
//                 <Label htmlFor="patient_cedula">Cédula *</Label>
//                 <Input
//                   id="patient_cedula"
//                   value={newPatientForm.cedula}
//                   onChange={(e) =>
//                     setNewPatientForm((prev) => ({
//                       ...prev,
//                       cedula: e.target.value,
//                     }))
//                   }
//                   placeholder="Cédula de identidad"
//                 />
//               </div>
//               <div>
//                 <Label htmlFor="patient_phone">Teléfono</Label>
//                 <Input
//                   id="patient_phone"
//                   value={newPatientForm.phone}
//                   onChange={(e) =>
//                     setNewPatientForm((prev) => ({
//                       ...prev,
//                       phone: e.target.value,
//                     }))
//                   }
//                   placeholder="Número de teléfono"
//                 />
//               </div>
//               <div>
//                 <Label htmlFor="patient_email">Email</Label>
//                 <Input
//                   id="patient_email"
//                   type="email"
//                   value={newPatientForm.email}
//                   onChange={(e) =>
//                     setNewPatientForm((prev) => ({
//                       ...prev,
//                       email: e.target.value,
//                     }))
//                   }
//                   placeholder="Correo electrónico"
//                 />
//               </div>
//               <div className="flex justify-end space-x-2">
//                 <Button
//                   variant="outline"
//                   onClick={() => setShowNewPatientDialog(false)}
//                 >
//                   Cancelar
//                 </Button>
//                 <Button onClick={handleCreatePatient}>Crear Paciente</Button>
//               </div>
//             </div>
//           </DialogContent>
//         </Dialog>
//       </div>
//     </div>
//   );
// }
