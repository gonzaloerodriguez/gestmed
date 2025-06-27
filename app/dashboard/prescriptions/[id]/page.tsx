"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Copy,
  MessageCircle,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import {
  generatePrescriptionPDF,
  generateInstructionsPDF,
  generateWhatsAppURL,
  formatPhoneForWhatsApp,
} from "@/lib/pdf-generator";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import { usePrescriptionOperations } from "@/hooks/use-prescription-operations";
import type { Prescription } from "@/lib/supabase/types/prescription";
import type { Doctor } from "@/lib/supabase/types/doctor";

interface PrescriptionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function PrescriptionDetailPage({
  params,
}: PrescriptionDetailPageProps) {
  const router = useRouter();
  const { showError, showSuccess, showWarning } = useToastEnhanced();
  const {
    loading: operationLoading,
    deletePrescription,
    duplicatePrescription,
  } = usePrescriptionOperations();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params;
        setPrescriptionId(resolvedParams.id);
      } catch (error) {
        showError("Error", "No se pudieron cargar los parámetros de la página");
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
          .eq("doctor_id", user.id)
          .single();

      if (prescriptionError) throw prescriptionError;

      setPrescription(prescriptionData);
      setDoctor(prescriptionData.doctor);
    } catch (error: any) {
      showError("Error de carga", "No se pudo cargar la receta");
      router.push("/dashboard/prescriptions");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!prescription) return;

    const success = await deletePrescription(
      prescription.id,
      prescription.patient_name
    );

    if (success) {
      setDeleteDialogOpen(false);
      router.push("/dashboard/prescriptions");
    }
  };

  const handleDuplicate = async () => {
    if (!prescription) return;
    await duplicatePrescription(prescription);
  };

  const handleDownloadPDF = async (
    type: "complete" | "instructions" = "complete"
  ) => {
    if (!prescription || !doctor) return;

    setDownloading(true);
    try {
      let pdfBlob: Blob;
      let fileName: string;

      if (type === "instructions") {
        pdfBlob = await generateInstructionsPDF(prescription, doctor);
        fileName = `Instrucciones_${prescription.patient_name.replace(/\s+/g, "_")}_${
          new Date(prescription.date_prescribed).toISOString().split("T")[0]
        }.pdf`;
      } else {
        pdfBlob = await generatePrescriptionPDF(prescription, doctor);
        fileName = `Receta_${prescription.patient_name.replace(/\s+/g, "_")}_${
          new Date(prescription.date_prescribed).toISOString().split("T")[0]
        }.pdf`;
      }

      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);

      showSuccess(
        "Descarga exitosa",
        `El PDF ${type === "instructions" ? "de instrucciones" : "de la receta"} se ha descargado correctamente`
      );
    } catch (error: any) {
      showError("Error de descarga", "No se pudo generar el PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleShareWhatsApp = async (
    type: "complete" | "instructions" = "complete"
  ) => {
    if (!prescription || !doctor) return;

    // Verificar si el paciente tiene teléfono (con verificación de null/undefined)
    if (
      !prescription.patient_phone ||
      prescription.patient_phone.trim() === ""
    ) {
      showWarning(
        "Teléfono no disponible",
        "El paciente no tiene un número de teléfono registrado para compartir por WhatsApp"
      );
      return;
    }

    setSharing(true);
    try {
      // Generar mensaje personalizado
      const doctorTitle = doctor.gender === "female" ? "Dra." : "Dr.";
      let message: string;

      if (type === "instructions") {
        message = `¡Hola ${prescription.patient_name}! 

${doctorTitle} ${doctor.full_name} te envía las instrucciones detalladas para tu tratamiento médico del ${new Date(prescription.date_prescribed).toLocaleDateString("es-ES")}.

📋 *INSTRUCCIONES IMPORTANTES:*
${prescription.instructions}

💊 *MEDICAMENTOS:*
${prescription.medications}

⚠️ Es importante que sigas estas indicaciones al pie de la letra. Si tienes alguna duda, no dudes en contactarme.

${doctorTitle} ${doctor.full_name}
Mat. ${doctor.license_number}`;
      } else {
        message = `¡Hola ${prescription.patient_name}! 

${doctorTitle} ${doctor.full_name} te envía tu receta médica del ${new Date(prescription.date_prescribed).toLocaleDateString("es-ES")}.

${prescription.diagnosis ? `🩺 *Diagnóstico:* ${prescription.diagnosis}` : ""}

💊 *Medicamentos prescritos:*
${prescription.medications}

📋 *Instrucciones:*
${prescription.instructions}

⚠️ Sigue las indicaciones al pie de la letra. Ante cualquier duda, contáctame.

${doctorTitle} ${doctor.full_name}
Mat. ${doctor.license_number}`;
      }

      // Generar URL de WhatsApp
      const whatsappUrl = generateWhatsAppURL(
        prescription.patient_phone,
        message
      );

      // Abrir WhatsApp
      window.open(whatsappUrl, "_blank");

      showSuccess(
        "WhatsApp abierto",
        `Se ha abierto WhatsApp para enviar ${type === "instructions" ? "las instrucciones" : "la receta"} a ${prescription.patient_name}`
      );
    } catch (error: any) {
      showError("Error al compartir", "No se pudo abrir WhatsApp");
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Cargando receta...</p>
        </div>
      </div>
    );
  }

  if (!prescription || !doctor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Receta no encontrada</p>
          <Button onClick={() => router.push("/dashboard/prescriptions")}>
            Volver a Recetas
          </Button>
        </div>
      </div>
    );
  }

  // Verificación segura del teléfono del paciente
  const hasPatientPhone = Boolean(
    prescription.patient_phone && prescription.patient_phone.trim() !== ""
  );
  const formattedPhone = hasPatientPhone
    ? formatPhoneForWhatsApp(prescription.patient_phone!)
    : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Receta de {prescription.patient_name}
              </h1>
              <p className="text-gray-600">
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
            <div className="flex items-center space-x-2">
              {/* Botón de Descargar */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={downloading}>
                    {downloading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Descargar
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleDownloadPDF("complete")}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Receta Completa (2 páginas)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDownloadPDF("instructions")}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Solo Instrucciones
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Botón de Compartir WhatsApp */}
              {hasPatientPhone ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={sharing}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      {sharing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Compartiendo...
                        </>
                      ) : (
                        <>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          WhatsApp
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleShareWhatsApp("complete")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Enviar Receta Completa
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleShareWhatsApp("instructions")}
                    >
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Enviar Solo Instrucciones
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="opacity-50 bg-transparent"
                  title="El paciente no tiene teléfono registrado"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicate}
                disabled={operationLoading}
              >
                {operationLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Duplicar
              </Button>
              <Link href={`/dashboard/prescriptions/${prescription.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </Link>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={operationLoading}
              >
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
                      {hasPatientPhone && (
                        <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                          WhatsApp: +{formattedPhone}
                        </span>
                      )}
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
              <div className="bg-muted p-4 rounded-lg">
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

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar receta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La receta de{" "}
              <strong>{prescription.patient_name}</strong> será marcada como
              inactiva y no aparecerá en la lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={operationLoading}
            >
              {operationLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import {
//   Edit,
//   Download,
//   Trash2,
//   Calendar,
//   User,
//   Phone,
//   MapPin,
//   FileText,
//   Stethoscope,
//   Pill,
//   ClipboardList,
//   StickyNote,
//   Loader2,
//   Copy,
//   AlertCircle,
// } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import { generatePrescriptionPDF } from "@/lib/pdf-generator";
// import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
// import { usePrescriptionOperations } from "@/hooks/use-prescription-operations";
// import type { Prescription } from "@/lib/supabase/types/prescription";
// import type { Doctor } from "@/lib/supabase/types/doctor";

// interface PrescriptionDetailPageProps {
//   params: Promise<{ id: string }>;
// }

// export default function PrescriptionDetailPage({
//   params,
// }: PrescriptionDetailPageProps) {
//   const router = useRouter();
//   const { showError, showSuccess } = useToastEnhanced();
//   const {
//     loading: operationLoading,
//     deletePrescription,
//     duplicatePrescription,
//   } = usePrescriptionOperations();

//   const [loading, setLoading] = useState(true);
//   const [downloading, setDownloading] = useState(false);
//   const [prescription, setPrescription] = useState<Prescription | null>(null);
//   const [doctor, setDoctor] = useState<Doctor | null>(null);
//   const [prescriptionId, setPrescriptionId] = useState<string | null>(null);

//   useEffect(() => {
//     const resolveParams = async () => {
//       try {
//         const resolvedParams = await params;
//         setPrescriptionId(resolvedParams.id);
//       } catch (error) {
//         console.error("Error resolviendo parámetros:", error);
//         showError(
//           "Error de navegación",
//           "No se pudo cargar la página solicitada"
//         );
//         router.push("/dashboard/prescriptions");
//       }
//     };

//     resolveParams();
//   }, [params, router]);

//   useEffect(() => {
//     if (prescriptionId) {
//       loadPrescription();
//     }
//   }, [prescriptionId]);

//   const loadPrescription = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         router.push("/login");
//         return;
//       }

//       // Cargar receta con datos del médico
//       const { data: prescriptionData, error: prescriptionError } =
//         await supabase
//           .from("prescriptions")
//           .select(`*, doctor:doctors(*)`)
//           .eq("id", prescriptionId)
//           .eq("doctor_id", user.id) // Asegurar que solo vea sus propias recetas
//           .single();

//       if (prescriptionError) throw prescriptionError;

//       setPrescription(prescriptionData);
//       setDoctor(prescriptionData.doctor);
//     } catch (error: any) {
//       console.error("Error loading prescription:", error.message);
//       showError(
//         "Receta no encontrada",
//         "No se pudo cargar la receta solicitada"
//       );
//       router.push("/dashboard/prescriptions");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDelete = async () => {
//     if (!prescription) return;

//     const success = await deletePrescription(
//       prescription.id,
//       prescription.patient_name
//     );

//     if (success) {
//       router.push("/dashboard/prescriptions");
//     }
//   };

//   const handleDuplicatePrescription = async (prescription: Prescription) => {
//     await duplicatePrescription(prescription);
//   };

//   const handleDownloadPDF = async () => {
//     if (!prescription || !doctor) return;

//     setDownloading(true);
//     try {
//       // Generar PDF
//       const pdfBlob = await generatePrescriptionPDF(prescription, doctor);

//       // Crear URL para descargar
//       const pdfUrl = URL.createObjectURL(pdfBlob);

//       // Crear elemento de descarga
//       const link = document.createElement("a");
//       link.href = pdfUrl;
//       link.download = `Receta_${prescription.patient_name.replace(/\s+/g, "_")}_${
//         new Date(prescription.date_prescribed).toISOString().split("T")[0]
//       }.pdf`;

//       // Simular clic para descargar
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);

//       // Liberar URL
//       setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);

//       showSuccess("PDF generado", "La receta se ha descargado correctamente");
//     } catch (error: any) {
//       console.error("Error generating PDF:", error);
//       showError(
//         "Error al generar PDF",
//         error.message || "No se pudo generar el archivo PDF"
//       );
//     } finally {
//       setDownloading(false);
//     }
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
//       <header className="bg-card shadow-sm">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center justify-between py-6">
//             <div className="flex items-end justify-end space-x-2 w-full">
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={handleDownloadPDF}
//                 disabled={downloading}
//               >
//                 {downloading ? (
//                   <>
//                     <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                     Generando...
//                   </>
//                 ) : (
//                   <>
//                     <Download className="h-4 w-4 mr-2" />
//                     Descargar PDF
//                   </>
//                 )}
//               </Button>
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => handleDuplicatePrescription(prescription)}
//                 disabled={operationLoading}
//               >
//                 {operationLoading ? (
//                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                 ) : (
//                   <Copy className="h-4 w-4 mr-2" />
//                 )}
//                 Duplicar
//               </Button>
//               <Link href={`/dashboard/prescriptions/${prescription.id}/edit`}>
//                 <Button variant="outline" size="sm">
//                   <Edit className="h-4 w-4 mr-2" />
//                   Editar
//                 </Button>
//               </Link>
//               <Button
//                 variant="destructive"
//                 size="sm"
//                 onClick={handleDelete}
//                 disabled={operationLoading}
//               >
//                 {operationLoading ? (
//                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                 ) : (
//                   <Trash2 className="h-4 w-4 mr-2" />
//                 )}
//                 Eliminar
//               </Button>
//             </div>
//           </div>
//         </div>
//       </header>

//       <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="space-y-6">
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <Stethoscope className="h-5 w-5 mr-2" />
//                 Información del Médico
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <p className="text-sm text-muted-foreground">Médico</p>
//                   <p className="font-medium">
//                     {doctor.gender === "female" ? "Dra." : "Dr."}{" "}
//                     {doctor.full_name}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-muted-foreground">Matrícula</p>
//                   <p className="font-medium">{doctor.license_number}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-muted-foreground">Especialidad</p>
//                   <p className="font-medium">
//                     {doctor.specialty || "Médico General"}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-muted-foreground">
//                     Fecha de Prescripción
//                   </p>
//                   <p className="font-medium flex items-center">
//                     <Calendar className="h-4 w-4 mr-1" />
//                     {new Date(prescription.date_prescribed).toLocaleDateString(
//                       "es-ES",
//                       {
//                         year: "numeric",
//                         month: "long",
//                         day: "numeric",
//                       }
//                     )}
//                   </p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <User className="h-5 w-5 mr-2" />
//                 Información del Paciente
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <p className="text-sm text-muted-foreground">
//                     Nombre Completo
//                   </p>
//                   <p className="font-medium">{prescription.patient_name}</p>
//                 </div>
//                 {prescription.patient_age && (
//                   <div>
//                     <p className="text-sm text-muted-foreground">Edad</p>
//                     <p className="font-medium">
//                       {prescription.patient_age} años
//                     </p>
//                   </div>
//                 )}
//                 {prescription.patient_cedula && (
//                   <div>
//                     <p className="text-sm text-muted-foreground">
//                       Cédula de Identidad
//                     </p>
//                     <p className="font-medium">{prescription.patient_cedula}</p>
//                   </div>
//                 )}
//                 {prescription.patient_phone && (
//                   <div>
//                     <p className="text-sm text-muted-foreground">Teléfono</p>
//                     <p className="font-medium flex items-center">
//                       <Phone className="h-4 w-4 mr-1" />
//                       {prescription.patient_phone}
//                     </p>
//                   </div>
//                 )}
//               </div>
//               {prescription.patient_address && (
//                 <div className="mt-4">
//                   <p className="text-sm text-muted-foreground">Dirección</p>
//                   <p className="font-medium flex items-center">
//                     <MapPin className="h-4 w-4 mr-1" />
//                     {prescription.patient_address}
//                   </p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>

//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//             {prescription.diagnosis && (
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="flex items-center">
//                     <FileText className="h-5 w-5 mr-2" />
//                     Diagnóstico
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <p className="whitespace-pre-wrap">
//                     {prescription.diagnosis}
//                   </p>
//                 </CardContent>
//               </Card>
//             )}

//             {prescription.notes && (
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="flex items-center">
//                     <StickyNote className="h-5 w-5 mr-2" />
//                     Notas Adicionales
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <p className="whitespace-pre-wrap">{prescription.notes}</p>
//                 </CardContent>
//               </Card>
//             )}
//           </div>

//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <Pill className="h-5 w-5 mr-2" />
//                 Medicamentos Prescritos
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="bg-muted p-4 rounded-lg">
//                 <p className="whitespace-pre-wrap font-mono text-sm">
//                   {prescription.medications}
//                 </p>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <ClipboardList className="h-5 w-5 mr-2" />
//                 Instrucciones para el Paciente
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
//                 <p className="whitespace-pre-wrap">
//                   {prescription.instructions}
//                 </p>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Información de Creación */}
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex justify-between items-center text-sm text-muted-foreground">
//                 <span>
//                   Creada el{" "}
//                   {new Date(prescription.created_at).toLocaleDateString(
//                     "es-ES"
//                   )}{" "}
//                   a las{" "}
//                   {new Date(prescription.created_at).toLocaleTimeString(
//                     "es-ES",
//                     {
//                       hour: "2-digit",
//                       minute: "2-digit",
//                     }
//                   )}
//                 </span>
//                 {prescription.updated_at !== prescription.created_at && (
//                   <span>
//                     Última modificación:{" "}
//                     {new Date(prescription.updated_at).toLocaleDateString(
//                       "es-ES"
//                     )}{" "}
//                     a las{" "}
//                     {new Date(prescription.updated_at).toLocaleTimeString(
//                       "es-ES",
//                       {
//                         hour: "2-digit",
//                         minute: "2-digit",
//                       }
//                     )}
//                   </span>
//                 )}
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       </main>
//     </div>
//   );
// }

// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import {
//   Edit,
//   Download,
//   Trash2,
//   Calendar,
//   User,
//   Phone,
//   MapPin,
//   FileText,
//   Stethoscope,
//   Pill,
//   ClipboardList,
//   StickyNote,
//   Loader2,
// } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import { generatePrescriptionPDF } from "@/lib/pdf-generator";
// import { Prescription } from "@/lib/supabase/types/prescription";
// import { Doctor } from "@/lib/supabase/types/doctor";

// interface PrescriptionDetailPageProps {
//   params: Promise<{ id: string }>;
// }
// export default function PrescriptionDetailPage({
//   params,
// }: PrescriptionDetailPageProps) {
//   const router = useRouter();
//   const [loading, setLoading] = useState(true);
//   const [downloading, setDownloading] = useState(false);
//   const [prescription, setPrescription] = useState<Prescription | null>(null);
//   const [doctor, setDoctor] = useState<Doctor | null>(null);
//   const [prescriptionId, setPrescriptionId] = useState<string | null>(null);

//   useEffect(() => {
//     const resolveParams = async () => {
//       try {
//         const resolvedParams = await params;
//         setPrescriptionId(resolvedParams.id);
//       } catch (error) {
//         console.error("Error resolviendo parámetros:", error);
//         router.push("/dashboard/prescriptions");
//       }
//     };

//     resolveParams();
//   }, [params, router]);
//   useEffect(() => {
//     if (prescriptionId) {
//       loadPrescription();
//     }
//   }, [prescriptionId]);
//   const loadPrescription = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         router.push("/login");
//         return;
//       }

//       // Cargar receta con datos del médico
//       const { data: prescriptionData, error: prescriptionError } =
//         await supabase
//           .from("prescriptions")
//           .select(
//             `
//           *,
//           doctor:doctors(*)
//         `
//           )
//           .eq("id", prescriptionId)
//           .eq("doctor_id", user.id) // Asegurar que solo vea sus propias recetas
//           .single();

//       if (prescriptionError) throw prescriptionError;

//       setPrescription(prescriptionData);
//       setDoctor(prescriptionData.doctor);
//     } catch (error: any) {
//       console.error("Error loading prescription:", error.message);
//       router.push("/dashboard/prescriptions");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleDelete = async () => {
//     if (!prescription) return;

//     const confirmDelete = confirm(
//       "¿Estás seguro de que quieres eliminar esta receta?"
//     );
//     if (!confirmDelete) return;

//     try {
//       const { error } = await supabase
//         .from("prescriptions")
//         .update({ is_active: false })
//         .eq("id", prescription.id);

//       if (error) throw error;

//       alert("Receta eliminada correctamente");
//       router.push("/dashboard/prescriptions");
//     } catch (error: any) {
//       alert("Error al eliminar receta: " + error.message);
//     }
//   };

//   const handleDownloadPDF = async () => {
//     if (!prescription || !doctor) return;

//     setDownloading(true);
//     try {
//       // Generar PDF
//       const pdfBlob = await generatePrescriptionPDF(prescription, doctor);

//       // Crear URL para descargar
//       const pdfUrl = URL.createObjectURL(pdfBlob);

//       // Crear elemento de descarga
//       const link = document.createElement("a");
//       link.href = pdfUrl;
//       link.download = `Receta_${prescription.patient_name.replace(
//         /\s+/g,
//         "_"
//       )}_${
//         new Date(prescription.date_prescribed).toISOString().split("T")[0]
//       }.pdf`;

//       // Simular clic para descargar
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);

