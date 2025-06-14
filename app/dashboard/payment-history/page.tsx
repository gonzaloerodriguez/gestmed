"use client";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  FileText,
  ImageIcon,
  Eye,
  Download,
  Calendar,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { supabase, type Doctor } from "@/lib/supabase";

interface PaymentProof {
  name: string;
  size: number;
  created_at: string;
  updated_at: string;
  filePath: string;
  signedUrl: string | null;
  fileType: "pdf" | "image";
}

export default function PaymentHistoryPage() {
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [paymentProofs, setPaymentProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadDoctorAndPayments();
  }, []);

  const loadDoctorAndPayments = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Cargar datos del doctor
      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("*")
        .eq("id", user.id)
        .single();

      if (doctorError) throw doctorError;
      setDoctor(doctorData);

      // Cargar comprobantes de pago
      await loadPaymentProofs(user.id);
    } catch (error: any) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentProofs = async (userId: string) => {
    try {
      const response = await fetch(`/api/list-payment-proofs?userId=${userId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error loading payment proofs");
      }

      const { paymentProofs: proofs } = await response.json();
      setPaymentProofs(proofs);
    } catch (error: any) {
      console.error("Error loading payment proofs:", error);
    }
  };

  const handleRefresh = async () => {
    if (!doctor) return;

    setRefreshing(true);
    try {
      await loadPaymentProofs(doctor.id);
    } catch (error: any) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteFile = async (proof: PaymentProof) => {
    if (!doctor) return;

    const confirmDelete = confirm(
      `¿Estás seguro de que quieres eliminar el comprobante "${proof.name}"? Esta acción no se puede deshacer.`
    );

    if (!confirmDelete) return;

    setDeleting(proof.filePath);

    try {
      const response = await fetch(
        `/api/list-payment-proofs?userId=${
          doctor.id
        }&filePath=${encodeURIComponent(proof.filePath)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al eliminar el comprobante");
      }

      // Remove from local state
      setPaymentProofs((prev) =>
        prev.filter((p) => p.filePath !== proof.filePath)
      );

      alert("Comprobante eliminado correctamente");
    } catch (error: any) {
      console.error("Error deleting file:", error);
      alert("Error al eliminar el comprobante: " + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === "pdf") {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <ImageIcon className="h-5 w-5 text-blue-500" />;
  };

  const handleViewFile = (signedUrl: string | null) => {
    if (signedUrl) {
      window.open(signedUrl, "_blank");
    }
  };

  const handleDownloadFile = (signedUrl: string | null, fileName: string) => {
    if (signedUrl) {
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Cargando historial de pagos...
          </p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Error al cargar los datos</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/profile")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Perfil
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Historial de Comprobantes
            </h1>
            <p className="text-muted-foreground mt-2">
              Todos tus comprobantes de pago subidos
            </p>
          </div>
        </div>

        {/* Botón de actualizar más prominente */}
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
          size="lg"
        >
          <RefreshCw
            className={`h-5 w-5 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Actualizando..." : "Actualizar Enlaces"}
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Comprobantes
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {paymentProofs.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Documentos PDF
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {paymentProofs.filter((p) => p.fileType === "pdf").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <ImageIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Imágenes
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {paymentProofs.filter((p) => p.fileType === "image").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de comprobantes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Comprobantes de Pago
          </CardTitle>
          <CardDescription>
            Historial completo de todos los comprobantes de pago subidos,
            ordenados por fecha
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentProofs.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No hay comprobantes
              </h3>
              <p className="text-muted-foreground mb-4">
                Aún no has subido ningún comprobante de pago
              </p>
              <Button onClick={() => router.push("/profile?tab=payments")}>
                <CreditCard className="h-4 w-4 mr-2" />
                Subir Primer Comprobante
              </Button>
            </div>
          ) : (
            <>
              {/* Vista de tabla para pantallas grandes */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Archivo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentProofs.map((proof, index) => (
                      <TableRow key={proof.name}>
                        <TableCell>
                          <div className="flex items-center">
                            {getFileIcon(proof.fileType)}
                            <div className="ml-3">
                              <p className="text-sm font-medium text-foreground">
                                Comprobante #{index + 1}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {proof.name}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {proof.fileType === "pdf" ? "PDF" : "Imagen"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(proof.created_at)}
                        </TableCell>
                        <TableCell>
                          {proof.signedUrl ? (
                            <Badge variant="default">Disponible</Badge>
                          ) : (
                            <Badge variant="destructive">Error</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewFile(proof.signedUrl)}
                                disabled={!proof.signedUrl}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Ver archivo
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDownloadFile(
                                    proof.signedUrl,
                                    proof.name
                                  )
                                }
                                disabled={!proof.signedUrl}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Descargar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteFile(proof)}
                                disabled={deleting === proof.filePath}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deleting === proof.filePath
                                  ? "Eliminando..."
                                  : "Eliminar"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Vista de tarjetas para pantallas pequeñas */}
              <div className="md:hidden space-y-4">
                {paymentProofs.map((proof, index) => (
                  <Card key={proof.name}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center flex-1">
                          {getFileIcon(proof.fileType)}
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              Comprobante #{index + 1}
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
                              {proof.name}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs">
                                {proof.fileType === "pdf" ? "PDF" : "Imagen"}
                              </Badge>
                              <span>{formatDate(proof.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {proof.signedUrl ? (
                            <Badge variant="default" className="text-xs">
                              Disponible
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              Error
                            </Badge>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewFile(proof.signedUrl)}
                                disabled={!proof.signedUrl}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Ver archivo
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDownloadFile(
                                    proof.signedUrl,
                                    proof.name
                                  )
                                }
                                disabled={!proof.signedUrl}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Descargar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteFile(proof)}
                                disabled={deleting === proof.filePath}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deleting === proof.filePath
                                  ? "Eliminando..."
                                  : "Eliminar"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Información adicional */}
          {paymentProofs.length > 0 && (
            <Alert className="mt-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>
                    <strong>Nota:</strong> Los enlaces de visualización y
                    descarga son temporales y expiran después de 1 hora.
                  </p>
                  <p>
                    Si un enlace no funciona, usa el botón{" "}
                    <strong>"Actualizar Enlaces"</strong> para generar nuevos
                    enlaces.
                  </p>
                  <p className="text-red-600">
                    <strong>Advertencia:</strong> La eliminación de comprobantes
                    es permanente y no se puede deshacer.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
