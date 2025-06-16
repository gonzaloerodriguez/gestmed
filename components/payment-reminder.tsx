"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Upload, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PaymentReminderProps {
  doctorId: string;
  subscriptionStatus: string;
  nextPaymentDate: string | null;
}

export function PaymentReminder({
  doctorId,
  subscriptionStatus,
  nextPaymentDate,
}: PaymentReminderProps) {
  const [showReminder, setShowReminder] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    checkPaymentStatus();
  }, [nextPaymentDate, subscriptionStatus]);

  const checkPaymentStatus = async () => {
    // Verificar si el usuario está exento de pago
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: exemptedUser } = await supabase
          .from("exempted_users")
          .select("email")
          .eq("email", user.email)
          .single();

        if (exemptedUser) {
          // Usuario exento, no mostrar recordatorio
          return;
        }
      }
    } catch (error) {
      // No está exento, continuar con verificación normal
    }

    if (!nextPaymentDate) return;

    const nextPayment = new Date(nextPaymentDate);
    const now = new Date();
    const daysUntilPayment = Math.ceil(
      (nextPayment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Mostrar recordatorio 5 días antes o si ya venció
    if (
      daysUntilPayment <= 5 &&
      daysUntilPayment >= 0 &&
      subscriptionStatus === "active"
    ) {
      setShowReminder(true);
    } else if (subscriptionStatus === "expired") {
      setShowReminder(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentFile(e.target.files[0]);
    }
  };

  const handlePaymentUpload = async () => {
    if (!paymentFile) return;

    setUploading(true);
    try {
      // Subir comprobante
      const formData = new FormData();
      formData.append("file", paymentFile);
      formData.append("folder", "payment_proofs");
      formData.append("publicId", `doctor_${doctorId}_payment_${Date.now()}`);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadResult.error);

      // Actualizar estado del doctor
      const nextPaymentDate = new Date();
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

      const { error: updateError } = await supabase
        .from("doctors")
        .update({
          payment_proof_url: uploadResult.url,
          subscription_status: "pending_verification",
          is_active: true, // Reactivar temporalmente
          last_payment_date: new Date().toISOString(),
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
          paymentProofUrl: uploadResult.url,
        }),
      });

      alert(
        "Comprobante subido exitosamente. Tu acceso ha sido restaurado temporalmente."
      );
      setShowPaymentDialog(false);
      setShowReminder(false);
      setPaymentFile(null);

      // Recargar página para actualizar estado
      window.location.reload();
    } catch (error: any) {
      alert("Error al subir comprobante: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getDaysUntilPayment = () => {
    if (!nextPaymentDate) return 0;
    const nextPayment = new Date(nextPaymentDate);
    const now = new Date();
    return Math.ceil(
      (nextPayment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  const isExpired = subscriptionStatus === "expired";
  const daysUntil = getDaysUntilPayment();

  if (!showReminder) return null;

  return (
    <>
      <Alert
        className={`mb-4 ${isExpired ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50"}`}
      >
        <AlertTriangle
          className={`h-4 w-4 ${isExpired ? "text-red-600" : "text-yellow-600"}`}
        />
        <AlertDescription
          className={isExpired ? "text-red-800" : "text-yellow-800"}
        >
          {isExpired ? (
            <div>
              <p className="font-medium">Tu suscripción ha vencido</p>
              <p>
                Para continuar usando la plataforma, sube tu comprobante de
                pago.
              </p>
            </div>
          ) : (
            <div>
              <p className="font-medium">Recordatorio de Pago</p>
              <p>
                Tu suscripción vence en {daysUntil} día
                {daysUntil !== 1 ? "s" : ""}. Sube tu comprobante para evitar
                interrupciones.
              </p>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setShowPaymentDialog(true)}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Subir Comprobante
          </Button>
        </AlertDescription>
      </Alert>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Comprobante de Pago</DialogTitle>
            <DialogDescription>
              Sube tu comprobante de pago mensual para mantener tu cuenta activa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-md text-sm">
              <p className="font-medium mb-2">Información para el pago:</p>
              <ul className="space-y-1 text-gray-700">
                <li>
                  • <strong>Transferencia:</strong> Cuenta 1234567890 - Banco
                  Nacional
                </li>
                <li>
                  • <strong>PayPal:</strong> pagos@mediapp.com
                </li>
                <li>
                  • <strong>Código QR Deuna:</strong> Disponible en la app móvil
                </li>
              </ul>
            </div>

            <div>
              <Label htmlFor="payment_proof">Comprobante de Pago</Label>
              <Input
                id="payment_proof"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowPaymentDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePaymentUpload}
                disabled={!paymentFile || uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Subiendo..." : "Subir Comprobante"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// "use client";

// import type React from "react";

// import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { CreditCard, Upload, AlertTriangle } from "lucide-react";
// import { supabase } from "@/lib/supabase";

// interface PaymentReminderProps {
//   doctorId: string;
//   subscriptionStatus: string;
//   nextPaymentDate: string | null;
// }

// export function PaymentReminder({
//   doctorId,
//   subscriptionStatus,
//   nextPaymentDate,
// }: PaymentReminderProps) {
//   const [showReminder, setShowReminder] = useState(false);
//   const [showPaymentDialog, setShowPaymentDialog] = useState(false);
//   const [paymentFile, setPaymentFile] = useState<File | null>(null);
//   const [uploading, setUploading] = useState(false);

//   useEffect(() => {
//     checkPaymentStatus();
//   }, [nextPaymentDate, subscriptionStatus]);

//   const checkPaymentStatus = () => {
//     if (!nextPaymentDate) return;

//     const nextPayment = new Date(nextPaymentDate);
//     const now = new Date();
//     const daysUntilPayment = Math.ceil(
//       (nextPayment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
//     );

//     // Mostrar recordatorio 5 días antes o si ya venció
//     if (
//       daysUntilPayment <= 5 &&
//       daysUntilPayment >= 0 &&
//       subscriptionStatus === "active"
//     ) {
//       setShowReminder(true);
//     } else if (subscriptionStatus === "expired") {
//       setShowReminder(true);
//     }
//   };

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files[0]) {
//       setPaymentFile(e.target.files[0]);
//     }
//   };

//   const handlePaymentUpload = async () => {
//     if (!paymentFile) return;

//     setUploading(true);
//     try {
//       // Subir comprobante
//       const formData = new FormData();
//       formData.append("file", paymentFile);
//       formData.append("folder", "payment_proofs");
//       formData.append("userId", doctorId);

//       const uploadRes = await fetch("/api/upload", {
//         method: "POST",
//         body: formData,
//       });

//       const uploadResult = await uploadRes.json();
//       if (!uploadRes.ok) throw new Error(uploadResult.error);

//       // Actualizar estado del doctor
//       const { error: updateError } = await supabase
//         .from("doctors")
//         .update({
//           payment_proof_url: uploadResult.url,
//           subscription_status: "pending_verification",
//           is_active: true, // Reactivar temporalmente
//         })
//         .eq("id", doctorId);

//       if (updateError) throw updateError;

//       // Notificar al admin
//       await fetch("/api/notify-admin", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           type: "payment_uploaded",
//           doctorId,
//           paymentProofUrl: uploadResult.url,
//         }),
//       });

//       alert(
//         "Comprobante subido exitosamente. Tu acceso ha sido restaurado temporalmente."
//       );
//       setShowPaymentDialog(false);
//       setShowReminder(false);
//       setPaymentFile(null);

//       // Recargar página para actualizar estado
//       window.location.reload();
//     } catch (error: any) {
//       alert("Error al subir comprobante: " + error.message);
//     } finally {
//       setUploading(false);
//     }
//   };

//   const getDaysUntilPayment = () => {
//     if (!nextPaymentDate) return 0;
//     const nextPayment = new Date(nextPaymentDate);
//     const now = new Date();
//     return Math.ceil(
//       (nextPayment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
//     );
//   };

//   const isExpired = subscriptionStatus === "expired";
//   const daysUntil = getDaysUntilPayment();

//   if (!showReminder) return null;

//   return (
//     <>
//       <Alert
//         className={`mb-4 ${
//           isExpired
//             ? "border-red-500 bg-red-50"
//             : "border-yellow-500 bg-yellow-50"
//         }`}
//       >
//         <AlertTriangle
//           className={`h-4 w-4 ${
//             isExpired ? "text-red-600" : "text-yellow-600"
//           }`}
//         />
//         <AlertDescription
//           className={isExpired ? "text-red-800" : "text-yellow-800"}
//         >
//           {isExpired ? (
//             <div>
//               <p className="font-medium">Tu suscripción ha vencido</p>
//               <p>
//                 Para continuar usando la plataforma, sube tu comprobante de
//                 pago.
//               </p>
//             </div>
//           ) : (
//             <div>
//               <p className="font-medium">Recordatorio de Pago</p>
//               <p>
//                 Tu suscripción vence en {daysUntil} día
//                 {daysUntil !== 1 ? "s" : ""}. Sube tu comprobante para evitar
//                 interrupciones.
//               </p>
//             </div>
//           )}
//           <Button
//             variant="outline"
//             size="sm"
//             className="mt-2"
//             onClick={() => setShowPaymentDialog(true)}
//           >
//             <CreditCard className="h-4 w-4 mr-2" />
//             Subir Comprobante
//           </Button>
//         </AlertDescription>
//       </Alert>

//       <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Subir Comprobante de Pago</DialogTitle>
//             <DialogDescription>
//               Sube tu comprobante de pago mensual para mantener tu cuenta activa
//             </DialogDescription>
//           </DialogHeader>

//           <div className="space-y-4">
//             <div className="bg-blue-50 p-3 rounded-md text-sm">
//               <p className="font-medium mb-2">Información para el pago:</p>
//               <ul className="space-y-1 text-gray-700">
//                 <li>
//                   • <strong>Transferencia:</strong> Cuenta 1234567890 - Banco
//                   Nacional
//                 </li>
//                 <li>
//                   • <strong>PayPal:</strong> pagos@mediapp.com
//                 </li>
//                 <li>
//                   • <strong>Código QR Deuna:</strong> Disponible en la app móvil
//                 </li>
//               </ul>
//             </div>

//             <div>
//               <Label htmlFor="payment_proof">Comprobante de Pago</Label>
//               <Input
//                 id="payment_proof"
//                 type="file"
//                 accept=".pdf,.jpg,.jpeg,.png"
//                 onChange={handleFileChange}
//               />
//             </div>

//             <div className="flex justify-end space-x-2">
//               <Button
//                 variant="outline"
//                 onClick={() => setShowPaymentDialog(false)}
//               >
//                 Cancelar
//               </Button>
//               <Button
//                 onClick={handlePaymentUpload}
//                 disabled={!paymentFile || uploading}
//               >
//                 <Upload className="h-4 w-4 mr-2" />
//                 {uploading ? "Subiendo..." : "Subir Comprobante"}
//               </Button>
//             </div>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// }
