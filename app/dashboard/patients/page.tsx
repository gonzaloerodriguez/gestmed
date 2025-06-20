"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Plus,
  Search,
  Eye,
  Edit,
  Calendar,
  Phone,
  MapPin,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PatientForm } from "@/components/forms/PatientForm";
import type { Doctor, Patient } from "@/lib/supabase";

export default function PatientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Verificar si se debe mostrar el formulario desde el dashboard
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "new") {
      setShowForm(true);
    }
  }, [searchParams]);

  useEffect(() => {
    loadDoctor();
  }, []);

  useEffect(() => {
    if (doctor) {
      loadPatients();
    }
  }, [doctor]);

  useEffect(() => {
    filterPatients();
  }, [patients, searchTerm]);

  const loadDoctor = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: doctorData, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setDoctor(doctorData);
    } catch (error: any) {
      console.error("Error loading doctor:", error.message);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    if (!doctor) return;

    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("doctor_id", doctor.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      console.error("Error loading patients:", error.message);
    }
  };

  const filterPatients = () => {
    if (!searchTerm.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const filtered = patients.filter(
      (patient) =>
        patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.cedula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPatients(filtered);
  };

  const calculateAge = (birthDate: string): number => {
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
  };

  const handlePatientCreated = (patient: Patient) => {
    setShowForm(false);
    // Limpiar el parámetro de la URL
    router.replace("/dashboard/patients");
    loadPatients();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="p-6">
        <PatientForm
          doctorId={doctor!.id}
          onSuccess={handlePatientCreated}
          onCancel={() => {
            setShowForm(false);
            router.replace("/dashboard/patients");
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-end w-full mb-8">
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Paciente
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Pacientes
                </p>
                <p className="text-2xl font-bold">{patients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Menores de Edad
                </p>
                <p className="text-2xl font-bold">
                  {
                    patients.filter(
                      (p) => p.birth_date && calculateAge(p.birth_date) < 18
                    ).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Nuevos (Este Mes)
                </p>
                <p className="text-2xl font-bold">
                  {
                    patients.filter((p) => {
                      const created = new Date(p.created_at);
                      const now = new Date();
                      return (
                        created.getMonth() === now.getMonth() &&
                        created.getFullYear() === now.getFullYear()
                      );
                    }).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Phone className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Con Teléfono
                </p>
                <p className="text-2xl font-bold">
                  {patients.filter((p) => p.phone).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar pacientes por nombre, cédula o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de pacientes */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pacientes</CardTitle>
          <CardDescription>
            {filteredPatients.length} paciente
            {filteredPatients.length !== 1 ? "s" : ""} encontrado
            {filteredPatients.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPatients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm
                  ? "No se encontraron pacientes"
                  : "No tienes pacientes registrados"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowForm(true)} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Paciente
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Edad</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => {
                  const age = patient.birth_date
                    ? calculateAge(patient.birth_date)
                    : null;
                  const isMinor = age !== null && age < 18;

                  return (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{patient.full_name}</p>
                          {patient.cedula && (
                            <p className="text-sm text-gray-500">
                              CI: {patient.cedula}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {age !== null ? (
                            <>
                              <span>{age} años</span>
                              {isMinor && (
                                <Badge variant="secondary" className="ml-2">
                                  Menor
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">
                              No especificada
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {patient.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1" />
                              {patient.phone}
                            </div>
                          )}
                          {patient.address && (
                            <div className="flex items-center text-sm text-gray-500">
                              <MapPin className="h-3 w-3 mr-1" />
                              {patient.address.substring(0, 30)}...
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {new Date(patient.created_at).toLocaleDateString(
                            "es-ES"
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={patient.is_active ? "default" : "secondary"}
                        >
                          {patient.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard/patients/${patient.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/dashboard/patients/${patient.id}/edit`
                              )
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
