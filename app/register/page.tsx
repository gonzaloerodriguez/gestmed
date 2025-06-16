"use client";

import type React from "react";
import { useState, useRef } from "react";
import Link from "next/link";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Stethoscope, CreditCard, FileText, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePublicRoute } from "@/lib/public-route-guard";

export default function RegisterPage() {
  const router = useRouter();
  const { loading: routeLoading, canAccess } = usePublicRoute();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    cedula: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
    licenseNumber: "",
    specialty: "",
  });

  // Estados para archivos obligatorios
  const [accessDocument, setAccessDocument] = useState<File | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const accessDocRef = useRef<HTMLInputElement | null>(null);
  const paymentProofRef = useRef<HTMLInputElement | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (
    type: "access" | "payment",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      if (type === "access") {
        setAccessDocument(e.target.files[0]);
      } else {
        setPaymentProof(e.target.files[0]);
      }
    }
  };

  const isFormValid = () => {
    return (
      formData.fullName.trim() &&
      formData.cedula.trim() &&
      formData.email.trim() &&
      formData.password.trim() &&
      formData.confirmPassword.trim() &&
      formData.gender &&
      formData.licenseNumber.trim() &&
      accessDocument &&
      paymentProof &&
      acceptTerms &&
      formData.password === formData.confirmPassword
    );
  };

  const checkIfEmailExempted = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("exempted_users")
        .select("email")
        .eq("email", email.toLowerCase())
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  };

  const uploadFile = async (
    file: File,
    folder: string,
    userId: string
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    formData.append("userId", userId);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Upload failed");
    }

    const result = await response.json();
    return result.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validaciones
      if (formData.password !== formData.confirmPassword) {
        alert("Las contraseñas no coinciden");
        return;
      }

      if (!isFormValid()) {
        alert("Por favor completa todos los campos obligatorios");
        return;
      }

      // Verificar si el email está exento de pago
      const isExempted = await checkIfEmailExempted(formData.email);

      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        let documentUrl = null;
        let paymentProofUrl = null;

        // Subir documento ACCESS (siempre requerido)
        if (accessDocument) {
          documentUrl = await uploadFile(
            accessDocument,
            "access_documents",
            authData.user.id
          );
        }

        // Subir comprobante de pago (solo si no está exento)
        if (paymentProof && !isExempted) {
          paymentProofUrl = await uploadFile(
            paymentProof,
            "payment_proofs",
            authData.user.id
          );
        }

        // Crear perfil de médico con las nuevas columnas
        const doctorData = {
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          cedula: formData.cedula, // Mantener como string
          gender: formData.gender as "male" | "female",
          license_number: formData.licenseNumber,
          specialty: formData.specialty || null,
          document_url: documentUrl, // Usar la columna existente
          payment_proof_url: paymentProofUrl,
          subscription_status: isExempted ? "active" : "pending_verification",
          is_active: isExempted,
          last_payment_date: isExempted ? new Date().toISOString() : null,
          next_payment_date: isExempted
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        };

        const { error: insertError } = await supabase
          .from("doctors")
          .insert(doctorData);

        if (insertError) throw insertError;

        // Enviar notificación al admin (solo si no está exento)
        if (!isExempted) {
          await fetch("/api/notify-admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "new_registration",
              doctorId: authData.user.id,
              doctorName: formData.fullName,
              doctorEmail: formData.email,
            }),
          });
        }

        alert(
          isExempted
            ? "Registro exitoso. Tu cuenta ha sido activada automáticamente."
            : "Registro exitoso. Tu cuenta será activada una vez se verifique el pago. Por favor verifica tu correo electrónico."
        );

        router.push("/login");
      }
    } catch (error: any) {
      alert("Error en el registro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras se verifica si puede acceder
  if (routeLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">
                Verificando sesión...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si no puede acceder (ya está autenticado), no mostrar nada
  if (!canAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Stethoscope className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Registro de Médico</CardTitle>
          <CardDescription>
            Crea tu cuenta para comenzar a gestionar recetas médicas digitales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Información Personal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Nombre Completo *</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="cedula">Cédula de Identidad *</Label>
                <Input
                  id="cedula"
                  name="cedula"
                  type="text"
                  required
                  value={formData.cedula}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Correo Electrónico *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">Contraseña *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gender">Sexo *</Label>
                <Select
                  onValueChange={(value) =>
                    setFormData({ ...formData, gender: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sexo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="licenseNumber">Número de Matrícula *</Label>
                <Input
                  id="licenseNumber"
                  name="licenseNumber"
                  type="text"
                  required
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="specialty">Especialidad</Label>
              <Input
                id="specialty"
                name="specialty"
                type="text"
                value={formData.specialty}
                onChange={handleInputChange}
              />
            </div>

            {/* Documentos Obligatorios */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Documentos Requeridos</h3>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Para completar tu registro, debes subir tu documento ACCESS y
                  comprobante de pago. Tu cuenta será activada una vez
                  verificados los documentos.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="accessDocument">Documento ACCESS *</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="accessDocument"
                    ref={accessDocRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange("access", e)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => accessDocRef.current?.click()}
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {accessDocument
                      ? accessDocument.name
                      : "Subir Documento ACCESS"}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="paymentProof">Comprobante de Pago *</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Input
                      id="paymentProof"
                      ref={paymentProofRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange("payment", e)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => paymentProofRef.current?.click()}
                      className="w-full"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      {paymentProof
                        ? paymentProof.name
                        : "Subir Comprobante de Pago"}
                    </Button>
                  </div>

                  {/* Información de Pago */}
                  <div className="bg-blue-50 p-3 rounded-md text-sm">
                    <p className="font-medium mb-2">
                      Información para el pago:
                    </p>
                    <ul className="space-y-1 text-gray-700">
                      <li>
                        • <strong>Transferencia:</strong> Cuenta 1234567890 -
                        Banco Nacional
                      </li>
                      <li>
                        • <strong>PayPal:</strong> pagos@mediapp.com
                      </li>
                      <li>
                        • <strong>Código QR Deuna:</strong> Disponible en la app
                        móvil
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Términos y Condiciones */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) =>
                  setAcceptTerms(checked as boolean)
                }
              />
              <Label htmlFor="terms" className="text-sm">
                Acepto los{" "}
                <Link href="/terms" className="text-blue-600 hover:underline">
                  términos y condiciones
                </Link>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !isFormValid()}
            >
              {loading ? "Registrando..." : "Completar Registro"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/login" className="text-blue-600 hover:underline">
                Iniciar Sesión
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// "use client";

// import type React from "react";
// import { useState, useRef } from "react";
// import Link from "next/link";
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
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { Stethoscope, CreditCard, FileText, Info } from "lucide-react";
// import { supabase } from "@/lib/supabase";

// export default function RegisterPage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);
//   const [formData, setFormData] = useState({
//     fullName: "",
//     cedula: "",
//     email: "",
//     password: "",
//     confirmPassword: "",
//     gender: "",
//     licenseNumber: "",
//     specialty: "",
//   });

//   // Estados para archivos obligatorios
//   const [accessDocument, setAccessDocument] = useState<File | null>(null);
//   const [paymentProof, setPaymentProof] = useState<File | null>(null);
//   const [acceptTerms, setAcceptTerms] = useState(false);

//   const accessDocRef = useRef<HTMLInputElement | null>(null);
//   const paymentProofRef = useRef<HTMLInputElement | null>(null);

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//   };

//   const handleFileChange = (
//     type: "access" | "payment",
//     e: React.ChangeEvent<HTMLInputElement>
//   ) => {
//     if (e.target.files && e.target.files[0]) {
//       if (type === "access") {
//         setAccessDocument(e.target.files[0]);
//       } else {
//         setPaymentProof(e.target.files[0]);
//       }
//     }
//   };

//   const isFormValid = () => {
//     return (
//       formData.fullName.trim() &&
//       formData.cedula.trim() &&
//       formData.email.trim() &&
//       formData.password.trim() &&
//       formData.confirmPassword.trim() &&
//       formData.gender &&
//       formData.licenseNumber.trim() &&
//       accessDocument &&
//       paymentProof &&
//       acceptTerms &&
//       formData.password === formData.confirmPassword
//     );
//   };

//   const checkIfEmailExempted = async (email: string): Promise<boolean> => {
//     try {
//       const { data, error } = await supabase
//         .from("exempted_users")
//         .select("email")
//         .eq("email", email.toLowerCase())
//         .single();

//       return !error && !!data;
//     } catch {
//       return false;
//     }
//   };

//   const uploadFile = async (
//     file: File,
//     folder: string,
//     userId: string
//   ): Promise<string> => {
//     const formData = new FormData();
//     formData.append("file", file);
//     formData.append("folder", folder);
//     formData.append("userId", userId);

//     const response = await fetch("/api/upload", {
//       method: "POST",
//       body: formData,
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.error || "Upload failed");
//     }

//     const result = await response.json();
//     return result.url;
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       // Validaciones
//       if (formData.password !== formData.confirmPassword) {
//         alert("Las contraseñas no coinciden");
//         return;
//       }

//       if (!isFormValid()) {
//         alert("Por favor completa todos los campos obligatorios");
//         return;
//       }

//       // Verificar si el email está exento de pago
//       const isExempted = await checkIfEmailExempted(formData.email);

//       // Crear usuario en Supabase Auth
//       const { data: authData, error: authError } = await supabase.auth.signUp({
//         email: formData.email,
//         password: formData.password,
//       });

//       if (authError) throw authError;

//       if (authData.user) {
//         let documentUrl = null;
//         let paymentProofUrl = null;

//         // Subir documento ACCESS (siempre requerido)
//         if (accessDocument) {
//           documentUrl = await uploadFile(
//             accessDocument,
//             "access_documents",
//             authData.user.id
//           );
//         }

//         // Subir comprobante de pago (solo si no está exento)
//         if (paymentProof && !isExempted) {
//           paymentProofUrl = await uploadFile(
//             paymentProof,
//             "payment_proofs",
//             authData.user.id
//           );
//         }

//         // Crear perfil de médico con las nuevas columnas
//         const doctorData = {
//           id: authData.user.id,
//           email: formData.email,
//           full_name: formData.fullName,
//           cedula: formData.cedula, // Mantener como string
//           gender: formData.gender as "male" | "female",
//           license_number: formData.licenseNumber,
//           specialty: formData.specialty || null,
//           document_url: documentUrl, // Usar la columna existente
//           payment_proof_url: paymentProofUrl,
//           subscription_status: isExempted ? "active" : "pending_verification",
//           is_active: isExempted,
//           last_payment_date: isExempted ? new Date().toISOString() : null,
//           next_payment_date: isExempted
//             ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
//             : null,
//         };

//         const { error: insertError } = await supabase
//           .from("doctors")
//           .insert(doctorData);

//         if (insertError) throw insertError;

//         // Enviar notificación al admin (solo si no está exento)
//         if (!isExempted) {
//           await fetch("/api/notify-admin", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//               type: "new_registration",
//               doctorId: authData.user.id,
//               doctorName: formData.fullName,
//               doctorEmail: formData.email,
//             }),
//           });
//         }

//         alert(
//           isExempted
//             ? "Registro exitoso. Tu cuenta ha sido activada automáticamente."
//             : "Registro exitoso. Tu cuenta será activada una vez se verifique el pago. Por favor verifica tu correo electrónico."
//         );

//         router.push("/login");
//       }
//     } catch (error: any) {
//       alert("Error en el registro: " + error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
//       <Card className="w-full max-w-2xl">
//         <CardHeader className="text-center">
//           <div className="flex justify-center mb-4">
//             <Stethoscope className="h-12 w-12 text-blue-600" />
//           </div>
//           <CardTitle className="text-2xl">Registro de Médico</CardTitle>
//           <CardDescription>
//             Crea tu cuenta para comenzar a gestionar recetas médicas digitales
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit} className="space-y-4">
//             {/* Información Personal */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <Label htmlFor="fullName">Nombre Completo *</Label>
//                 <Input
//                   id="fullName"
//                   name="fullName"
//                   type="text"
//                   required
//                   value={formData.fullName}
//                   onChange={handleInputChange}
//                 />
//               </div>
//               <div>
//                 <Label htmlFor="cedula">Cédula de Identidad *</Label>
//                 <Input
//                   id="cedula"
//                   name="cedula"
//                   type="text"
//                   required
//                   value={formData.cedula}
//                   onChange={handleInputChange}
//                 />
//               </div>
//             </div>

//             <div>
//               <Label htmlFor="email">Correo Electrónico *</Label>
//               <Input
//                 id="email"
//                 name="email"
//                 type="email"
//                 required
//                 value={formData.email}
//                 onChange={handleInputChange}
//               />
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <Label htmlFor="password">Contraseña *</Label>
//                 <Input
//                   id="password"
//                   name="password"
//                   type="password"
//                   required
//                   value={formData.password}
//                   onChange={handleInputChange}
//                 />
//               </div>
//               <div>
//                 <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
//                 <Input
//                   id="confirmPassword"
//                   name="confirmPassword"
//                   type="password"
//                   required
//                   value={formData.confirmPassword}
//                   onChange={handleInputChange}
//                 />
//               </div>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <Label htmlFor="gender">Sexo *</Label>
//                 <Select
//                   onValueChange={(value) =>
//                     setFormData({ ...formData, gender: value })
//                   }
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="Seleccionar sexo" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="male">Masculino</SelectItem>
//                     <SelectItem value="female">Femenino</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//               <div>
//                 <Label htmlFor="licenseNumber">Número de Matrícula *</Label>
//                 <Input
//                   id="licenseNumber"
//                   name="licenseNumber"
//                   type="text"
//                   required
//                   value={formData.licenseNumber}
//                   onChange={handleInputChange}
//                 />
//               </div>
//             </div>

//             <div>
//               <Label htmlFor="specialty">Especialidad</Label>
//               <Input
//                 id="specialty"
//                 name="specialty"
//                 type="text"
//                 value={formData.specialty}
//                 onChange={handleInputChange}
//               />
//             </div>

//             {/* Documentos Obligatorios */}
//             <div className="space-y-4 border-t pt-4">
//               <h3 className="text-lg font-semibold">Documentos Requeridos</h3>

//               <Alert>
//                 <Info className="h-4 w-4" />
//                 <AlertDescription>
//                   Para completar tu registro, debes subir tu documento ACCESS y
//                   comprobante de pago. Tu cuenta será activada una vez
//                   verificados los documentos.
//                 </AlertDescription>
//               </Alert>

//               <div>
//                 <Label htmlFor="accessDocument">Documento ACCESS *</Label>
//                 <div className="flex items-center space-x-2">
//                   <Input
//                     id="accessDocument"
//                     ref={accessDocRef}
//                     type="file"
//                     accept=".pdf,.jpg,.jpeg,.png"
//                     onChange={(e) => handleFileChange("access", e)}
//                     className="hidden"
//                   />
//                   <Button
//                     type="button"
//                     variant="outline"
//                     onClick={() => accessDocRef.current?.click()}
//                     className="w-full"
//                   >
//                     <FileText className="h-4 w-4 mr-2" />
//                     {accessDocument
//                       ? accessDocument.name
//                       : "Subir Documento ACCESS"}
//                   </Button>
//                 </div>
//               </div>

//               <div>
//                 <Label htmlFor="paymentProof">Comprobante de Pago *</Label>
//                 <div className="space-y-2">
//                   <div className="flex items-center space-x-2">
//                     <Input
//                       id="paymentProof"
//                       ref={paymentProofRef}
//                       type="file"
//                       accept=".pdf,.jpg,.jpeg,.png"
//                       onChange={(e) => handleFileChange("payment", e)}
//                       className="hidden"
//                     />
//                     <Button
//                       type="button"
//                       variant="outline"
//                       onClick={() => paymentProofRef.current?.click()}
//                       className="w-full"
//                     >
//                       <CreditCard className="h-4 w-4 mr-2" />
//                       {paymentProof
//                         ? paymentProof.name
//                         : "Subir Comprobante de Pago"}
//                     </Button>
//                   </div>

//                   {/* Información de Pago */}
//                   <div className="bg-blue-50 p-3 rounded-md text-sm">
//                     <p className="font-medium mb-2">
//                       Información para el pago:
//                     </p>
//                     <ul className="space-y-1 text-gray-700">
//                       <li>
//                         • <strong>Transferencia:</strong> Cuenta 1234567890 -
//                         Banco Nacional
//                       </li>
//                       <li>
//                         • <strong>PayPal:</strong> pagos@mediapp.com
//                       </li>
//                       <li>
//                         • <strong>Código QR Deuna:</strong> Disponible en la app
//                         móvil
//                       </li>
//                     </ul>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Términos y Condiciones */}
//             <div className="flex items-center space-x-2">
//               <Checkbox
//                 id="terms"
//                 checked={acceptTerms}
//                 onCheckedChange={(checked) =>
//                   setAcceptTerms(checked as boolean)
//                 }
//               />
//               <Label htmlFor="terms" className="text-sm">
//                 Acepto los{" "}
//                 <Link href="/terms" className="text-blue-600 hover:underline">
//                   términos y condiciones
//                 </Link>
//               </Label>
//             </div>

//             <Button
//               type="submit"
//               className="w-full"
//               disabled={loading || !isFormValid()}
//             >
//               {loading ? "Registrando..." : "Completar Registro"}
//             </Button>
//           </form>

//           <div className="mt-6 text-center">
//             <p className="text-sm text-gray-600">
//               ¿Ya tienes una cuenta?{" "}
//               <Link href="/login" className="text-blue-600 hover:underline">
//                 Iniciar Sesión
//               </Link>
//             </p>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

// "use client";

// import type React from "react";

// import { useState, useRef } from "react";
// import Link from "next/link";
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
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Stethoscope, Upload } from "lucide-react";
// import { supabase } from "@/lib/supabase";

// export default function RegisterPage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);
//   const [formData, setFormData] = useState({
//     fullName: "",
//     cedula: "",
//     email: "",
//     password: "",
//     confirmPassword: "",
//     gender: "",
//     licenseNumber: "",
//     specialty: "",
//   });
//   const [document, setDocument] = useState<File | null>(null);
//   const fileInputRef = useRef<HTMLInputElement | null>(null);

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//   };

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files[0]) {
//       setDocument(e.target.files[0]);
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);

//     try {
//       // Validaciones
//       if (formData.password !== formData.confirmPassword) {
//         alert("Las contraseñas no coinciden");
//         return;
//       }

//       // Crear usuario en Supabase Auth
//       const { data: authData, error: authError } = await supabase.auth.signUp({
//         email: formData.email,
//         password: formData.password,
//       });

//       if (authError) throw authError;

//       if (authData.user) {
//         let documentUrl = null;

//         if (document) {
//           const formDataDoc = new FormData();
//           formDataDoc.append("file", document);
//           formDataDoc.append("userId", authData.user.id);

//           const uploadRes = await fetch("/api/upload", {
//             method: "POST",
//             body: formDataDoc,
//           });

//           const uploadResult = await uploadRes.json();

//           if (!uploadRes.ok) {
//             throw new Error(uploadResult.error);
//           }

//           documentUrl = uploadResult.url;
//         }

//         // Crear perfil de médico
//         const response = await fetch("/api/register", {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             userId: authData.user.id,
//             email: formData.email,
//             fullName: formData.fullName,
//             cedula: formData.cedula,
//             gender: formData.gender,
//             licenseNumber: formData.licenseNumber,
//             specialty: formData.specialty,
//             documentUrl,
//           }),
//         });

//         const result = await response.json();

//         if (!response.ok) throw new Error(result.error);

//         alert("Registro exitoso. Por favor verifica tu correo electrónico.");
//         router.push("/login");
//       }
//     } catch (error: any) {
//       alert("Error en el registro: " + error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
//       <Card className="w-full max-w-2xl">
//         <CardHeader className="text-center">
//           <div className="flex justify-center mb-4">
//             <Stethoscope className="h-12 w-12 text-blue-600" />
//           </div>
//           <CardTitle className="text-2xl">Registro de Médico</CardTitle>
//           <CardDescription>
//             Crea tu cuenta para comenzar a gestionar recetas médicas digitales
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <Label htmlFor="fullName">Nombre Completo</Label>
//                 <Input
//                   id="fullName"
//                   name="fullName"
//                   type="text"
//                   required
//                   value={formData.fullName}
//                   onChange={handleInputChange}
//                 />
//               </div>
//               <div>
//                 <Label htmlFor="cedula">Cédula de Identidad</Label>
//                 <Input
//                   id="cedula"
//                   name="cedula"
//                   type="text"
//                   required
//                   value={formData.cedula}
//                   onChange={handleInputChange}
//                 />
//               </div>
//             </div>

//             <div>
//               <Label htmlFor="email">Correo Electrónico</Label>
//               <Input
//                 id="email"
//                 name="email"
//                 type="email"
//                 required
//                 value={formData.email}
//                 onChange={handleInputChange}
//               />
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <Label htmlFor="password">Contraseña</Label>
//                 <Input
//                   id="password"
//                   name="password"
//                   type="password"
//                   required
//                   value={formData.password}
//                   onChange={handleInputChange}
//                 />
//               </div>
//               <div>
//                 <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
//                 <Input
//                   id="confirmPassword"
//                   name="confirmPassword"
//                   type="password"
//                   required
//                   value={formData.confirmPassword}
//                   onChange={handleInputChange}
//                 />
//               </div>
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <Label htmlFor="gender">Sexo</Label>
//                 <Select
//                   onValueChange={(value) =>
//                     setFormData({ ...formData, gender: value })
//                   }
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="Seleccionar sexo" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="male">Masculino</SelectItem>
//                     <SelectItem value="female">Femenino</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//               <div>
//                 <Label htmlFor="licenseNumber">Número de Matrícula</Label>
//                 <Input
//                   id="licenseNumber"
//                   name="licenseNumber"
//                   type="text"
//                   required
//                   value={formData.licenseNumber}
//                   onChange={handleInputChange}
//                 />
//               </div>
//             </div>

//             <div>
//               <Label htmlFor="specialty">Especialidad (Opcional)</Label>
//               <Input
//                 id="specialty"
//                 name="specialty"
//                 type="text"
//                 value={formData.specialty}
//                 onChange={handleInputChange}
//               />
//             </div>

//             <div>
//               <Label htmlFor="document">
//                 Documento de Credencial (Opcional)
//               </Label>
//               <div className="flex items-center space-x-2">
//                 <Input
//                   id="document"
//                   ref={fileInputRef}
//                   type="file"
//                   accept=".pdf"
//                   onChange={handleFileChange}
//                   className="hidden"
//                 />

//                 <Button
//                   type="button"
//                   variant="outline"
//                   onClick={() => fileInputRef.current?.click()}
//                   className="w-full"
//                 >
//                   <Upload className="h-4 w-4 mr-2" />
//                   {document ? document.name : "Subir Documento"}
//                 </Button>
//               </div>
//             </div>

//             <Button type="submit" className="w-full" disabled={loading}>
//               {loading ? "Registrando..." : "Registrarse"}
//             </Button>
//           </form>

//           <div className="mt-6 text-center">
//             <p className="text-sm text-gray-600">
//               ¿Ya tienes una cuenta?{" "}
//               <Link href="/login" className="text-blue-600 hover:underline">
//                 Iniciar Sesión
//               </Link>
//             </p>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
