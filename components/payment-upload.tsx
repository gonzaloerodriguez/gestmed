"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Upload,
  Trash2,
  FileText,
  ImageIcon,
  AlertTriangle,
  History,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import type { PaymentUploadProps } from "@/lib/supabase/types/paymentupload";
import { parseStorageUrl } from "@/lib/utils/signed-url";

export function PaymentUpload({
  doctorId,
  currentPaymentUrl,
  onSuccess,
}: PaymentUploadProps) {
  const router = useRouter();
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentPreview, setPaymentPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError, showWarning } = useToastEnhanced();

  // Generar signed URL para el archivo actual
  useEffect(() => {
    const generateSignedUrl = async () => {
      if (currentPaymentUrl) {
        try {
          const info = parseStorageUrl(currentPaymentUrl);
          if (!info) return;

          const response = await fetch("/api/get-signed-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filePath: info.path, bucket: info.bucket }),
          });

          if (response.ok) {
            const { signedUrl: newSignedUrl } = await response.json();
            setSignedUrl(newSignedUrl);
            setPaymentPreview(newSignedUrl);
          }
        } catch (error) {
          // Error silencioso para no interrumpir la UX
        }
      }
    };

    generateSignedUrl();
  }, [currentPaymentUrl]);

  const handleFileChange = (file: File | null) => {
    setError(null);
    setPaymentFile(file);

    if (file) {
      // Validar tipo de archivo
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("Tipo de archivo no permitido. Use PDF, JPG o PNG");
        setPaymentFile(null);
        return;
      }

      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        setError("El archivo es demasiado grande (máximo 5MB)");
        setPaymentFile(null);
        return;
      }

      // Mostrar preview solo para imágenes
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPaymentPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPaymentPreview(null); // No preview para PDFs
      }
    } else {
      setPaymentPreview(signedUrl);
    }
  };

  const uploadPayment = async () => {
    if (!paymentFile || !doctorId) {
      showWarning(
        "Archivo requerido",
        "Por favor selecciona un comprobante para subir"
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) throw new Error("Usuario no autenticado");

      const formData = new FormData();
      formData.append("file", paymentFile);
      formData.append("userId", user.id);

      const response = await fetch("/api/upload-payment", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al subir el comprobante");
      }

      const result = await response.json();

      const { data: currentDoctor, error: fetchError } = await supabase
        .from("doctors")
        .select("last_payment_date, subscription_status")
        .eq("id", doctorId)
        .single();

      if (fetchError) throw fetchError;

      // Determinar el estado correcto basado en la fecha del último pago
      const now = new Date();
      let newSubscriptionStatus = "pending_verification";
      let shouldActivate = false;

      if (currentDoctor.last_payment_date) {
        const lastPayment = new Date(currentDoctor.last_payment_date);
        const expectedPaymentDate = new Date(lastPayment);
        expectedPaymentDate.setMonth(expectedPaymentDate.getMonth() + 1);

        if (now <= expectedPaymentDate) {
          // Renovación dentro del plazo - mantener activo
          newSubscriptionStatus = "active";
          shouldActivate = true;
        }
      }

      // Calcular próxima fecha de pago
      let nextPaymentDate: Date;
      if (currentDoctor.last_payment_date) {
        const lastPayment = new Date(currentDoctor.last_payment_date);
        const expectedPaymentDate = new Date(lastPayment);
        expectedPaymentDate.setMonth(expectedPaymentDate.getMonth() + 1);

        if (now <= expectedPaymentDate) {
          nextPaymentDate = new Date(expectedPaymentDate);
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        } else {
          nextPaymentDate = new Date(now);
          nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
        }
      } else {
        nextPaymentDate = new Date(now);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      }

      // Actualizar la base de datos
      const { error: updateError } = await supabase
        .from("doctors")
        .update({
          payment_proof_url: result.filePath,
          subscription_status: newSubscriptionStatus,
          is_active: shouldActivate,
          last_payment_date: now.toISOString(),
          next_payment_date: nextPaymentDate.toISOString(),
        })
        .eq("id", doctorId);

      if (updateError) throw updateError;

      // Notificar al admin
      await fetch("/api/notify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment_uploaded",
          doctorId,
          paymentProofUrl: result.url,
        }),
      });

      showSuccess(
        "Comprobante subido",
        shouldActivate
          ? "Tu comprobante ha sido procesado y tu cuenta permanece activa"
          : "Tu comprobante ha sido subido y está pendiente de verificación"
      );

      setPaymentFile(null);
      setSignedUrl(result.url);
      setPaymentPreview(result.url);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onSuccess();
    } catch (err: any) {
      showError(
        "Error subiendo comprobante",
        err.message || "Ha ocurrido un error inesperado"
      );
    } finally {
      setSaving(false);
    }
  };

  const deletePayment = async () => {
    if (!currentPaymentUrl || !doctorId) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("doctors")
        .update({ payment_proof_url: null })
        .eq("id", doctorId);

      if (updateError) throw updateError;

      setPaymentPreview(null);
      setSignedUrl(null);
      showSuccess(
        "Comprobante eliminado",
        "Tu comprobante ha sido eliminado correctamente"
      );
      setShowDeleteDialog(false);
      onSuccess();
    } catch (err: any) {
      showError(
        "Error eliminando comprobante",
        err.message || "Ha ocurrido un error inesperado"
      );
    } finally {
      setSaving(false);
    }
  };

  const getFileIcon = (url: string) => {
    if (url.includes(".pdf")) {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <ImageIcon className="h-8 w-8 text-blue-500" />;
  };

  const handleViewFile = () => {
    if (signedUrl) {
      window.open(signedUrl, "_blank");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-5 w-5 mr-2" />
          Gestión de Pagos
        </CardTitle>
        <CardDescription>
          Sube tus comprobantes de pago mensual para mantener tu cuenta activa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Botón para ver historial completo */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/payment-history")}
            className="mb-4"
          >
            <History className="h-4 w-4 mr-2" />
            Ver Historial Completo
          </Button>
        </div>

        {/* Mostrar comprobante actual */}
        {(currentPaymentUrl || signedUrl) && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-sm text-gray-600 mb-2">Comprobante actual:</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getFileIcon(currentPaymentUrl || signedUrl || "")}
                <div>
                  <p className="text-sm font-medium">Comprobante de pago</p>
                  <p className="text-xs text-gray-500">
                    {(currentPaymentUrl || signedUrl || "").includes(".pdf")
                      ? "Documento PDF"
                      : "Imagen"}
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewFile}
                  disabled={!signedUrl}
                >
                  Ver
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            </div>

            {/* Preview para imágenes */}
            {paymentPreview &&
              !(currentPaymentUrl || signedUrl || "").includes(".pdf") && (
                <div className="mt-3">
                  <img
                    src={paymentPreview || "/placeholder.svg"}
                    alt="Preview del comprobante"
                    className="max-h-40 object-contain border rounded"
                  />
                </div>
              )}
          </div>
        )}

        {/* Información de pago */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Información para el pago:</p>
              <ul className="text-sm space-y-1">
                <li>
                  • <strong>Transferencia:</strong> Datos aún no disponibles -
                  App en desarrollo
                </li>
                <li>
                  • <strong>PayPal:</strong> Datos aún no disponibles - App en
                  desarrollo
                </li>
                <li>
                  • <strong>Código QR Deuna:</strong> Datos aún no disponibles -
                  App en desarrollo
                </li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {/* Subir nuevo comprobante */}
        <div>
          <Label htmlFor="payment_proof">Nuevo Comprobante de Pago</Label>
          <Input
            ref={fileInputRef}
            id="payment_proof"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
          />
          <div className="text-xs text-gray-500 mt-2">
            <p className="font-medium mb-1">Formatos aceptados:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>PDF (recomendado para documentos)</li>
              <li>JPG, PNG (para capturas de pantalla)</li>
              <li>Tamaño máximo: 5MB</li>
              <li>Asegúrate de que el comprobante sea legible</li>
            </ul>
          </div>

          {error && (
            <Alert className="mt-2 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Preview del archivo seleccionado */}
        {paymentFile && (
          <div className="border rounded-lg p-4 bg-blue-50">
            <p className="text-sm text-gray-600 mb-2">Archivo seleccionado:</p>
            <div className="flex items-center space-x-3">
              {getFileIcon(paymentFile.name)}
              <div>
                <p className="text-sm font-medium">{paymentFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(paymentFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>

            {/* Preview para imágenes nuevas */}
            {paymentPreview && paymentFile.type.startsWith("image/") && (
              <div className="mt-3">
                <img
                  src={paymentPreview || "/placeholder.svg"}
                  alt="Preview del comprobante"
                  className="max-h-40 object-contain border rounded"
                />
              </div>
            )}
          </div>
        )}

        {/* Botón de subida */}
        <div className="flex justify-end">
          <Button onClick={uploadPayment} disabled={!paymentFile || saving}>
            <Upload className="h-4 w-4 mr-2" />
            {saving ? "Subiendo..." : "Subir Comprobante"}
          </Button>
        </div>

        {/* Dialog de confirmación para eliminar */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar comprobante?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará tu comprobante de pago actual. Podrás
                subir uno nuevo en cualquier momento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={deletePayment}
                className="bg-red-600 hover:bg-red-700"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

// //mofique la logica para el vencimiento

// "use client";

// import { useState, useRef, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import {
//   Upload,
//   Trash2,
//   FileText,
//   ImageIcon,
//   AlertTriangle,
//   History,
// } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import type { PaymentUploadProps } from "@/lib/supabase/types/paymentupload";
// import { parseStorageUrl } from "@/lib/utils/signed-url";

// export function PaymentUpload({
//   doctorId,
//   currentPaymentUrl,
//   onSuccess,
// }: PaymentUploadProps) {
//   const router = useRouter();
//   const [paymentFile, setPaymentFile] = useState<File | null>(null);
//   const [paymentPreview, setPaymentPreview] = useState<string | null>(null);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [signedUrl, setSignedUrl] = useState<string | null>(null);
//   const [newSubscriptionStatus, setNewSubscriptionStatus] = useState<
//     string | null
//   >("pending_verification");
//   const [shouldActivate, setShouldActivate] = useState<boolean | null>(false);
//   const [statusMessage, setStatusMessage] = useState<string | null>("");

//   const fileInputRef = useRef<HTMLInputElement>(null);

//   // Generar signed URL para el archivo actual
//   useEffect(() => {
//     const generateSignedUrl = async () => {
//       // if (currentPaymentUrl && currentPaymentUrl.includes("payment-proofs")) {
//       if (currentPaymentUrl) {
//         try {
//           // Extraer la ruta del archivo de la URL
//           // const urlParts = currentPaymentUrl.split("/payment-proofs/");
//           // if (urlParts.length > 1) {
//           //   const filePath = urlParts[1].split("?")[0];

//           //   const response = await fetch("/api/get-signed-url", {
//           //     method: "POST",
//           //     headers: { "Content-Type": "application/json" },
//           //     body: JSON.stringify({ filePath }),
//           //   });

//           //   if (response.ok) {
//           //     const { signedUrl: newSignedUrl } = await response.json();
//           //     setSignedUrl(newSignedUrl);
//           //     setPaymentPreview(newSignedUrl);
//           const info = parseStorageUrl(currentPaymentUrl);
//           if (!info) return;

//           const response = await fetch("/api/get-signed-url", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ filePath: info.path, bucket: info.bucket }),
//           });

//           if (response.ok) {
//             const { signedUrl: newSignedUrl } = await response.json();
//             setSignedUrl(newSignedUrl);
//             setPaymentPreview(newSignedUrl);
//           }
//         } catch (error) {
//           console.error("Error generating signed URL:", error);
//         }
//       }
//     };

//     generateSignedUrl();
//   }, [currentPaymentUrl]);

//   const handleFileChange = (file: File | null) => {
//     setError(null);
//     setPaymentFile(file);

//     if (file) {
//       // Validar tipo de archivo
//       const allowedTypes = [
//         "application/pdf",
//         "image/jpeg",
//         "image/jpg",
//         "image/png",
//       ];
//       if (!allowedTypes.includes(file.type)) {
//         setError("Tipo de archivo no permitido. Use PDF, JPG o PNG");
//         setPaymentFile(null);
//         return;
//       }

//       // Validar tamaño (5MB máximo)
//       if (file.size > 5 * 1024 * 1024) {
//         setError("El archivo es demasiado grande (máximo 5MB)");
//         setPaymentFile(null);
//         return;
//       }

//       // Mostrar preview solo para imágenes
//       if (file.type.startsWith("image/")) {
//         const reader = new FileReader();
//         reader.onload = (e) => {
//           setPaymentPreview(e.target?.result as string);
//         };
//         reader.readAsDataURL(file);
//       } else {
//         setPaymentPreview(null); // No preview para PDFs
//       }
//     } else {
//       setPaymentPreview(signedUrl);
//     }
//   };

//   const uploadPayment = async () => {
//     if (!paymentFile || !doctorId) return;

//     setSaving(true);
//     setError(null);

//     try {
//       // Obtener el usuario autenticado
//       const {
//         data: { user },
//         error: userError,
//       } = await supabase.auth.getUser();

//       if (userError || !user) throw new Error("Usuario no autenticado");

//       // Preparar FormData para la subida
//       const formData = new FormData();
//       formData.append("file", paymentFile);
//       formData.append("userId", user.id);

//       // Enviar a nuestro endpoint específico para comprobantes de pago
//       const response = await fetch("/api/upload-payment", {
//         method: "POST",
//         body: formData,
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error || "Error al subir el comprobante");
//       }

//       const result = await response.json();
//       console.log("Respuesta del upload-payment API:", result);

//       const { data: currentDoctor, error: fetchError } = await supabase
//         .from("doctors")
//         .select("last_payment_date, subscription_status")
//         .eq("id", doctorId)
//         .single();

//       if (fetchError) throw fetchError;

//       // Determinar el estado correcto basado en la fecha del último pago
//       const now = new Date();

//       if (currentDoctor.last_payment_date) {
//         const lastPayment = new Date(currentDoctor.last_payment_date);
//         const expectedPaymentDate = new Date(lastPayment);
//         expectedPaymentDate.setMonth(expectedPaymentDate.getMonth() + 1);

//         console.log(`Último pago: ${lastPayment.toISOString()}`);
//         console.log(`Fecha esperada: ${expectedPaymentDate.toISOString()}`);
//         console.log(`Fecha actual: ${now.toISOString()}`);

//         if (now <= expectedPaymentDate) {
//           // Renovación dentro del plazo - mantener activo
//           setNewSubscriptionStatus("active");
//           setShouldActivate(true);
//           setStatusMessage(
//             "Comprobante subido correctamente. Tu cuenta sigue activa."
//           );
//           console.log("Renovación temprana/puntual - cuenta permanece activa");
//         } else {
//           // Renovación tardía - requiere verificación
//           setNewSubscriptionStatus("pending_verification");
//           setShouldActivate(false);
//           setStatusMessage(
//             "Comprobante subido correctamente. Pendiente de verificación por el administrador."
//           );
//           console.log("Renovación tardía - requiere verificación");
//         }
//       } else {
//         // Primer pago - requiere verificación
//         setNewSubscriptionStatus("pending_verification");
//         setShouldActivate(false);
//         setStatusMessage(
//           "Comprobante subido correctamente. Pendiente de verificación por el administrador."
//         );
//         console.log("Primer pago - requiere verificación");
//       }

//       // Calcular próxima fecha de pago según las reglas de negocio
//       let nextPaymentDate: Date;

//       if (currentDoctor.last_payment_date) {
//         const lastPayment = new Date(currentDoctor.last_payment_date);
//         const now = new Date();

//         // Calcular la fecha esperada del próximo pago (un mes después del último pago)
//         const expectedPaymentDate = new Date(lastPayment);
//         expectedPaymentDate.setMonth(expectedPaymentDate.getMonth() + 1);

//         // Si paga antes o el mismo día que se cumple el mes
//         if (now <= expectedPaymentDate) {
//           // La próxima fecha es un mes después de la fecha esperada
//           nextPaymentDate = new Date(expectedPaymentDate);
//           nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
//           console.log(
//             `Pago temprano/puntual. Próxima fecha: ${nextPaymentDate.toISOString()}`
//           );
//         } else {
//           // Si paga tarde, la próxima fecha es 30 días desde hoy
//           nextPaymentDate = new Date(now);
//           nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
//           console.log(
//             `Pago tardío. Próxima fecha: ${nextPaymentDate.toISOString()}`
//           );
//         }
//       } else {
//         // Primer pago - la próxima fecha es un mes desde hoy
//         nextPaymentDate = new Date(now);
//         nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
//         console.log(
//           `Primer pago. Próxima fecha: ${nextPaymentDate.toISOString()}`
//         );
//       }

//       // Actualizar la base de datos con el estado correcto
//       const { error: updateError } = await supabase
//         .from("doctors")
//         .update({
//           payment_proof_url: result.filePath,
//           subscription_status: newSubscriptionStatus,
//           is_active: shouldActivate,
//           last_payment_date: now.toISOString(),
//           next_payment_date: nextPaymentDate.toISOString(),
//         })
//         .eq("id", doctorId);

//       if (updateError) {
//         throw updateError;
//       }
//       // Notificar al admin
//       await fetch("/api/notify-admin", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           type: "payment_uploaded",
//           doctorId,
//           paymentProofUrl: result.url,
//         }),
//       });

//       // Mostrar mensaje de éxito
//       alert("Comprobante de pago subido correctamente");
//       setPaymentFile(null);
//       setSignedUrl(result.url);
//       setPaymentPreview(result.url);

//       // Limpiar input
//       if (fileInputRef.current) {
//         fileInputRef.current.value = "";
//       }

//       onSuccess();
//     } catch (err: any) {
//       setError(err.message || "Error al subir el comprobante");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const deletePayment = async () => {
//     if (!currentPaymentUrl || !doctorId) return;

//     const confirmDelete = confirm(
//       "¿Estás seguro de que quieres eliminar tu comprobante de pago?"
//     );
//     if (!confirmDelete) return;

//     setSaving(true);

//     try {
//       // Actualizar base de datos (no eliminamos el archivo físico para mantener historial)
//       const { error: updateError } = await supabase
//         .from("doctors")
//         .update({ payment_proof_url: null })
//         .eq("id", doctorId);

//       if (updateError) throw updateError;

//       // Actualizar UI
//       setPaymentPreview(null);
//       setSignedUrl(null);
//       alert("Comprobante eliminado correctamente");
//       onSuccess();
//     } catch (err: any) {
//       setError(err.message || "Error al eliminar el comprobante");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const getFileIcon = (url: string) => {
//     if (url.includes(".pdf")) {
//       return <FileText className="h-8 w-8 text-red-500" />;
//     }
//     return <ImageIcon className="h-8 w-8 text-blue-500" />;
//   };

//   const handleViewFile = () => {
//     if (signedUrl) {
//       window.open(signedUrl, "_blank");
//     }
//   };

//   return (
//     <div className="space-y-6">
//       {/* Botón para ver historial completo */}
//       <div className="flex justify-end">
//         <Button
//           variant="outline"
//           onClick={() => router.push("/dashboard/payment-history")}
//           className="mb-4"
//         >
//           <History className="h-4 w-4 mr-2" />
//           Ver Historial Completo
//         </Button>
//       </div>

//       {/* Mostrar comprobante actual */}
//       {(currentPaymentUrl || signedUrl) && (
//         <div className="border rounded-lg p-4 bg-gray-50">
//           <p className="text-sm text-gray-600 mb-2">Comprobante actual:</p>

//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-3">
//               {getFileIcon(currentPaymentUrl || signedUrl || "")}
//               <div>
//                 <p className="text-sm font-medium">Comprobante de pago</p>
//                 <p className="text-xs text-gray-500">
//                   {(currentPaymentUrl || signedUrl || "").includes(".pdf")
//                     ? "Documento PDF"
//                     : "Imagen"}
//                 </p>
//               </div>
//             </div>

//             <div className="flex space-x-2">
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={handleViewFile}
//                 disabled={!signedUrl}
//               >
//                 Ver
//               </Button>
//               <Button
//                 variant="destructive"
//                 size="sm"
//                 onClick={deletePayment}
//                 disabled={saving}
//               >
//                 <Trash2 className="h-4 w-4 mr-2" />
//                 Eliminar
//               </Button>
//             </div>
//           </div>

//           {/* Preview para imágenes */}
//           {paymentPreview &&
//             !(currentPaymentUrl || signedUrl || "").includes(".pdf") && (
//               <div className="mt-3">
//                 <img
//                   src={paymentPreview || "/placeholder.svg"}
//                   alt="Preview del comprobante"
//                   className="max-h-40 object-contain border rounded"
//                 />
//               </div>
//             )}
//         </div>
//       )}

//       {/* Información de pago */}
//       <Alert>
//         <AlertTriangle className="h-4 w-4" />
//         <AlertDescription>
//           <div className="space-y-2">
//             <p className="font-medium">Información para el pago:</p>
//             <ul className="text-sm space-y-1">
//               <li>
//                 • <strong>Transferencia:</strong> Datos aún no disponibles - App
//                 en desarrollo
//               </li>
//               <li>
//                 • <strong>PayPal:</strong> Datos aún no disponibles - App en
//                 desarrollo
//               </li>
//               <li>
//                 • <strong>Código QR Deuna:</strong> Datos aún no disponibles -
//                 App en desarrollo
//               </li>
//             </ul>
//           </div>
//         </AlertDescription>
//       </Alert>

//       {/* Subir nuevo comprobante */}
//       <div>
//         <Label htmlFor="payment_proof">Nuevo Comprobante de Pago</Label>
//         <Input
//           ref={fileInputRef}
//           id="payment_proof"
//           type="file"
//           accept=".pdf,.jpg,.jpeg,.png"
//           onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
//         />
//         <div className="text-xs text-gray-500 mt-2">
//           <p className="font-medium mb-1">Formatos aceptados:</p>
//           <ul className="list-disc pl-5 space-y-1">
//             <li>PDF (recomendado para documentos)</li>
//             <li>JPG, PNG (para capturas de pantalla)</li>
//             <li>Tamaño máximo: 5MB</li>
//             <li>Asegúrate de que el comprobante sea legible</li>
//           </ul>
//         </div>

//         {error && (
//           <Alert className="mt-2 border-red-200 bg-red-50">
//             <AlertTriangle className="h-4 w-4 text-red-600" />
//             <AlertDescription className="text-red-800">
//               {error}
//             </AlertDescription>
//           </Alert>
//         )}
//       </div>

//       {/* Preview del archivo seleccionado */}
//       {paymentFile && (
//         <div className="border rounded-lg p-4 bg-blue-50">
//           <p className="text-sm text-gray-600 mb-2">Archivo seleccionado:</p>
//           <div className="flex items-center space-x-3">
//             {getFileIcon(paymentFile.name)}
//             <div>
//               <p className="text-sm font-medium">{paymentFile.name}</p>
//               <p className="text-xs text-gray-500">
//                 {(paymentFile.size / (1024 * 1024)).toFixed(2)} MB
//               </p>
//             </div>
//           </div>

//           {/* Preview para imágenes nuevas */}
//           {paymentPreview && paymentFile.type.startsWith("image/") && (
//             <div className="mt-3">
//               <img
//                 src={paymentPreview || "/placeholder.svg"}
//                 alt="Preview del comprobante"
//                 className="max-h-40 object-contain border rounded"
//               />
//             </div>
//           )}
//         </div>
//       )}

//       {/* Botón de subida */}
//       <div className="flex justify-end">
//         <Button onClick={uploadPayment} disabled={!paymentFile || saving}>
//           <Upload className="h-4 w-4 mr-2" />
//           {saving ? "Subiendo..." : "Subir Comprobante"}
//         </Button>
//       </div>
//     </div>
//   );
// }

// "use client";

// import { useState, useRef, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import {
//   Upload,
//   Trash2,
//   FileText,
//   ImageIcon,
//   AlertTriangle,
//   History,
// } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import type { PaymentUploadProps } from "@/lib/supabase/types/paymentupload";
// import { parseStorageUrl } from "@/lib/utils/signed-url";

// export function PaymentUpload({
//   doctorId,
//   currentPaymentUrl,
//   onSuccess,
// }: PaymentUploadProps) {
//   const router = useRouter();
//   const [paymentFile, setPaymentFile] = useState<File | null>(null);
//   const [paymentPreview, setPaymentPreview] = useState<string | null>(null);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [signedUrl, setSignedUrl] = useState<string | null>(null);
//   const [newSubscriptionStatus, setNewSubscriptionStatus] = useState<
//     string | null
//   >("pending_verification");
//   const [shouldActivate, setShouldActivate] = useState<boolean | null>(false);
//   const [statusMessage, setStatusMessage] = useState<string | null>("");

//   const fileInputRef = useRef<HTMLInputElement>(null);

//   // Generar signed URL para el archivo actual
//   useEffect(() => {
//     const generateSignedUrl = async () => {
//       // if (currentPaymentUrl && currentPaymentUrl.includes("payment-proofs")) {
//       if (currentPaymentUrl) {
//         try {
//           // Extraer la ruta del archivo de la URL
//           // const urlParts = currentPaymentUrl.split("/payment-proofs/");
//           // if (urlParts.length > 1) {
//           //   const filePath = urlParts[1].split("?")[0];

//           //   const response = await fetch("/api/get-signed-url", {
//           //     method: "POST",
//           //     headers: { "Content-Type": "application/json" },
//           //     body: JSON.stringify({ filePath }),
//           //   });

//           //   if (response.ok) {
//           //     const { signedUrl: newSignedUrl } = await response.json();
//           //     setSignedUrl(newSignedUrl);
//           //     setPaymentPreview(newSignedUrl);
//           const info = parseStorageUrl(currentPaymentUrl);
//           if (!info) return;

//           const response = await fetch("/api/get-signed-url", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ filePath: info.path, bucket: info.bucket }),
//           });

//           if (response.ok) {
//             const { signedUrl: newSignedUrl } = await response.json();
//             setSignedUrl(newSignedUrl);
//             setPaymentPreview(newSignedUrl);
//           }
//         } catch (error) {
//           console.error("Error generating signed URL:", error);
//         }
//       }
//     };

//     generateSignedUrl();
//   }, [currentPaymentUrl]);

//   const handleFileChange = (file: File | null) => {
//     setError(null);
//     setPaymentFile(file);

//     if (file) {
//       // Validar tipo de archivo
//       const allowedTypes = [
//         "application/pdf",
//         "image/jpeg",
//         "image/jpg",
//         "image/png",
//       ];
//       if (!allowedTypes.includes(file.type)) {
//         setError("Tipo de archivo no permitido. Use PDF, JPG o PNG");
//         setPaymentFile(null);
//         return;
//       }

//       // Validar tamaño (5MB máximo)
//       if (file.size > 5 * 1024 * 1024) {
//         setError("El archivo es demasiado grande (máximo 5MB)");
//         setPaymentFile(null);
//         return;
//       }

//       // Mostrar preview solo para imágenes
//       if (file.type.startsWith("image/")) {
//         const reader = new FileReader();
//         reader.onload = (e) => {
//           setPaymentPreview(e.target?.result as string);
//         };
//         reader.readAsDataURL(file);
//       } else {
//         setPaymentPreview(null); // No preview para PDFs
//       }
//     } else {
//       setPaymentPreview(signedUrl);
//     }
//   };

//   const uploadPayment = async () => {
//     if (!paymentFile || !doctorId) return;

//     setSaving(true);
//     setError(null);

//     try {
//       // Obtener el usuario autenticado
//       const {
//         data: { user },
//         error: userError,
//       } = await supabase.auth.getUser();

//       if (userError || !user) throw new Error("Usuario no autenticado");

//       // Preparar FormData para la subida
//       const formData = new FormData();
//       formData.append("file", paymentFile);
//       formData.append("userId", user.id);

//       // Enviar a nuestro endpoint específico para comprobantes de pago
//       const response = await fetch("/api/upload-payment", {
//         method: "POST",
//         body: formData,
//       });

//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error || "Error al subir el comprobante");
//       }

//       const result = await response.json();
//       console.log("Respuesta del upload-payment API:", result);

//       const { data: currentDoctor, error: fetchError } = await supabase
//         .from("doctors")
//         .select("last_payment_date, subscription_status")
//         .eq("id", doctorId)
//         .single();

//       if (fetchError) throw fetchError;

//       // Determinar el estado correcto basado en la fecha del último pago
//       const now = new Date();

//       if (currentDoctor.last_payment_date) {
//         // Calcula los días desde el último pago
//         const lastPayment = new Date(currentDoctor.last_payment_date);
//         const daysSinceLastPayment = Math.floor(
//           (now.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24)
//         );

//         console.log(`Días desde último pago: ${daysSinceLastPayment}`);

//         if (daysSinceLastPayment <= 30) {
//           // Renovación dentro de los 30 días - mantener activo
//           setNewSubscriptionStatus("active");
//           setShouldActivate(true);
//           setStatusMessage(
//             "Comprobante subido correctamente. Tu cuenta sigue activa."
//           );
//           console.log("Renovación temprana - cuenta permanece activa");
//         } else {
//           // Renovación tardía - requiere verificación
//           setNewSubscriptionStatus("pending_verification");
//           setShouldActivate(false);
//           setStatusMessage(
//             "Comprobante subido correctamente. Pendiente de verificación por el administrador."
//           );
//           console.log("Renovación tardía - requiere verificación");
//         }
//       } else {
//         // Primer pago - requiere verificación
//         setNewSubscriptionStatus("pending_verification");
//         setShouldActivate(false);
//         setStatusMessage(
//           "Comprobante subido correctamente. Pendiente de verificación por el administrador."
//         );
//         console.log("Primer pago - requiere verificación");
//       }

//       // Calcular próxima fecha de pago (30 días desde ahora)
//       const nextPaymentDate = new Date();
//       nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);

//       // Actualizar la base de datos con el estado correcto
//       const { error: updateError } = await supabase
//         .from("doctors")
//         .update({
//           payment_proof_url: result.filePath,
//           subscription_status: newSubscriptionStatus,
//           is_active: shouldActivate,
//           last_payment_date: now.toISOString(),
//           next_payment_date: nextPaymentDate.toISOString(),
//         })
//         .eq("id", doctorId);

//       if (updateError) {
//         throw updateError;
//       }
//       // Notificar al admin
//       await fetch("/api/notify-admin", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           type: "payment_uploaded",
//           doctorId,
//           paymentProofUrl: result.url,
//         }),
//       });

//       // Mostrar mensaje de éxito
//       alert("Comprobante de pago subido correctamente");
//       setPaymentFile(null);
//       setSignedUrl(result.url);
//       setPaymentPreview(result.url);

//       // Limpiar input
//       if (fileInputRef.current) {
//         fileInputRef.current.value = "";
//       }

//       onSuccess();
//     } catch (err: any) {
//       setError(err.message || "Error al subir el comprobante");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const deletePayment = async () => {
//     if (!currentPaymentUrl || !doctorId) return;

//     const confirmDelete = confirm(
//       "¿Estás seguro de que quieres eliminar tu comprobante de pago?"
//     );
//     if (!confirmDelete) return;

//     setSaving(true);

//     try {
//       // Actualizar base de datos (no eliminamos el archivo físico para mantener historial)
//       const { error: updateError } = await supabase
//         .from("doctors")
//         .update({ payment_proof_url: null })
//         .eq("id", doctorId);

//       if (updateError) throw updateError;

//       // Actualizar UI
//       setPaymentPreview(null);
//       setSignedUrl(null);
//       alert("Comprobante eliminado correctamente");
//       onSuccess();
//     } catch (err: any) {
//       setError(err.message || "Error al eliminar el comprobante");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const getFileIcon = (url: string) => {
//     if (url.includes(".pdf")) {
//       return <FileText className="h-8 w-8 text-red-500" />;
//     }
//     return <ImageIcon className="h-8 w-8 text-blue-500" />;
//   };

//   const handleViewFile = () => {
//     if (signedUrl) {
//       window.open(signedUrl, "_blank");
//     }
//   };

//   return (
//     <div className="space-y-6">
//       {/* Botón para ver historial completo */}
//       <div className="flex justify-end">
//         <Button
//           variant="outline"
//           onClick={() => router.push("/dashboard/payment-history")}
//           className="mb-4"
//         >
//           <History className="h-4 w-4 mr-2" />
//           Ver Historial Completo
//         </Button>
//       </div>

//       {/* Mostrar comprobante actual */}
//       {(currentPaymentUrl || signedUrl) && (
//         <div className="border rounded-lg p-4 bg-gray-50">
//           <p className="text-sm text-gray-600 mb-2">Comprobante actual:</p>

//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-3">
//               {getFileIcon(currentPaymentUrl || signedUrl || "")}
//               <div>
//                 <p className="text-sm font-medium">Comprobante de pago</p>
//                 <p className="text-xs text-gray-500">
//                   {(currentPaymentUrl || signedUrl || "").includes(".pdf")
//                     ? "Documento PDF"
//                     : "Imagen"}
//                 </p>
//               </div>
//             </div>

//             <div className="flex space-x-2">
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={handleViewFile}
//                 disabled={!signedUrl}
//               >
//                 Ver
//               </Button>
//               <Button
//                 variant="destructive"
//                 size="sm"
//                 onClick={deletePayment}
//                 disabled={saving}
//               >
//                 <Trash2 className="h-4 w-4 mr-2" />
//                 Eliminar
//               </Button>
//             </div>
//           </div>

//           {/* Preview para imágenes */}
//           {paymentPreview &&
//             !(currentPaymentUrl || signedUrl || "").includes(".pdf") && (
//               <div className="mt-3">
//                 <img
//                   src={paymentPreview || "/placeholder.svg"}
//                   alt="Preview del comprobante"
//                   className="max-h-40 object-contain border rounded"
//                 />
//               </div>
//             )}
//         </div>
//       )}

//       {/* Información de pago */}
//       <Alert>
//         <AlertTriangle className="h-4 w-4" />
//         <AlertDescription>
//           <div className="space-y-2">
//             <p className="font-medium">Información para el pago:</p>
//             <ul className="text-sm space-y-1">
//               <li>
//                 • <strong>Transferencia:</strong> Datos aún no disponibles - App
//                 en desarrollo
//               </li>
//               <li>
//                 • <strong>PayPal:</strong> Datos aún no disponibles - App en
//                 desarrollo
//               </li>
//               <li>
//                 • <strong>Código QR Deuna:</strong> Datos aún no disponibles -
//                 App en desarrollo
//               </li>
//             </ul>
//           </div>
//         </AlertDescription>
//       </Alert>

//       {/* Subir nuevo comprobante */}
//       <div>
//         <Label htmlFor="payment_proof">Nuevo Comprobante de Pago</Label>
//         <Input
//           ref={fileInputRef}
//           id="payment_proof"
//           type="file"
//           accept=".pdf,.jpg,.jpeg,.png"
//           onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
//         />
//         <div className="text-xs text-gray-500 mt-2">
//           <p className="font-medium mb-1">Formatos aceptados:</p>
//           <ul className="list-disc pl-5 space-y-1">
//             <li>PDF (recomendado para documentos)</li>
//             <li>JPG, PNG (para capturas de pantalla)</li>
//             <li>Tamaño máximo: 5MB</li>
//             <li>Asegúrate de que el comprobante sea legible</li>
//           </ul>
//         </div>

//         {error && (
//           <Alert className="mt-2 border-red-200 bg-red-50">
//             <AlertTriangle className="h-4 w-4 text-red-600" />
//             <AlertDescription className="text-red-800">
//               {error}
//             </AlertDescription>
//           </Alert>
//         )}
//       </div>

//       {/* Preview del archivo seleccionado */}
//       {paymentFile && (
//         <div className="border rounded-lg p-4 bg-blue-50">
//           <p className="text-sm text-gray-600 mb-2">Archivo seleccionado:</p>
//           <div className="flex items-center space-x-3">
//             {getFileIcon(paymentFile.name)}
//             <div>
//               <p className="text-sm font-medium">{paymentFile.name}</p>
//               <p className="text-xs text-gray-500">
//                 {(paymentFile.size / (1024 * 1024)).toFixed(2)} MB
//               </p>
//             </div>
//           </div>

//           {/* Preview para imágenes nuevas */}
//           {paymentPreview && paymentFile.type.startsWith("image/") && (
//             <div className="mt-3">
//               <img
//                 src={paymentPreview || "/placeholder.svg"}
//                 alt="Preview del comprobante"
//                 className="max-h-40 object-contain border rounded"
//               />
//             </div>
//           )}
//         </div>
//       )}

//       {/* Botón de subida */}
//       <div className="flex justify-end">
//         <Button onClick={uploadPayment} disabled={!paymentFile || saving}>
//           <Upload className="h-4 w-4 mr-2" />
//           {saving ? "Subiendo..." : "Subir Comprobante"}
//         </Button>
//       </div>
//     </div>
//   );
// }