//       // Liberar URL
//       setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
//     } catch (error: any) {
//       console.error("Error generating PDF:", error);
//       alert("Error al generar PDF: " + error.message);
//     } finally {
//       setDownloading(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-muted-foreground">Cargando receta...</p>
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
//       <header className="bg-card shadow-sm">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center justify-between py-6">
//             <div className="flex items-end justify-end space-x-2 w-full">
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={handleDownloadPDF}
//                 disabled={downloading}
//               >
//                 {downloading ? (
//                   <>
//                     <Loader2 className="h-4 w-4 mr-2 animate-spin" />
//                     Generando...
//                   </>
//                 ) : (
//                   <>
//                     <Download className="h-4 w-4 mr-2" />
//                     Descargar PDF
//                   </>
//                 )}
//               </Button>
//               <Link href={`/dashboard/prescriptions/${prescription.id}/edit`}>
//                 <Button variant="outline" size="sm">
//                   <Edit className="h-4 w-4 mr-2" />
//                   Editar
//                 </Button>
//               </Link>
//               <Button variant="destructive" size="sm" onClick={handleDelete}>
//                 <Trash2 className="h-4 w-4 mr-2" />
//                 Eliminar
//               </Button>
//             </div>
//           </div>
//         </div>
//       </header>

//       <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="space-y-6">
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <Stethoscope className="h-5 w-5 mr-2" />
//                 Información del Médico
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <p className="text-sm text-muted-foreground">Médico</p>
//                   <p className="font-medium">
//                     {doctor.gender === "female" ? "Dra." : "Dr."}{" "}
//                     {doctor.full_name}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-muted-foreground">Matrícula</p>
//                   <p className="font-medium">{doctor.license_number}</p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-muted-foreground">Especialidad</p>
//                   <p className="font-medium">
//                     {doctor.specialty || "Médico General"}
//                   </p>
//                 </div>
//                 <div>
//                   <p className="text-sm text-muted-foreground">
//                     Fecha de Prescripción
//                   </p>
//                   <p className="font-medium flex items-center">
//                     <Calendar className="h-4 w-4 mr-1" />
//                     {new Date(prescription.date_prescribed).toLocaleDateString(
//                       "es-ES",
//                       {
//                         year: "numeric",
//                         month: "long",
//                         day: "numeric",
//                       }
//                     )}
//                   </p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <User className="h-5 w-5 mr-2" />
//                 Información del Paciente
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <p className="text-sm text-muted-foreground">
//                     Nombre Completo
//                   </p>
//                   <p className="font-medium">{prescription.patient_name}</p>
//                 </div>
//                 {prescription.patient_age && (
//                   <div>
//                     <p className="text-sm text-muted-foreground">Edad</p>
//                     <p className="font-medium">
//                       {prescription.patient_age} años
//                     </p>
//                   </div>
//                 )}
//                 {prescription.patient_cedula && (
//                   <div>
//                     <p className="text-sm text-muted-foreground">
//                       Cédula de Identidad
//                     </p>
//                     <p className="font-medium">{prescription.patient_cedula}</p>
//                   </div>
//                 )}
//                 {prescription.patient_phone && (
//                   <div>
//                     <p className="text-sm text-muted-foreground">Teléfono</p>
//                     <p className="font-medium flex items-center">
//                       <Phone className="h-4 w-4 mr-1" />
//                       {prescription.patient_phone}
//                     </p>
//                   </div>
//                 )}
//               </div>
//               {prescription.patient_address && (
//                 <div className="mt-4">
//                   <p className="text-sm text-muted-foreground">Dirección</p>
//                   <p className="font-medium flex items-center">
//                     <MapPin className="h-4 w-4 mr-1" />
//                     {prescription.patient_address}
//                   </p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>

