"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield, FileText, CreditCard } from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { SignatureUpload } from "@/components/signature-upload";
import { PaymentUpload } from "@/components/payment-upload";
import { useUser } from "@/contexts/user-context";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";
import { PersonalDataTab } from "@/components/profile/personal-data-tab";
import { SecurityTab } from "@/components/profile/security-tab";
import { DocumentsTab } from "@/components/profile/documents-tab";
import type { Doctor } from "@/lib/supabase/types/doctor";
import type { MedicalSpecialty } from "@/lib/supabase/types/medicalspeciality";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([]);
  const { updateUserData } = useUser();
  const { showSuccess, showError } = useToastEnhanced();

  useEffect(() => {
    loadProfile();
    loadSpecialties();
  }, []);

  const loadProfile = async () => {
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
      showError("Error cargando perfil", error.message);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadSpecialties = async () => {
    try {
      const { data, error } = await supabase
        .from("medical_specialties")
        .select("*")
        .order("name");

      if (error) throw error;
      setSpecialties(data || []);
    } catch (error: any) {
      showError("Error cargando especialidades", error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error al cargar el perfil</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-4">
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="personal">
                  <User className="h-4 w-4 mr-2" />
                  Datos Personales
                </TabsTrigger>
                <TabsTrigger value="security">
                  <Shield className="h-4 w-4 mr-2" />
                  Seguridad
                </TabsTrigger>
                <TabsTrigger value="signature">
                  <FileText className="h-4 w-4 mr-2" />
                  Firma y Sello
                </TabsTrigger>
                <TabsTrigger value="documents">
                  <FileText className="h-4 w-4 mr-2" />
                  Documentos
                </TabsTrigger>
                <TabsTrigger value="payments">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pagos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <PersonalDataTab
                  doctor={doctor}
                  specialties={specialties}
                  onSuccess={loadProfile}
                  updateUserData={updateUserData}
                />
              </TabsContent>

              <TabsContent value="security">
                <SecurityTab />
              </TabsContent>

              <TabsContent value="signature">
                <SignatureUpload
                  doctorId={doctor.id}
                  currentSignatureUrl={doctor.signature_stamp_url ?? null}
                  onSuccess={loadProfile}
                />
              </TabsContent>

              <TabsContent value="documents">
                <DocumentsTab doctor={doctor} onSuccess={loadProfile} />
              </TabsContent>

              <TabsContent value="payments">
                <PaymentUpload
                  doctorId={doctor.id}
                  currentPaymentUrl={doctor.payment_proof_url ?? null}
                  onSuccess={loadProfile}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
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
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import {
//   User,
//   Upload,
//   Save,
//   Eye,
//   EyeOff,
//   FileText,
//   FilePenLineIcon as Signature,
//   Shield,
//   Trash2,
//   CreditCard,
//   Palette,
// } from "lucide-react";
// import { supabase } from "@/lib/supabase/supabase";
// import { SignatureUpload } from "@/components/signature-upload";
// import { PaymentUpload } from "@/components/payment-upload";
// import { ThemeSelector } from "@/components/theme-selector";
// import { useUser } from "@/contexts/user-context";
// import type { Doctor } from "@/lib/supabase/types/doctor";
// import type { MedicalSpecialty } from "@/lib/supabase/types/medicalspeciality";

// export default function ProfilePage() {
//   const router = useRouter();
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [doctor, setDoctor] = useState<Doctor | null>(null);
//   const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([]);
//   const [showCurrentPassword, setShowCurrentPassword] = useState(false);
//   const [showNewPassword, setShowNewPassword] = useState(false);
//   const { updateUserData } = useUser();
//   const [personalData, setPersonalData] = useState({
//     full_name: "",
//     email: "",
//     specialty: "",
//     license_number: "",
//   });

//   const [passwordData, setPasswordData] = useState({
//     currentPassword: "",
//     newPassword: "",
//     confirmPassword: "",
//   });

//   const [documentFile, setDocumentFile] = useState<File | null>(null);

//   useEffect(() => {
//     loadProfile();
//     loadSpecialties();
//   }, []);

//   const loadProfile = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         router.push("/login");
//         return;
//       }

//       const { data: doctorData, error } = await supabase
//         .from("doctors")
//         .select("*")
//         .eq("id", user.id)
//         .single();

//       if (error) throw error;

//       setDoctor(doctorData);

//       setPersonalData({
//         full_name: doctorData.full_name,
//         email: doctorData.email,
//         specialty: doctorData.specialty || "",
//         license_number: doctorData.license_number,
//       });
//       console.log(
//         "Valor actual de doctor.payment_proof_url:",
//         doctorData.payment_proof_url
//       );
//     } catch (error: any) {
//       console.error("Error loading profile:", error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadSpecialties = async () => {
//     try {
//       const { data, error } = await supabase
//         .from("medical_specialties")
//         .select("*")
//         .order("name");

//       if (error) throw error;
//       setSpecialties(data || []);
//     } catch (error: any) {
//       console.error("Error loading specialties:", error.message);
//     }
//   };

//   const handlePersonalDataChange = (field: string, value: string) => {
//     setPersonalData((prev) => ({ ...prev, [field]: value }));
//   };

//   const handlePasswordChange = (field: string, value: string) => {
//     setPasswordData((prev) => ({ ...prev, [field]: value }));
//   };

//   const handleFileChange = (file: File | null) => {
//     setDocumentFile(file);
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

//   const savePersonalData = async () => {
//     if (!doctor) return;

//     setSaving(true);
//     try {
//       // Actualización optimista - UI se actualiza inmediatamente
//       updateUserData({
//         full_name: personalData.full_name,
//         email: personalData.email,
//         specialty: personalData.specialty,
//         license_number: personalData.license_number,
//       });

//       const { error } = await supabase
//         .from("doctors")
//         .update({
//           full_name: personalData.full_name,
//           email: personalData.email,
//           specialty: personalData.specialty,
//           license_number: personalData.license_number,
//         })
//         .eq("id", doctor.id);

//       if (error) {
//         // Si falla, revertir cambios
//         updateUserData(doctor);
//         throw error;
//       }

//       if (personalData.email !== doctor.email) {
//         const { error: authError } = await supabase.auth.updateUser({
//           email: personalData.email,
//         });
//         if (authError) throw authError;
//       }

//       alert("Datos personales actualizados correctamente");
//       loadProfile();
//     } catch (error: any) {
//       alert("Error al actualizar datos: " + error.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const changePassword = async () => {
//     if (passwordData.newPassword !== passwordData.confirmPassword) {
//       alert("Las contraseñas nuevas no coinciden");
//       return;
//     }

//     if (passwordData.newPassword.length < 6) {
//       alert("La nueva contraseña debe tener al menos 6 caracteres");
//       return;
//     }

//     setSaving(true);
//     try {
//       const { error } = await supabase.auth.updateUser({
//         password: passwordData.newPassword,
//       });

//       if (error) throw error;

//       alert("Contraseña actualizada correctamente");
//       setPasswordData({
//         currentPassword: "",
//         newPassword: "",
//         confirmPassword: "",
//       });
//     } catch (error: any) {
//       alert("Error al cambiar contraseña: " + error.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const saveDocument = async () => {
//     if (!doctor || !documentFile) return;

//     setSaving(true);
//     try {
//       const {
//         data: { user },
//         error: userError,
//       } = await supabase.auth.getUser();

//       if (userError || !user) throw new Error("Usuario no autenticado");

//       const documentUrl = await uploadFile(documentFile, user.id, user.id);

//       const { error: updateError } = await supabase
//         .from("doctors")
//         .update({ document_url: documentUrl })
//         .eq("id", doctor.id);

//       if (updateError) throw updateError;

//       alert("Documento actualizado correctamente");
//       loadProfile();
//       setDocumentFile(null);
//     } catch (error: any) {
//       alert("Error al subir documento: " + error.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   const deleteDocument = async () => {
//     if (!doctor?.document_url) return;

//     const confirmDelete = confirm(
//       "¿Estás seguro de que quieres eliminar tu documento?"
//     );
//     if (!confirmDelete) return;

//     setSaving(true);
//     try {
//       const { error } = await supabase
//         .from("doctors")
//         .update({ document_url: null })
//         .eq("id", doctor.id);

//       if (error) throw error;

//       alert("Documento eliminado correctamente");
//       loadProfile();
//     } catch (error: any) {
//       alert("Error al eliminar documento: " + error.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Cargando perfil...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!doctor) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-red-600">Error al cargar el perfil</p>
//           <Button onClick={() => router.push("/dashboard")} className="mt-4">
//             Volver al Dashboard
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-background">
//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
//           <div className="lg:col-span-4">
//             <Tabs defaultValue="personal" className="space-y-6">
//               <TabsList className="grid w-full grid-cols-6">
//                 <TabsTrigger value="personal">
//                   <User className="h-4 w-4 mr-2" />
//                   Datos Personales
//                 </TabsTrigger>
//                 <TabsTrigger value="security">
//                   <Shield className="h-4 w-4 mr-2" />
//                   Seguridad
//                 </TabsTrigger>
//                 <TabsTrigger value="signature">
//                   <Signature className="h-4 w-4 mr-2" />
//                   Firma y Sello
//                 </TabsTrigger>
//                 <TabsTrigger value="documents">
//                   <FileText className="h-4 w-4 mr-2" />
//                   Documentos
//                 </TabsTrigger>
//                 <TabsTrigger value="payments">
//                   <CreditCard className="h-4 w-4 mr-2" />
//                   Pagos
//                 </TabsTrigger>
//                 <TabsTrigger value="theme">
//                   <Palette className="h-4 w-4 mr-2" />
//                   Tema
//                 </TabsTrigger>
//               </TabsList>

//               <TabsContent value="personal">
//                 <Card>
//                   <CardHeader>
//                     <CardTitle>Información Personal</CardTitle>
//                     <CardDescription>
//                       Actualiza tu información personal y profesional
//                     </CardDescription>
//                   </CardHeader>
//                   <CardContent className="space-y-6">
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                       <div>
//                         <Label htmlFor="full_name">Nombre Completo</Label>
//                         <Input
//                           id="full_name"
//                           value={personalData.full_name}
//                           onChange={(e) =>
//                             handlePersonalDataChange(
//                               "full_name",
//                               e.target.value
//                             )
//                           }
//                         />
//                       </div>
//                       <div>
//                         <Label htmlFor="email">Correo Electrónico</Label>
//                         <Input
//                           id="email"
//                           type="email"
//                           value={personalData.email}
//                           onChange={(e) =>
//                             handlePersonalDataChange("email", e.target.value)
//                           }
//                         />
//                       </div>
//                     </div>

//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                       <div>
//                         <Label htmlFor="license_number">
//                           Número de Matrícula
//                         </Label>
//                         <Input
//                           id="license_number"
//                           value={personalData.license_number}
//                           onChange={(e) =>
//                             handlePersonalDataChange(
//                               "license_number",
//                               e.target.value
//                             )
//                           }
//                         />
//                       </div>
//                       <div>
//                         <Label htmlFor="specialty">Especialidad</Label>
//                         <Select
//                           value={personalData.specialty}
//                           onValueChange={(value) =>
//                             handlePersonalDataChange("specialty", value)
//                           }
//                         >
//                           <SelectTrigger>
//                             <SelectValue placeholder="Seleccionar especialidad" />
//                           </SelectTrigger>
//                           <SelectContent>
//                             {specialties.map((specialty) => (
//                               <SelectItem
//                                 key={specialty.id}
//                                 value={specialty.name}
//                               >
//                                 {specialty.name}
//                               </SelectItem>
//                             ))}
//                           </SelectContent>
//                         </Select>
//                       </div>
//                     </div>

//                     <div className="flex justify-end">
//                       <Button onClick={savePersonalData} disabled={saving}>
//                         <Save className="h-4 w-4 mr-2" />
//                         {saving ? "Guardando..." : "Guardar Cambios"}
//                       </Button>
//                     </div>
//                   </CardContent>
//                 </Card>
//               </TabsContent>

//               <TabsContent value="security">
//                 <Card>
//                   <CardHeader>
//                     <CardTitle>Cambiar Contraseña</CardTitle>
//                     <CardDescription>
//                       Actualiza tu contraseña para mantener tu cuenta segura
//                     </CardDescription>
//                   </CardHeader>
//                   <CardContent className="space-y-6">
//                     <div>
//                       <Label htmlFor="current_password">
//                         Contraseña Actual
//                       </Label>
//                       <div className="relative">
//                         <Input
//                           id="current_password"
//                           type={showCurrentPassword ? "text" : "password"}
//                           value={passwordData.currentPassword}
//                           onChange={(e) =>
//                             handlePasswordChange(
//                               "currentPassword",
//                               e.target.value
//                             )
//                           }
//                         />
//                         <Button
//                           type="button"
//                           variant="ghost"
//                           size="sm"
//                           className="absolute right-0 top-0 h-full px-3"
//                           onClick={() =>
//                             setShowCurrentPassword(!showCurrentPassword)
//                           }
//                         >
//                           {showCurrentPassword ? (
//                             <EyeOff className="h-4 w-4" />
//                           ) : (
//                             <Eye className="h-4 w-4" />
//                           )}
//                         </Button>
//                       </div>
//                     </div>

//                     <div>
//                       <Label htmlFor="new_password">Nueva Contraseña</Label>
//                       <div className="relative">
//                         <Input
//                           id="new_password"
//                           type={showNewPassword ? "text" : "password"}
//                           value={passwordData.newPassword}
//                           onChange={(e) =>
//                             handlePasswordChange("newPassword", e.target.value)
//                           }
//                         />
//                         <Button
//                           type="button"
//                           variant="ghost"
//                           size="sm"
//                           className="absolute right-0 top-0 h-full px-3"
//                           onClick={() => setShowNewPassword(!showNewPassword)}
//                         >
//                           {showNewPassword ? (
//                             <EyeOff className="h-4 w-4" />
//                           ) : (
//                             <Eye className="h-4 w-4" />
//                           )}
//                         </Button>
//                       </div>
//                     </div>

//                     <div>
//                       <Label htmlFor="confirm_password">
//                         Confirmar Nueva Contraseña
//                       </Label>
//                       <Input
//                         id="confirm_password"
//                         type="password"
//                         value={passwordData.confirmPassword}
//                         onChange={(e) =>
//                           handlePasswordChange(
//                             "confirmPassword",
//                             e.target.value
//                           )
//                         }
//                       />
//                     </div>

//                     <div className="flex justify-end">
//                       <Button onClick={changePassword} disabled={saving}>
//                         <Save className="h-4 w-4 mr-2" />
//                         {saving ? "Cambiando..." : "Cambiar Contraseña"}
//                       </Button>
//                     </div>
//                   </CardContent>
//                 </Card>
//               </TabsContent>

//               <TabsContent value="signature">
//                 <Card>
//                   <CardHeader>
//                     <CardTitle className="flex items-center">
//                       <Signature className="h-5 w-5 mr-2" />
//                       Firma y Sello Digital
//                     </CardTitle>
//                     <CardDescription>
//                       Sube una imagen PNG que contenga tanto tu firma como tu
//                       sello médico para usar en las recetas
//                     </CardDescription>
//                   </CardHeader>
//                   <CardContent>
//                     <SignatureUpload
//                       doctorId={doctor.id}
//                       currentSignatureUrl={doctor.signature_stamp_url ?? null}
//                       onSuccess={loadProfile}
//                     />
//                   </CardContent>
//                 </Card>
//               </TabsContent>

//               <TabsContent value="documents">
//                 <Card>
//                   <CardHeader>
//                     <CardTitle className="flex items-center">
//                       <FileText className="h-5 w-5 mr-2" />
//                       Documentos de Credencial
//                     </CardTitle>
//                     <CardDescription>
//                       Gestiona tus documentos de credencial médica
//                     </CardDescription>
//                   </CardHeader>
//                   <CardContent className="space-y-6">
//                     {doctor.document_url && (
//                       <div className="border rounded-lg p-4 bg-background">
//                         <p className="text-sm text-gray-600 mb-2">
//                           Documento actual:
//                         </p>
//                         <div className="flex items-center justify-between">
//                           <span className="text-sm">
//                             Documento de credencial
//                           </span>
//                           <div className="space-x-2">
//                             <Button
//                               variant="outline"
//                               size="sm"
//                               onClick={() =>
//                                 window.open(doctor.document_url!, "_blank")
//                               }
//                             >
//                               Ver
//                             </Button>
//                             <Button
//                               variant="destructive"
//                               size="sm"
//                               onClick={deleteDocument}
//                               disabled={saving}
//                             >
//                               <Trash2 className="h-4 w-4 mr-2" />
//                               Eliminar
//                             </Button>
//                           </div>
//                         </div>
//                       </div>
//                     )}

//                     <div>
//                       <Label htmlFor="document">
//                         Nuevo Documento (PDF recomendado)
//                       </Label>
//                       <Input
//                         id="document"
//                         type="file"
//                         accept=".pdf,.jpg,.jpeg,.png"
//                         onChange={(e) =>
//                           handleFileChange(e.target.files?.[0] || null)
//                         }
//                       />
//                     </div>

//                     <div className="flex justify-end">
//                       <Button
//                         onClick={saveDocument}
//                         disabled={!documentFile || saving}
//                       >
//                         <Upload className="h-4 w-4 mr-2" />
//                         {saving ? "Subiendo..." : "Subir Documento"}
//                       </Button>
//                     </div>
//                   </CardContent>
//                 </Card>
//               </TabsContent>

//               <TabsContent value="payments">
//                 <Card>
//                   <CardHeader>
//                     <CardTitle className="flex items-center">
//                       <CreditCard className="h-5 w-5 mr-2" />
//                       Gestión de Pagos
//                     </CardTitle>
//                     <CardDescription>
//                       Sube tus comprobantes de pago mensual para mantener tu
//                       cuenta activa
//                     </CardDescription>
//                   </CardHeader>
//                   <CardContent>
//                     <PaymentUpload
//                       doctorId={doctor.id}
//                       currentPaymentUrl={doctor.payment_proof_url ?? null}
//                       onSuccess={loadProfile}
//                     />
//                   </CardContent>
//                 </Card>
//               </TabsContent>

//               <TabsContent value="theme">
//                 <ThemeSelector
//                   doctorId={doctor.id}
//                   currentTheme={doctor.preferred_theme || "default"}
//                 />
//               </TabsContent>
//             </Tabs>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }
