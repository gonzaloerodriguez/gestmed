"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Mail,
  FileText,
  User,
  Shield,
  Download,
  Eye,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  supabase,
  type Doctor,
  type Admin,
  type Prescription,
} from "@/lib/supabase";

interface DoctorDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function DoctorDetailPage({ params }: DoctorDetailPageProps) {
  // Unwrap params using React.use()
  const { id } = use(params);

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoadData();
  }, [id]);

  const checkAdminAndLoadData = async () => {
    try {
      // Verificar que el usuario actual es administrador
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("id", user.id)
        .single();

      if (adminError || !adminData) {
        setError("No tienes permisos para ver esta información");
        return;
      }

      setAdmin(adminData);

      // Cargar datos del médico
      await loadDoctorData();
      await loadPrescriptions();
    } catch (error: any) {
      console.error("Error:", error);
      setError("Error al cargar la información: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorData = async () => {
    try {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          setError("Médico no encontrado");
        } else {
          setError("Error al cargar datos del médico: " + error.message);
        }
        return;
      }

      setDoctor(data);
    } catch (error: any) {
      console.error("Error loading doctor:", error);
      setError("Error al cargar datos del médico");
    }
  };

  const loadPrescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("doctor_id", id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading prescriptions:", error);
        return;
      }

      setPrescriptions(data || []);
    } catch (error: any) {
      console.error("Error loading prescriptions:", error);
    }
  };

  const toggleDoctorStatus = async () => {
    if (!doctor) return;

    try {
      const newStatus = !doctor.is_active;

      const { error } = await supabase
        .from("doctors")
        .update({ is_active: newStatus })
        .eq("id", doctor.id);

      if (error) throw error;

      setDoctor({ ...doctor, is_active: newStatus });
    } catch (error: any) {
      alert("Error al actualizar estado: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Cargando información del médico...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => router.push("/admin")}>
            Volver al Panel de Administrador
          </Button>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Médico no encontrado</p>
          <Button onClick={() => router.push("/admin")}>
            Volver al Panel de Administrador
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {doctor.gender === "female" ? "Dra." : "Dr."}{" "}
                  {doctor.full_name}
                </h1>
                <p className="text-gray-600">Detalles del médico</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={doctor.is_active ? "default" : "secondary"}>
                {doctor.is_active ? "Activo" : "Inactivo"}
              </Badge>
              <Button
                variant={doctor.is_active ? "destructive" : "default"}
                size="sm"
                onClick={toggleDoctorStatus}
              >
                {doctor.is_active ? (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Desactivar
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Doctor Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Nombre Completo
                    </label>
                    <p className="text-lg font-medium">{doctor.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Género
                    </label>
                    <p className="text-lg">
                      {doctor.gender === "female" ? "Femenino" : "Masculino"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Cédula de Identidad
                    </label>
                    <p className="text-lg font-mono">{doctor.cedula}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Matrícula Profesional
                    </label>
                    <p className="text-lg font-mono">{doctor.license_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Email
                    </label>
                    <p className="text-lg flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {doctor.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Especialidad
                    </label>
                    <p className="text-lg">
                      {doctor.specialty || "Médico General"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {doctor.document_url ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 mr-3 text-blue-600" />
                        <div>
                          <p className="font-medium">Documento de Identidad</p>
                          <p className="text-sm text-gray-500">
                            Archivo subido
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={doctor.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={doctor.document_url} download>
                            <Download className="h-4 w-4 mr-2" />
                            Descargar
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No hay documentos subidos</p>
                    </div>
                  )}

                  {doctor.signature_stamp_url ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Shield className="h-5 w-5 mr-3 text-green-600" />
                        <div>
                          <p className="font-medium">Sello y Firma</p>
                          <p className="text-sm text-gray-500">
                            Archivo subido
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={doctor.signature_stamp_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={doctor.signature_stamp_url} download>
                            <Download className="h-4 w-4 mr-2" />
                            Descargar
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No hay sello y firma subidos</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Recetas Activas</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {prescriptions.length}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Fecha de Registro
                  </span>
                  <span className="text-sm font-medium">
                    {new Date(doctor.created_at).toLocaleDateString("es-ES")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Estado</span>
                  <Badge variant={doctor.is_active ? "default" : "secondary"}>
                    {doctor.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recent Prescriptions */}
            <Card>
              <CardHeader>
                <CardTitle>Recetas Recientes</CardTitle>
                <CardDescription>Últimas 10 recetas emitidas</CardDescription>
              </CardHeader>
              <CardContent>
                {prescriptions.length > 0 ? (
                  <div className="space-y-3">
                    {prescriptions.map((prescription) => (
                      <div
                        key={prescription.id}
                        className="p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">
                            {prescription.patient_name}
                          </p>
                          <span className="text-xs text-gray-500">
                            {new Date(
                              prescription.date_prescribed
                            ).toLocaleDateString("es-ES")}
                          </span>
                        </div>
                        {prescription.diagnosis && (
                          <p className="text-xs text-gray-600 mb-1">
                            <strong>Diagnóstico:</strong>{" "}
                            {prescription.diagnosis}
                          </p>
                        )}
                        <p className="text-xs text-gray-600">
                          <strong>Medicamentos:</strong>{" "}
                          {prescription.medications?.length || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No hay recetas registradas</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
