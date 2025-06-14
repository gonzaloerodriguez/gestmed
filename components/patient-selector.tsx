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
}

interface PatientSelectorProps {
  onPatientSelect: (patient: Patient | null) => void;
  selectedPatient: Patient | null;
}

export function PatientSelector({
  onPatientSelect,
  selectedPatient,
}: PatientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    full_name: "",
    cedula: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    loadPatients();
  }, []);

  // Actualizar el componente para usar doctor_id en lugar de created_by
  const loadPatients = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, cedula, phone, email")
        .eq("doctor_id", user.id) // Cambiar de created_by a doctor_id
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

      const { data, error } = await supabase
        .from("patients")
        .insert({
          full_name: newPatientForm.full_name.trim(),
          cedula: newPatientForm.cedula.trim(),
          phone: newPatientForm.phone.trim() || null,
          email: newPatientForm.email.trim() || null,
          doctor_id: user.id, // Cambiar de created_by a doctor_id
        })
        .select()
        .single();

      if (error) throw error;

      // Agregar a la lista local
      const newPatient = data as Patient;
      setPatients((prev) => [newPatient, ...prev]);

      // Seleccionar automáticamente
      onPatientSelect(newPatient);

      // Limpiar formulario y cerrar dialog
      setNewPatientForm({ full_name: "", cedula: "", phone: "", email: "" });
      setShowNewPatientDialog(false);
      setOpen(false);
    } catch (error: any) {
      alert("Error al crear paciente: " + error.message);
    }
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Paciente</DialogTitle>
              <DialogDescription>
                Crear un nuevo paciente para asignar a la consulta
              </DialogDescription>
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
                  placeholder="Número de teléfono"
                />
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
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewPatientDialog(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreatePatient}>Crear Paciente</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
