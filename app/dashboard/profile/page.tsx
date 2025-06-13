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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Upload,
  Save,
  Eye,
  EyeOff,
  ArrowLeft,
  FileText,
  FilePenLineIcon as Signature,
  Mail,
  Calendar,
  Shield,
  Trash2,
} from "lucide-react";
import { supabase, type Doctor, type MedicalSpecialty } from "@/lib/supabase";
import { SignatureUpload } from "@/components/signature-upload";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [specialties, setSpecialties] = useState<MedicalSpecialty[]>([]);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Estados para formularios
  const [personalData, setPersonalData] = useState({
    full_name: "",
    email: "",
    specialty: "",
    license_number: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Estados para archivos
  const [signatureStampFile, setSignatureStampFile] = useState<File | null>(
    null
  );
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  // Estados para preview de imágenes
  const [signatureStampPreview, setSignatureStampPreview] = useState<
    string | null
  >(null);

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

      setPersonalData({
        full_name: doctorData.full_name,
        email: doctorData.email,
        specialty: doctorData.specialty || "",
        license_number: doctorData.license_number,
      });

      // Cargar preview de firma+sello existente
      if (doctorData.signature_stamp_url) {
        setSignatureStampPreview(doctorData.signature_stamp_url);
      }
    } catch (error: any) {
      console.error("Error loading profile:", error.message);
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
      console.error("Error loading specialties:", error.message);
    }
  };

  const handlePersonalDataChange = (field: string, value: string) => {
    setPersonalData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (
    type: "signature_stamp" | "document",
    file: File | null
  ) => {
    if (type === "signature_stamp") {
      setSignatureStampFile(file);
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) =>
          setSignatureStampPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setSignatureStampPreview(doctor?.signature_stamp_url || null);
      }
    } else if (type === "document") {
      setDocumentFile(file);
      console.log(file);
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

    console.log("Uploading with data:", {
      fileName: file.name,
      folder,
      userId,
    });

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Upload failed:", error);
      throw new Error(error.error || "Upload failed");
    }

    const result = await response.json();
    return result.url;
  };

  const deleteFile = async (publicId: string) => {
    const response = await fetch("/api/delete-file", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publicId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Delete failed");
    }
  };

  const savePersonalData = async () => {
    if (!doctor) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("doctors")
        .update({
          full_name: personalData.full_name,
          email: personalData.email,
          specialty: personalData.specialty,
          license_number: personalData.license_number,
        })
        .eq("id", doctor.id);

      if (error) throw error;

      // Actualizar email en Auth si cambió
      if (personalData.email !== doctor.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: personalData.email,
        });
        if (authError) throw authError;
      }

      alert("Datos personales actualizados correctamente");
      loadProfile();
    } catch (error: any) {
      alert("Error al actualizar datos: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("Las contraseñas nuevas no coinciden");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      alert("Contraseña actualizada correctamente");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      alert("Error al cambiar contraseña: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveDocument = async () => {
    if (!doctor || !documentFile) return;

    setSaving(true);
    try {
      // Obtener el usuario autenticado
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) throw new Error("Usuario no autenticado");

      console.log("User authenticated:", user.id);

      // Subir el archivo al bucket
      const documentUrl = await uploadFile(documentFile, user.id, user.id);

      // Actualizar base de datos
      const { error: updateError } = await supabase
        .from("doctors")
        .update({ document_url: documentUrl })
        .eq("id", doctor.id);

      if (updateError) throw updateError;

      alert("Documento actualizado correctamente");
      loadProfile();
      setDocumentFile(null);
    } catch (error: any) {
      console.error("Save document error:", error);
      alert("Error al subir documento: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteDocument = async () => {
    if (!doctor?.document_url) return;

    const confirmDelete = confirm(
      "¿Estás seguro de que quieres eliminar tu documento?"
    );
    if (!confirmDelete) return;

    setSaving(true);
    try {
      // Extraer public_id y eliminar de Cloudinary
      const publicId = `medical-app/documents/doctor_${doctor.id}_document`;
      await deleteFile(publicId);

      // Actualizar base de datos
      const { error } = await supabase
        .from("doctors")
        .update({ document_url: null })
        .eq("id", doctor.id);

      if (error) throw error;

      alert("Documento eliminado correctamente");
      loadProfile();
    } catch (error: any) {
      alert("Error al eliminar documento: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error al cargar el perfil</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            Volver al Dashboard
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
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => router.push("/dashboard")}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
                <p className="text-gray-600">
                  Gestiona tu información personal y credenciales
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={doctor.is_active ? "default" : "secondary"}>
                {doctor.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar con información básica */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarImage src={doctor.signature_stamp_url || ""} />
                  <AvatarFallback className="text-2xl">
                    {doctor.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <CardTitle>
                  {doctor.gender === "female" ? "Dra." : "Dr."}{" "}
                  {doctor.full_name}
                </CardTitle>
                <CardDescription>
                  {doctor.specialty || "Médico General"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {doctor.email}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Shield className="h-4 w-4 mr-2" />
                  Matrícula: {doctor.license_number}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Miembro desde{" "}
                  {new Date(doctor.created_at).toLocaleDateString("es-ES")}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contenido principal con tabs */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">
                  <User className="h-4 w-4 mr-2" />
                  Datos Personales
                </TabsTrigger>
                <TabsTrigger value="security">
                  <Shield className="h-4 w-4 mr-2" />
                  Seguridad
                </TabsTrigger>
                <TabsTrigger value="signature">
                  <Signature className="h-4 w-4 mr-2" />
                  Firma y Sello
                </TabsTrigger>
                <TabsTrigger value="documents">
                  <FileText className="h-4 w-4 mr-2" />
                  Documentos
                </TabsTrigger>
              </TabsList>

              {/* Tab: Datos Personales */}
              <TabsContent value="personal">
                <Card>
                  <CardHeader>
                    <CardTitle>Información Personal</CardTitle>
                    <CardDescription>
                      Actualiza tu información personal y profesional
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="full_name">Nombre Completo</Label>
                        <Input
                          id="full_name"
                          value={personalData.full_name}
                          onChange={(e) =>
                            handlePersonalDataChange(
                              "full_name",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                          id="email"
                          type="email"
                          value={personalData.email}
                          onChange={(e) =>
                            handlePersonalDataChange("email", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="license_number">
                          Número de Matrícula
                        </Label>
                        <Input
                          id="license_number"
                          value={personalData.license_number}
                          onChange={(e) =>
                            handlePersonalDataChange(
                              "license_number",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="specialty">Especialidad</Label>
                        <Select
                          value={personalData.specialty}
                          onValueChange={(value) =>
                            handlePersonalDataChange("specialty", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar especialidad" />
                          </SelectTrigger>
                          <SelectContent>
                            {specialties.map((specialty) => (
                              <SelectItem
                                key={specialty.id}
                                value={specialty.name}
                              >
                                {specialty.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={savePersonalData} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Guardando..." : "Guardar Cambios"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Seguridad */}
              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Cambiar Contraseña</CardTitle>
                    <CardDescription>
                      Actualiza tu contraseña para mantener tu cuenta segura
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="current_password">
                        Contraseña Actual
                      </Label>
                      <div className="relative">
                        <Input
                          id="current_password"
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            handlePasswordChange(
                              "currentPassword",
                              e.target.value
                            )
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="new_password">Nueva Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="new_password"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            handlePasswordChange("newPassword", e.target.value)
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="confirm_password">
                        Confirmar Nueva Contraseña
                      </Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          handlePasswordChange(
                            "confirmPassword",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={changePassword} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Cambiando..." : "Cambiar Contraseña"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Firma y Sello */}
              <TabsContent value="signature">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Signature className="h-5 w-5 mr-2" />
                      Firma y Sello Digital
                    </CardTitle>
                    <CardDescription>
                      Sube una imagen PNG que contenga tanto tu firma como tu
                      sello médico para usar en las recetas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SignatureUpload
                      doctorId={doctor.id}
                      currentSignatureUrl={doctor.signature_stamp_url ?? null}
                      onSuccess={loadProfile}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Documentos */}
              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Documentos de Credencial
                    </CardTitle>
                    <CardDescription>
                      Gestiona tus documentos de credencial médica
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {doctor.document_url && (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <p className="text-sm text-gray-600 mb-2">
                          Documento actual:
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">
                            Documento de credencial
                          </span>
                          <div className="space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                window.open(doctor.document_url!, "_blank")
                              }
                            >
                              Ver
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={deleteDocument}
                              disabled={saving}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="document">
                        Nuevo Documento (PDF recomendado)
                      </Label>
                      <Input
                        id="document"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          handleFileChange(
                            "document",
                            e.target.files?.[0] || null
                          )
                        }
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={saveDocument}
                        disabled={!documentFile || saving}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {saving ? "Subiendo..." : "Subir Documento"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