//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//             {prescription.diagnosis && (
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="flex items-center">
//                     <FileText className="h-5 w-5 mr-2" />
//                     Diagnóstico
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <p className="whitespace-pre-wrap">
//                     {prescription.diagnosis}
//                   </p>
//                 </CardContent>
//               </Card>
//             )}

//             {prescription.notes && (
//               <Card>
//                 <CardHeader>
//                   <CardTitle className="flex items-center">
//                     <StickyNote className="h-5 w-5 mr-2" />
//                     Notas Adicionales
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <p className="whitespace-pre-wrap">{prescription.notes}</p>
//                 </CardContent>
//               </Card>
//             )}
//           </div>

//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <Pill className="h-5 w-5 mr-2" />
//                 Medicamentos Prescritos
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="bg-background p-4 rounded-lg">
//                 <p className="whitespace-pre-wrap font-mono text-sm">
//                   {prescription.medications}
//                 </p>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <ClipboardList className="h-5 w-5 mr-2" />
//                 Instrucciones para el Paciente
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
//                 <p className="whitespace-pre-wrap">
//                   {prescription.instructions}
//                 </p>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Información de Creación */}
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex justify-between items-center text-sm text-muted-foreground">
//                 <span>
//                   Creada el{" "}
//                   {new Date(prescription.created_at).toLocaleDateString(
//                     "es-ES"
//                   )}{" "}
//                   a las{" "}
//                   {new Date(prescription.created_at).toLocaleTimeString(
//                     "es-ES",
//                     {
//                       hour: "2-digit",
//                       minute: "2-digit",
//                     }
//                   )}
//                 </span>
//                 {prescription.updated_at !== prescription.created_at && (
//                   <span>
//                     Última modificación:{" "}
//                     {new Date(prescription.updated_at).toLocaleDateString(
//                       "es-ES"
//                     )}{" "}
//                     a las{" "}
//                     {new Date(prescription.updated_at).toLocaleTimeString(
//                       "es-ES",
//                       {
//                         hour: "2-digit",
//                         minute: "2-digit",
//                       }
//                     )}
//                   </span>
//                 )}
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       </main>
//     </div>
//   );
// }
