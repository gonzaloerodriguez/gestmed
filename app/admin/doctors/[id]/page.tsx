"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Shield,
  FileText,
  Activity,
  Download,
  Eye,
} from "lucide-react";
import {
  supabase,
  type Doctor,
  type Prescription,
  type Admin,
} from "@/lib/supabase";
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
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";

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
  const [stats, setStats] = useState({
    totalPrescriptions: 0,
    activePrescriptions: 0,
    thisMonthPrescriptions: 0,
  });

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAction, setPaymentAction] = useState<
    "approve" | "reject" | null
  >(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentProofSignedUrl, setPaymentProofSignedUrl] = useState<
    string | null
  >(null);
  const [generatingUrl, setGeneratingUrl] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, [id]);

  const checkAdminAndLoadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Verificar si es administrador
      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("id", user.id)
        .single();

      if (adminError || !adminData) {
        alert("Acceso denegado. No tienes permisos de administrador.");
        router.push("/dashboard");
        return;
      }

      setAdmin(adminData);

      // Cargar datos del médico
      await loadDoctor();
      await loadPrescriptions();
    } catch (error: any) {
      console.error("Error:", error.message);
      router.push("/admin");
    } finally {
      setLoading(false);
    }
  };

  const loadDoctor = async () => {
    try {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setDoctor(data);

      // Generar signed URL si hay comprobante de pago
      if (data.payment_proof_url) {
        await generatePaymentProofSignedUrl(data.payment_proof_url);
      }
    } catch (error: any) {
      console.error("Error loading doctor:", error.message);
      router.push("/admin");
    }
  };

  const loadPrescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("doctor_id", id)
        .order("created_at", { ascending: false })
        .limit(10);
      console.log(data);

      if (error) throw error;

      setPrescriptions(data || []);

      // Calcular estadísticas
      const { count: totalPrescriptions } = await supabase
        .from("prescriptions")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", id);

      const { count: activePrescriptions } = await supabase
        .from("prescriptions")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", id)
        .eq("is_active", true);

      // Recetas de este mes
      const now = new Date();
      const firstDayOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).toISOString();

      const { count: thisMonthPrescriptions } = await supabase
        .from("prescriptions")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", id)
        .gte("created_at", firstDayOfMonth);

      setStats({
        totalPrescriptions: totalPrescriptions || 0,
        activePrescriptions: activePrescriptions || 0,
        thisMonthPrescriptions: thisMonthPrescriptions || 0,
      });
    } catch (error: any) {
      console.error("Error loading prescriptions:", error.message);
    }
  };

  const generatePaymentProofSignedUrl = async (filePath: string) => {
    if (!filePath) return;

    setGeneratingUrl(true);
    try {
      const response = await fetch("/api/get-signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
      });

      if (response.ok) {
        const { signedUrl } = await response.json();
        setPaymentProofSignedUrl(signedUrl);
      } else {
        console.error("Error generating signed URL");
        setPaymentProofSignedUrl(null);
      }
    } catch (error) {
      console.error("Error generating signed URL:", error);
      setPaymentProofSignedUrl(null);
    } finally {
      setGeneratingUrl(false);
    }
  };

  const handleRefreshPaymentUrl = async () => {
    if (doctor?.payment_proof_url) {
      await generatePaymentProofSignedUrl(doctor.payment_proof_url);
    }
  };

  const handlePaymentVerification = async (action: "approve" | "reject") => {
    if (!doctor || !admin) return;

    setProcessingPayment(true);
    try {
      const response = await fetch("/api/admin/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctor.id,
          action,
          adminId: admin.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al procesar verificación");
      }

      // Actualizar estado local del doctor
      setDoctor({
        ...doctor,
        ...result.updatedData,
      });

      alert(
        `Pago ${action === "approve" ? "aprobado" : "rechazado"} exitosamente`
      );
      setPaymentDialogOpen(false);
      setPaymentAction(null);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const openPaymentDialog = (action: "approve" | "reject") => {
    setPaymentAction(action);
    setPaymentDialogOpen(true);
  };

  const handleViewPaymentProof = () => {
    if (paymentProofSignedUrl) {
      window.open(paymentProofSignedUrl, "_blank");
    } else {
      alert("Generando enlace de visualización...");
      if (doctor?.payment_proof_url) {
        generatePaymentProofSignedUrl(doctor.payment_proof_url);
      }
    }
  };

  const handleDownloadPaymentProof = () => {
    if (paymentProofSignedUrl) {
      const link = document.createElement("a");
      link.href = paymentProofSignedUrl;
      link.download = `comprobante_pago_${doctor?.full_name || "doctor"}.${doctor?.payment_proof_url?.includes(".pdf") ? "pdf" : "jpg"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("Generando enlace de descarga...");
      if (doctor?.payment_proof_url) {
        generatePaymentProofSignedUrl(doctor.payment_proof_url);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Cargando información del médico...
          </p>
        </div>
      </div>
    );
  }

  if (!doctor || !admin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Médico no encontrado</p>
          <Button onClick={() => router.push("/admin")} className="mt-4">
            Volver al Panel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="max-w-7xl bg-background mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => router.push("/admin")}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {doctor.gender === "female" ? "Dra." : "Dr."}{" "}
                  {doctor.full_name}
                </h1>
                <p className="text-muted-foreground">
                  Información detallada del médico
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={doctor.is_active ? "default" : "secondary"}>
                {doctor.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl bg-background mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8">
          {/* Información Personal */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Nombre Completo
                  </p>
                  <p className="font-medium">{doctor.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Cédula de Identidad
                  </p>
                  <p className="font-medium">{doctor.cedula}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sexo</p>
                  <p className="font-medium">
                    {doctor.gender === "female" ? "Femenino" : "Masculino"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Correo Electrónico
                  </p>
                  <p className="font-medium flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {doctor.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Número de Matrícula
                  </p>
                  <p className="font-medium flex items-center">
                    <Shield className="h-4 w-4 mr-1" />
                    {doctor.license_number}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Especialidad</p>
                  <p className="font-medium">
                    {doctor.specialty || "Médico General"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Fecha de Registro
                  </p>
                  <p className="font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(doctor.created_at).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Documentos */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {doctor.signature_stamp_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Firma y Sello
                    </p>
                    <div className="border rounded-lg p-2 bg-background">
                      <img
                        src={doctor.signature_stamp_url || "/placeholder.svg"}
                        alt="Firma y sello"
                        className="max-h-20 mx-auto"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                )}
                {doctor.document_url && (
                  <div>
                    <p className="text-sm text-muted-foreground  mb-2">
                      Documento de Credencial
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(doctor.document_url!, "_blank")
                      }
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Ver Documento
                    </Button>
                  </div>
                )}
                {!doctor.signature_stamp_url && !doctor.document_url && (
                  <p className="text-sm text-muted-foreground">
                    No hay documentos cargados
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Información de Pago
                  </div>
                  {doctor.payment_proof_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshPaymentUrl}
                      disabled={generatingUrl}
                    >
                      <RefreshCw
                        className={`h-4 w-4 mr-2 ${generatingUrl ? "animate-spin" : ""}`}
                      />
                      {generatingUrl ? "Generando..." : "Actualizar"}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Estado de Suscripción
                    </label>
                    <div className="flex items-center mt-1">
                      {doctor.subscription_status === "active" && (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                          <Badge variant="default">Activa</Badge>
                        </>
                      )}
                      {doctor.subscription_status ===
                        "pending_verification" && (
                        <>
                          <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                          <Badge variant="secondary">
                            Pendiente Verificación
                          </Badge>
                        </>
                      )}
                      {doctor.subscription_status === "expired" && (
                        <>
                          <XCircle className="h-4 w-4 mr-2 text-red-600" />
                          <Badge variant="destructive">Vencida</Badge>
                        </>
                      )}
                    </div>
                  </div>

                  {doctor.last_payment_date && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Último Pago
                      </label>
                      <p className="text-lg">
                        {new Date(doctor.last_payment_date).toLocaleDateString(
                          "es-ES"
                        )}
                      </p>
                    </div>
                  )}

                  {doctor.next_payment_date && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Próximo Pago
                      </label>
                      <p className="text-lg">
                        {new Date(doctor.next_payment_date).toLocaleDateString(
                          "es-ES"
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Proof */}
                {doctor.payment_proof_url && (
                  <div className="border-t pt-4">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Comprobante de Pago
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                        <div className="flex items-center">
                          <CreditCard className="h-5 w-5 mr-3 text-blue-600" />
                          <div>
                            <p className="font-medium">Comprobante Subido</p>
                            <p className="text-sm text-muted-foreground">
                              {doctor.subscription_status ===
                              "pending_verification"
                                ? "Pendiente de verificación"
                                : "Verificado"}
                            </p>
                            {paymentProofSignedUrl && (
                              <p className="text-xs text-green-600">
                                ✓ Enlace disponible
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleViewPaymentProof}
                            disabled={generatingUrl}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadPaymentProof}
                            disabled={generatingUrl}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar
                          </Button>
                        </div>
                      </div>

                      {/* Verification Actions */}
                      {doctor.subscription_status ===
                        "pending_verification" && (
                        <div className="flex space-x-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openPaymentDialog("approve")}
                            className="bg-green-600 hover:bg-green-700 flex-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Aprobar Pago
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openPaymentDialog("reject")}
                            className="flex-1"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Rechazar Pago
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!doctor.payment_proof_url &&
                  doctor.subscription_status !== "active" && (
                    <div className="text-center py-4 text-muted-foreground">
                      <CreditCard className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">
                        No hay comprobante de pago subido
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>
          </div>

          {/* Estadísticas y Recetas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Recetas
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.totalPrescriptions}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Recetas Activas
                  </CardTitle>
                  <Activity className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.activePrescriptions}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Este Mes
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.thisMonthPrescriptions}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recetas Recientes */}
            <Card>
              <CardHeader>
                <CardTitle>Recetas Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                {prescriptions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No hay recetas creadas</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Diagnóstico</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prescriptions.map((prescription) => (
                          <TableRow key={prescription.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {prescription.patient_name}
                                </div>
                                {prescription.patient_age && (
                                  <div className="text-sm text-gray-500">
                                    {prescription.patient_age} años
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="text-sm">
                                  {new Date(
                                    prescription.date_prescribed
                                  ).toLocaleDateString("es-ES")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(
                                    prescription.created_at
                                  ).toLocaleTimeString("es-ES", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate">
                                {prescription.diagnosis || "Sin diagnóstico"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  prescription.is_active
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {prescription.is_active ? "Activa" : "Inactiva"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Payment Verification Dialog */}
      <AlertDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {paymentAction === "approve" ? "Aprobar Pago" : "Rechazar Pago"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {paymentAction === "approve"
                ? `¿Estás seguro de que quieres aprobar el pago de ${doctor?.full_name}? Esto activará su cuenta por un mes más.`
                : `¿Estás seguro de que quieres rechazar el pago de ${doctor?.full_name}? Su cuenta permanecerá inactiva.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingPayment}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                paymentAction && handlePaymentVerification(paymentAction)
              }
              disabled={processingPayment}
              className={
                paymentAction === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {processingPayment
                ? "Procesando..."
                : paymentAction === "approve"
                  ? "Aprobar"
                  : "Rechazar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
