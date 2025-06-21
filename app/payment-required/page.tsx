"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertTriangle, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";

export default function PaymentRequiredPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setDoctorId(user.id);

      // Verificar si está exento de pago
      if (user.email) {
        const { data: exemptedUser } = await supabase
          .from("exempted_users")
          .select("email")
          .eq("email", user.email)
          .single();

        if (exemptedUser) {
          router.push("/dashboard");
          return;
        }
      }

      // Verificar si realmente necesita pagar
      const { data: doctor } = await supabase
        .from("doctors")
        .select("subscription_status, is_active")
        .eq("id", user.id)
        .single();

      if (
        doctor &&
        doctor.subscription_status === "active" &&
        doctor.is_active
      ) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error checking user:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentFile(e.target.files[0]);
    }
  };

  const handlePaymentUpload = async () => {
    if (!paymentFile || !doctorId) return;

    setLoading(true);
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

      // Calcular próxima fecha de pago
      const nextPaymentDate = new Date();
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

      // Actualizar estado del doctor
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

      alert("Comprobante subido exitosamente. Tu acceso ha sido restaurado.");
      router.push("/dashboard");
    } catch (error: any) {
      alert("Error al subir comprobante: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-600">
            Acceso Suspendido
          </CardTitle>
          <CardDescription>
            Tu suscripción ha vencido. Sube tu comprobante de pago para
            reactivar tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Cuenta suspendida por falta de pago</strong>
              <br />
              Para continuar usando la plataforma, debes subir tu comprobante de
              pago mensual.
            </AlertDescription>
          </Alert>

          <div className="bg-blue-50 p-4 rounded-md text-sm">
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

          <div className="space-y-2">
            <Button
              onClick={handlePaymentUpload}
              disabled={!paymentFile || loading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {loading ? "Subiendo..." : "Subir Comprobante y Reactivar"}
            </Button>

            <Button variant="outline" onClick={handleLogout} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// "use client";

// import type React from "react";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { Upload, AlertTriangle, LogOut } from "lucide-react";
// import { supabase } from "@/lib/supabase";

// export default function PaymentRequiredPage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);
//   const [paymentFile, setPaymentFile] = useState<File | null>(null);
//   const [doctorId, setDoctorId] = useState<string | null>(null);

//   useEffect(() => {
//     checkUser();
//   }, []);

//   const checkUser = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         router.push("/login");
//         return;
//       }

//       setDoctorId(user.id);

//       // Verificar si realmente necesita pagar
//       const { data: doctor } = await supabase
//         .from("doctors")
//         .select("subscription_status, is_active")
//         .eq("id", user.id)
//         .single();

//       if (
//         doctor &&
//         doctor.subscription_status === "active" &&
//         doctor.is_active
//       ) {
//         router.push("/dashboard");
//       }
//     } catch (error) {
//       console.error("Error checking user:", error);
//     }
//   };

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files[0]) {
//       setPaymentFile(e.target.files[0]);
//     }
//   };

//   const handlePaymentUpload = async () => {
//     if (!paymentFile || !doctorId) return;

//     setLoading(true);
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
//           last_payment_date: new Date().toISOString(),
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

//       alert("Comprobante subido exitosamente. Tu acceso ha sido restaurado.");
//       router.push("/dashboard");
//     } catch (error: any) {
//       alert("Error al subir comprobante: " + error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLogout = async () => {
//     await supabase.auth.signOut();
//     router.push("/");
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
//       <Card className="w-full max-w-md">
//         <CardHeader className="text-center">
//           <div className="flex justify-center mb-4">
//             <AlertTriangle className="h-12 w-12 text-red-600" />
//           </div>
//           <CardTitle className="text-2xl text-red-600">
//             Acceso Suspendido
//           </CardTitle>
//           <CardDescription>
//             Tu suscripción ha vencido. Sube tu comprobante de pago para
//             reactivar tu cuenta.
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-6">
//           <Alert className="border-red-200 bg-red-50">
//             <AlertTriangle className="h-4 w-4 text-red-600" />
//             <AlertDescription className="text-red-800">
//               <strong>Cuenta suspendida por falta de pago</strong>
//               <br />
//               Para continuar usando la plataforma, debes subir tu comprobante de
//               pago mensual.
//             </AlertDescription>
//           </Alert>

//           <div className="bg-blue-50 p-4 rounded-md text-sm">
//             <p className="font-medium mb-2">Información para el pago:</p>
//             <ul className="space-y-1 text-gray-700">
//               <li>
//                 • <strong>Transferencia:</strong> Cuenta 1234567890 - Banco
//                 Nacional
//               </li>
//               <li>
//                 • <strong>PayPal:</strong> pagos@mediapp.com
//               </li>
//               <li>
//                 • <strong>Código QR Deuna:</strong> Disponible en la app móvil
//               </li>
//             </ul>
//           </div>

//           <div>
//             <Label htmlFor="payment_proof">Comprobante de Pago</Label>
//             <Input
//               id="payment_proof"
//               type="file"
//               accept=".pdf,.jpg,.jpeg,.png"
//               onChange={handleFileChange}
//             />
//           </div>

//           <div className="space-y-2">
//             <Button
//               onClick={handlePaymentUpload}
//               disabled={!paymentFile || loading}
//               className="w-full"
//             >
//               <Upload className="h-4 w-4 mr-2" />
//               {loading ? "Subiendo..." : "Subir Comprobante y Reactivar"}
//             </Button>

//             <Button variant="outline" onClick={handleLogout} className="w-full">
//               <LogOut className="h-4 w-4 mr-2" />
//               Cerrar Sesión
//             </Button>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
