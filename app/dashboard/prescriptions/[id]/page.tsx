"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Edit,
  Download,
  Trash2,
  Calendar,
  User,
  Phone,
  MapPin,
  FileText,
  Stethoscope,
  Pill,
  ClipboardList,
  StickyNote,
  Loader2,
} from "lucide-react";
import { supabase, type Prescription, type Doctor } from "@/lib/supabase";
import { generatePrescriptionPDF } from "@/lib/pdf-generator";

interface PrescriptionDetailPageProps {
  params: Promise<{ id: string }>;
}
export default function PrescriptionDetailPage({
  params,
}: PrescriptionDetailPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);

  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params;
        setPrescriptionId(resolvedParams.id);
      } catch (error) {
        console.error("Error resolviendo parámetros:", error);
        router.push("/dashboard/prescriptions");
      }
    };

    resolveParams();
  }, [params, router]);
  useEffect(() => {
    if (prescriptionId) {
      loadPrescription();
    }
  }, [prescriptionId]);
  const loadPrescription = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Cargar receta con datos del médico
      const { data: prescriptionData, error: prescriptionError } =
        await supabase
          .from("prescriptions")
          .select(
            `
          *,
          doctor:doctors(*)
        `
          )
          .eq("id", prescriptionId)
          .eq("doctor_id", user.id) // Asegurar que solo vea sus propias recetas
          .single();

      if (prescriptionError) throw prescriptionError;

      setPrescription(prescriptionData);
      setDoctor(prescriptionData.doctor);
    } catch (error: any) {
      console.error("Error loading prescription:", error.message);
      router.push("/dashboard/prescriptions");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!prescription) return;

    const confirmDelete = confirm(
      "¿Estás seguro de que quieres eliminar esta receta?"
    );
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("prescriptions")
        .update({ is_active: false })
        .eq("id", prescription.id);

      if (error) throw error;

      alert("Receta eliminada correctamente");
      router.push("/dashboard/prescriptions");
    } catch (error: any) {
      alert("Error al eliminar receta: " + error.message);
    }
  };

  const handleDownloadPDF = async () => {
    if (!prescription || !doctor) return;

    setDownloading(true);
    try {
      // Generar PDF
      const pdfBlob = await generatePrescriptionPDF(prescription, doctor);

      // Crear URL para descargar
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Crear elemento de descarga
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `Receta_${prescription.patient_name.replace(
        /\s+/g,
        "_"
      )}_${
        new Date(prescription.date_prescribed).toISOString().split("T")[0]
      }.pdf`;

      // Simular clic para descargar
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Liberar URL
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      alert("Error al generar PDF: " + error.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando receta...</p>
        </div>
      </div>
    );
  }

  if (!prescription || !doctor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Receta no encontrada</p>
          <Button
            onClick={() => router.push("/dashboard/prescriptions")}
            className="mt-4"
          >
            Volver a Recetas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-end justify-end space-x-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF
                  </>
                )}
              </Button>
              <Link href={`/dashboard/prescriptions/${prescription.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </Link>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Stethoscope className="h-5 w-5 mr-2" />
                Información del Médico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Médico</p>
                  <p className="font-medium">
                    {doctor.gender === "female" ? "Dra." : "Dr."}{" "}
                    {doctor.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Matrícula</p>
                  <p className="font-medium">{doctor.license_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Especialidad</p>
                  <p className="font-medium">
                    {doctor.specialty || "Médico General"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Fecha de Prescripción
                  </p>
                  <p className="font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(prescription.date_prescribed).toLocaleDateString(
                      "es-ES",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Información del Paciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Nombre Completo
                  </p>
                  <p className="font-medium">{prescription.patient_name}</p>
                </div>
                {prescription.patient_age && (
                  <div>
                    <p className="text-sm text-muted-foreground">Edad</p>
                    <p className="font-medium">
                      {prescription.patient_age} años
                    </p>
                  </div>
                )}
                {prescription.patient_cedula && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Cédula de Identidad
                    </p>
                    <p className="font-medium">{prescription.patient_cedula}</p>
                  </div>
                )}
                {prescription.patient_phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-medium flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {prescription.patient_phone}
                    </p>
                  </div>
                )}
              </div>
              {prescription.patient_address && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Dirección</p>
                  <p className="font-medium flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {prescription.patient_address}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {prescription.diagnosis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Diagnóstico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">
                    {prescription.diagnosis}
                  </p>
                </CardContent>
              </Card>
            )}

            {prescription.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <StickyNote className="h-5 w-5 mr-2" />
                    Notas Adicionales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{prescription.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Pill className="h-5 w-5 mr-2" />
                Medicamentos Prescritos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-background p-4 rounded-lg">
                <p className="whitespace-pre-wrap font-mono text-sm">
                  {prescription.medications}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardList className="h-5 w-5 mr-2" />
                Instrucciones para el Paciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <p className="whitespace-pre-wrap">
                  {prescription.instructions}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Información de Creación */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>
                  Creada el{" "}
                  {new Date(prescription.created_at).toLocaleDateString(
                    "es-ES"
                  )}{" "}
                  a las{" "}
                  {new Date(prescription.created_at).toLocaleTimeString(
                    "es-ES",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </span>
                {prescription.updated_at !== prescription.created_at && (
                  <span>
                    Última modificación:{" "}
                    {new Date(prescription.updated_at).toLocaleDateString(
                      "es-ES"
                    )}{" "}
                    a las{" "}
                    {new Date(prescription.updated_at).toLocaleTimeString(
                      "es-ES",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
