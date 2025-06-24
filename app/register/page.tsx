"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
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
import {
  Stethoscope,
  CreditCard,
  FileText,
  Info,
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { usePublicRoute } from "@/lib/public-route-guard";
import {
  registerSchema,
  fileValidationSchema,
  type RegisterFormData,
  type FileValidationData,
} from "@/lib/validation/auth-schema";

interface ValidationErrors {
  [key: string]: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { loading: routeLoading, canAccess } = usePublicRoute();
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [isEmailExempted, setIsEmailExempted] = useState(false);
  const [emailCheckMessage, setEmailCheckMessage] = useState("");
  const [emailCheckStatus, setEmailCheckStatus] = useState<
    "idle" | "checking" | "exempted" | "not-exempted" | "error"
  >("idle");

  // Estados de formulario
  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: "",
    cedula: "",
    email: "",
    password: "",
    confirmPassword: "",
    gender: "",
    licenseNumber: "",
    specialty: "",
  });

  // Estados para archivos
  const [fileData, setFileData] = useState<Partial<FileValidationData>>({
    accessDocument: undefined,
    paymentProof: undefined,
    acceptTerms: false,
  });

  // Estados de errores
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const [fileErrors, setFileErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const accessDocRef = useRef<HTMLInputElement | null>(null);
  const paymentProofRef = useRef<HTMLInputElement | null>(null);
  const [emailCheckTimer, setEmailCheckTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  // Validación individual de campos del formulario
  const validateFormField = useCallback(
    async (field: keyof RegisterFormData, value: string) => {
      try {
        // Para el campo gender, no validar si está vacío (aún no seleccionado)
        if (field === "gender" && value === "") {
          setFormErrors((prev) => ({ ...prev, [field]: "" }));
          return true;
        }

        await registerSchema.validateAt(field, { ...formData, [field]: value });
        setFormErrors((prev) => ({ ...prev, [field]: "" }));
        return true;
      } catch (error: any) {
        setFormErrors((prev) => ({ ...prev, [field]: error.message }));
        return false;
      }
    },
    [formData]
  );

  // Validación individual de archivos
  const validateFileField = useCallback(
    async (field: keyof FileValidationData, value: any) => {
      try {
        await fileValidationSchema.validateAt(
          field,
          { ...fileData, [field]: value },
          { context: { isRequired: !isEmailExempted } }
        );
        setFileErrors((prev) => ({ ...prev, [field]: "" }));
        return true;
      } catch (error: any) {
        setFileErrors((prev) => ({ ...prev, [field]: error.message }));
        return false;
      }
    },
    [fileData, isEmailExempted]
  );

  // Manejador de cambios en formulario
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const fieldName = name as keyof RegisterFormData;

      setFormData((prev) => ({ ...prev, [fieldName]: value }));
      setTouchedFields((prev) => new Set(prev).add(fieldName));

      // Validar campo después de un delay
      const timeoutId = setTimeout(() => {
        validateFormField(fieldName, value);
      }, 300);

      // Verificación especial para email
      if (name === "email") {
        if (emailCheckTimer) {
          clearTimeout(emailCheckTimer);
        }

        setIsEmailExempted(false);
        setEmailCheckMessage("");
        setEmailCheckStatus("idle");

        if (value.includes("@") && value.includes(".") && value.length > 5) {
          setEmailCheckTimer(
            setTimeout(() => {
              checkEmailExemption(value);
            }, 1000)
          );
        }
      }

      return () => clearTimeout(timeoutId);
    },
    [validateFormField, emailCheckTimer]
  );

  // Manejador para Select con validación específica
  const handleSelectChange = useCallback(
    (field: keyof RegisterFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setTouchedFields((prev) => new Set(prev).add(field));

      // Validar inmediatamente para selects
      setTimeout(() => {
        validateFormField(field, value);
      }, 100);
    },
    [validateFormField]
  );

  // Manejador de archivos
  const handleFileChange = useCallback(
    (
      type: "accessDocument" | "paymentProof",
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file = e.target.files?.[0] || null;
      setFileData((prev) => ({ ...prev, [type]: file }));

      if (file) {
        validateFileField(type, file);
      }
    },
    [validateFileField]
  );

  // Verificación de email exento
  const checkEmailExemption = async (email: string) => {
    if (!email.trim()) return;

    setCheckingEmail(true);
    setEmailCheckStatus("checking");
    setEmailCheckMessage("");

    try {
      const response = await fetch("/api/check-exemption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error verificando exención");
      }

      if (result.isExempted) {
        setIsEmailExempted(true);
        setEmailCheckStatus("exempted");
        setEmailCheckMessage("✅ Email exento de pago - Registro gratuito");
        setFileData((prev) => ({ ...prev, paymentProof: undefined }));
        if (paymentProofRef.current) {
          paymentProofRef.current.value = "";
        }
      } else {
        setIsEmailExempted(false);
        setEmailCheckStatus("not-exempted");
        setEmailCheckMessage("💳 Email requiere comprobante de pago");
      }
    } catch (error: any) {
      console.error("Error checking email exemption:", error);
      setIsEmailExempted(false);
      setEmailCheckStatus("error");
      setEmailCheckMessage("⚠️ Error verificando email - Intenta nuevamente");
    } finally {
      setCheckingEmail(false);
    }
  };

  // Validación completa del formulario
  const validateAllFields = async (): Promise<boolean> => {
    let isValid = true;

    // Validar datos del formulario
    try {
      await registerSchema.validate(formData, { abortEarly: false });
      setFormErrors({});
    } catch (error: any) {
      const errors: ValidationErrors = {};
      error.inner.forEach((err: any) => {
        errors[err.path] = err.message;
      });
      setFormErrors(errors);
      isValid = false;
    }

    // Validar archivos
    try {
      await fileValidationSchema.validate(fileData, {
        abortEarly: false,
        context: { isRequired: !isEmailExempted },
      });
      setFileErrors({});
    } catch (error: any) {
      const errors: ValidationErrors = {};
      error.inner.forEach((err: any) => {
        errors[err.path] = err.message;
      });
      setFileErrors(errors);
      isValid = false;
    }

    return isValid;
  };

  // Función para subir archivos
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

  // Envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isValid = await validateAllFields();
      if (!isValid) {
        setLoading(false);
        return;
      }

      console.log("🚀 REGISTER: Iniciando proceso de registro...");

      const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      let documentUrl = null;
      let paymentProofUrl = null;

      // Subir documento ACCESS
      if (fileData.accessDocument) {
        console.log("📄 REGISTER: Subiendo documento ACCESS...");
        documentUrl = await uploadFile(
          fileData.accessDocument,
          "access_documents",
          tempUserId
        );
        console.log("✅ REGISTER: Documento ACCESS subido:", documentUrl);
      }

      // Subir comprobante de pago si no está exento
      if (fileData.paymentProof && !isEmailExempted) {
        console.log("💳 REGISTER: Subiendo comprobante de pago...");
        paymentProofUrl = await uploadFile(
          fileData.paymentProof,
          "payment_proofs",
          tempUserId
        );
        console.log(
          "✅ REGISTER: Comprobante de pago subido:",
          paymentProofUrl
        );
      }

      // Llamar a la API de registro
      console.log("🔄 REGISTER: Llamando a API register-doctor...");
      const response = await fetch("/api/register-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          cedula: formData.cedula,
          gender: formData.gender,
          licenseNumber: formData.licenseNumber,
          specialty: formData.specialty || null,
          documentUrl,
          paymentProofUrl,
          isEmailExempted,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error en el registro");
      }

      console.log("✅ REGISTER: Registro exitoso:", result);
      alert(result.message);
      router.push("/login");
    } catch (error: any) {
      console.error("💥 REGISTER: Registration error:", error);
      alert("Error en el registro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (emailCheckTimer) {
        clearTimeout(emailCheckTimer);
      }
    };
  }, [emailCheckTimer]);

  // Componente para mostrar errores
  const ErrorMessage = ({ error }: { error: string }) =>
    error ? (
      <div className="flex items-center gap-1 text-destructive text-sm mt-1">
        <AlertCircle className="h-3 w-3" />
        <span>{error}</span>
      </div>
    ) : null;

  // Mostrar loading mientras verifica acceso
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
                <Label htmlFor="fullName">
                  Nombre Completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={formErrors.fullName ? "border-destructive" : ""}
                />
                <ErrorMessage error={formErrors.fullName} />
              </div>
              <div>
                <Label htmlFor="cedula">
                  Cédula de Identidad{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cedula"
                  name="cedula"
                  type="text"
                  value={formData.cedula}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={formErrors.cedula ? "border-destructive" : ""}
                />
                <ErrorMessage error={formErrors.cedula} />
              </div>
            </div>

            <div>
              <Label htmlFor="email">
                Correo Electrónico <span className="text-destructive">*</span>
              </Label>
              <div className="space-y-2">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={
                    formErrors.email
                      ? "border-destructive"
                      : emailCheckStatus === "exempted"
                        ? "border-green-500 focus:border-green-500"
                        : emailCheckStatus === "not-exempted"
                          ? "border-blue-500 focus:border-blue-500"
                          : emailCheckStatus === "error"
                            ? "border-red-500 focus:border-red-500"
                            : ""
                  }
                />
                <ErrorMessage error={formErrors.email} />

                {/* Estado de verificación del email */}
                {emailCheckStatus === "checking" && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 animate-spin" />
                    <span>Verificando email...</span>
                  </div>
                )}

                {emailCheckMessage && emailCheckStatus !== "checking" && (
                  <div
                    className={`flex items-center space-x-2 text-sm p-2 rounded ${
                      emailCheckStatus === "exempted"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : emailCheckStatus === "not-exempted"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {emailCheckStatus === "exempted" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : emailCheckStatus === "not-exempted" ? (
                      <CreditCard className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <span>{emailCheckMessage}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">
                  Contraseña <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={formErrors.password ? "border-destructive" : ""}
                />
                <ErrorMessage error={formErrors.password} />
              </div>
              <div>
                <Label htmlFor="confirmPassword">
                  Confirmar Contraseña{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={
                    formErrors.confirmPassword ? "border-destructive" : ""
                  }
                />
                <ErrorMessage error={formErrors.confirmPassword} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gender">
                  Sexo <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleSelectChange("gender", value)}
                  disabled={loading}
                >
                  <SelectTrigger
                    className={formErrors.gender ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Seleccionar sexo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Femenino</SelectItem>
                  </SelectContent>
                </Select>
                <ErrorMessage error={formErrors.gender} />
              </div>
              <div>
                <Label htmlFor="licenseNumber">
                  Número de Matrícula{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="licenseNumber"
                  name="licenseNumber"
                  type="text"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  disabled={loading}
                  className={
                    formErrors.licenseNumber ? "border-destructive" : ""
                  }
                />
                <ErrorMessage error={formErrors.licenseNumber} />
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
                disabled={loading}
                className={formErrors.specialty ? "border-destructive" : ""}
              />
              <ErrorMessage error={formErrors.specialty} />
            </div>

            {/* Documentos Obligatorios */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Documentos Requeridos</h3>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {isEmailExempted
                    ? "Tu email está exento de pago. Solo necesitas subir tu documento ACCESS para completar el registro."
                    : "Para completar tu registro, debes subir tu documento ACCESS y comprobante de pago. Tu cuenta será activada una vez verificados los documentos."}
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="accessDocument">
                  Documento ACCESS <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="accessDocument"
                    ref={accessDocRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange("accessDocument", e)}
                    className="hidden"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => accessDocRef.current?.click()}
                    className="w-full"
                    disabled={loading}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {fileData.accessDocument
                      ? fileData.accessDocument.name
                      : "Subir Documento ACCESS"}
                  </Button>
                </div>
                <ErrorMessage error={fileErrors.accessDocument} />
              </div>

              {/* Comprobante de pago - Solo mostrar si NO está exento */}
              {!isEmailExempted && emailCheckStatus !== "checking" && (
                <div>
                  <Label htmlFor="paymentProof">
                    Comprobante de Pago{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Input
                        id="paymentProof"
                        ref={paymentProofRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange("paymentProof", e)}
                        className="hidden"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => paymentProofRef.current?.click()}
                        className="w-full"
                        disabled={loading}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {fileData.paymentProof
                          ? fileData.paymentProof.name
                          : "Subir Comprobante de Pago"}
                      </Button>
                    </div>
                    <ErrorMessage error={fileErrors.paymentProof} />

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
                          • <strong>Código QR Deuna:</strong> Disponible en la
                          app móvil
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Mensaje para usuarios exentos */}
              {isEmailExempted && (
                <div className="bg-green-50 p-3 rounded-md text-sm border border-green-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="font-medium text-green-800">
                      Registro Gratuito
                    </p>
                  </div>
                  <p className="text-green-700 mt-1">
                    Tu email está en la lista de usuarios exentos. No necesitas
                    realizar ningún pago y tu cuenta será activada
                    automáticamente.
                  </p>
                </div>
              )}
            </div>

            {/* Términos y Condiciones */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={fileData.acceptTerms}
                onCheckedChange={(checked) =>
                  setFileData((prev) => ({
                    ...prev,
                    acceptTerms: checked as boolean,
                  }))
                }
                disabled={loading}
              />
              <Label htmlFor="terms" className="text-sm">
                Acepto los{" "}
                <Link href="/terms" className="text-blue-600 hover:underline">
                  términos y condiciones
                </Link>
              </Label>
            </div>
            <ErrorMessage error={fileErrors.acceptTerms} />

            <Button type="submit" className="w-full" disabled={loading}>
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
// import { useState, useRef, useEffect } from "react";
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
// import {
//   Stethoscope,
//   CreditCard,
//   FileText,
//   Info,
//   CheckCircle,
//   Clock,
//   AlertTriangle,
// } from "lucide-react";
// import { usePublicRoute } from "@/lib/public-route-guard";

// export default function RegisterPage() {
//   const router = useRouter();
//   const { loading: routeLoading, canAccess } = usePublicRoute();
//   const [loading, setLoading] = useState(false);
//   const [checkingEmail, setCheckingEmail] = useState(false);
//   const [isEmailExempted, setIsEmailExempted] = useState(false);
//   const [emailCheckMessage, setEmailCheckMessage] = useState("");
//   const [emailCheckStatus, setEmailCheckStatus] = useState<
//     "idle" | "checking" | "exempted" | "not-exempted" | "error"
//   >("idle");

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

//   // Debounce timer para la verificación de email
//   const [emailCheckTimer, setEmailCheckTimer] = useState<NodeJS.Timeout | null>(
//     null
//   );

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;

//     setFormData({
//       ...formData,
//       [name]: value,
//     });

//     // Si es el campo email, verificar exención después de un delay
//     if (name === "email") {
//       // Limpiar timer anterior
//       if (emailCheckTimer) {
//         clearTimeout(emailCheckTimer);
//       }

//       // Resetear estados
//       setIsEmailExempted(false);
//       setEmailCheckMessage("");
//       setEmailCheckStatus("idle");

//       // Si el email tiene formato válido, verificar después de 1 segundo
//       if (value.includes("@") && value.includes(".") && value.length > 5) {
//         setEmailCheckTimer(
//           setTimeout(() => {
//             checkEmailExemption(value);
//           }, 1000)
//         );
//       }
//     }
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

//   const checkEmailExemption = async (email: string) => {
//     if (!email.trim()) return;

//     setCheckingEmail(true);
//     setEmailCheckStatus("checking");
//     setEmailCheckMessage("");

//     try {
//       const response = await fetch("/api/check-exemption", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ email: email.trim() }),
//       });

//       const result = await response.json();

//       if (!response.ok) {
//         throw new Error(result.error || "Error verificando exención");
//       }

//       if (result.isExempted) {
//         setIsEmailExempted(true);
//         setEmailCheckStatus("exempted");
//         setEmailCheckMessage("✅ Email exento de pago - Registro gratuito");
//         // Limpiar archivo de pago si estaba seleccionado
//         setPaymentProof(null);
//         if (paymentProofRef.current) {
//           paymentProofRef.current.value = "";
//         }
//       } else {
//         setIsEmailExempted(false);
//         setEmailCheckStatus("not-exempted");
//         setEmailCheckMessage("💳 Email requiere comprobante de pago");
//       }
//     } catch (error: any) {
//       console.error("Error checking email exemption:", error);
//       setIsEmailExempted(false);
//       setEmailCheckStatus("error");
//       setEmailCheckMessage("⚠️ Error verificando email - Intenta nuevamente");
//     } finally {
//       setCheckingEmail(false);
//     }
//   };

//   const isFormValid = () => {
//     const baseValidation =
//       formData.fullName.trim() &&
//       formData.cedula.trim() &&
//       formData.email.trim() &&
//       formData.password.trim() &&
//       formData.confirmPassword.trim() &&
//       formData.gender &&
//       formData.licenseNumber.trim() &&
//       accessDocument &&
//       acceptTerms &&
//       formData.password === formData.confirmPassword;

//     // Si está exento, no necesita comprobante de pago
//     if (isEmailExempted) {
//       return baseValidation;
//     }

//     // Si no está exento, necesita comprobante de pago
//     return baseValidation && paymentProof;
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

//       console.log("🚀 REGISTER: Iniciando proceso de registro...");

//       // Primero subir archivos (necesitamos un ID temporal para esto)
//       const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

//       let documentUrl = null;
//       let paymentProofUrl = null;

//       // Subir documento ACCESS (siempre requerido)
//       if (accessDocument) {
//         console.log("📄 REGISTER: Subiendo documento ACCESS...");
//         documentUrl = await uploadFile(
//           accessDocument,
//           "access_documents",
//           tempUserId
//         );
//         console.log("✅ REGISTER: Documento ACCESS subido:", documentUrl);
//       }

//       // Subir comprobante de pago (solo si no está exento)
//       if (paymentProof && !isEmailExempted) {
//         console.log("💳 REGISTER: Subiendo comprobante de pago...");
//         paymentProofUrl = await uploadFile(
//           paymentProof,
//           "payment_proofs",
//           tempUserId
//         );
//         console.log(
//           "✅ REGISTER: Comprobante de pago subido:",
//           paymentProofUrl
//         );
//       }

//       // Llamar a la API de registro que bypasea RLS
//       console.log("🔄 REGISTER: Llamando a API register-doctor...");
//       const response = await fetch("/api/register-doctor", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           email: formData.email,
//           password: formData.password,
//           fullName: formData.fullName,
//           cedula: formData.cedula,
//           gender: formData.gender,
//           licenseNumber: formData.licenseNumber,
//           specialty: formData.specialty || null,
//           documentUrl,
//           paymentProofUrl,
//           isEmailExempted,
//         }),
//       });

//       const result = await response.json();

//       if (!response.ok) {
//         throw new Error(result.error || "Error en el registro");
//       }

//       console.log("✅ REGISTER: Registro exitoso:", result);
//       alert(result.message);
//       router.push("/login");
//     } catch (error: any) {
//       console.error("💥 REGISTER: Registration error:", error);
//       alert("Error en el registro: " + error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Limpiar timer al desmontar el componente
//   useEffect(() => {
//     return () => {
//       if (emailCheckTimer) {
//         clearTimeout(emailCheckTimer);
//       }
//     };
//   }, [emailCheckTimer]);

//   // 🔒 PUBLIC ROUTE GUARD - Mostrar loading mientras se verifica acceso
//   if (routeLoading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
//         <Card className="w-full max-w-2xl">
//           <CardContent className="flex items-center justify-center py-8">
//             <div className="text-center">
//               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
//               <p className="mt-2 text-sm text-gray-600">
//                 Verificando sesión...
//               </p>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   // 🔒 PUBLIC ROUTE GUARD - Si no puede acceder (ya autenticado), no mostrar nada
//   if (!canAccess) {
//     return null;
//   }

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
//                   disabled={loading}
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
//                   disabled={loading}
//                 />
//               </div>
//             </div>

//             <div>
//               <Label htmlFor="email">Correo Electrónico *</Label>
//               <div className="space-y-2">
//                 <Input
//                   id="email"
//                   name="email"
//                   type="email"
//                   required
//                   value={formData.email}
//                   onChange={handleInputChange}
//                   disabled={loading}
//                   className={
//                     emailCheckStatus === "exempted"
//                       ? "border-green-500 focus:border-green-500"
//                       : emailCheckStatus === "not-exempted"
//                         ? "border-blue-500 focus:border-blue-500"
//                         : emailCheckStatus === "error"
//                           ? "border-red-500 focus:border-red-500"
//                           : ""
//                   }
//                 />

//                 {/* Estado de verificación del email */}
//                 {emailCheckStatus === "checking" && (
//                   <div className="flex items-center space-x-2 text-sm text-gray-600">
//                     <Clock className="h-4 w-4 animate-spin" />
//                     <span>Verificando email...</span>
//                   </div>
//                 )}

//                 {emailCheckMessage && emailCheckStatus !== "checking" && (
//                   <div
//                     className={`flex items-center space-x-2 text-sm p-2 rounded ${
//                       emailCheckStatus === "exempted"
//                         ? "bg-green-50 text-green-700 border border-green-200"
//                         : emailCheckStatus === "not-exempted"
//                           ? "bg-blue-50 text-blue-700 border border-blue-200"
//                           : "bg-red-50 text-red-700 border border-red-200"
//                     }`}
//                   >
//                     {emailCheckStatus === "exempted" ? (
//                       <CheckCircle className="h-4 w-4" />
//                     ) : emailCheckStatus === "not-exempted" ? (
//                       <CreditCard className="h-4 w-4" />
//                     ) : (
//                       <AlertTriangle className="h-4 w-4" />
//                     )}
//                     <span>{emailCheckMessage}</span>
//                   </div>
//                 )}
//               </div>
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
//                   disabled={loading}
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
//                   disabled={loading}
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
//                   disabled={loading}
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
//                   disabled={loading}
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
//                 disabled={loading}
//               />
//             </div>

//             {/* Documentos Obligatorios */}
//             <div className="space-y-4 border-t pt-4">
//               <h3 className="text-lg font-semibold">Documentos Requeridos</h3>

//               <Alert>
//                 <Info className="h-4 w-4" />
//                 <AlertDescription>
//                   {isEmailExempted
//                     ? "Tu email está exento de pago. Solo necesitas subir tu documento ACCESS para completar el registro."
//                     : "Para completar tu registro, debes subir tu documento ACCESS y comprobante de pago. Tu cuenta será activada una vez verificados los documentos."}
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
//                     disabled={loading}
//                   />
//                   <Button
//                     type="button"
//                     variant="outline"
//                     onClick={() => accessDocRef.current?.click()}
//                     className="w-full"
//                     disabled={loading}
//                   >
//                     <FileText className="h-4 w-4 mr-2" />
//                     {accessDocument
//                       ? accessDocument.name
//                       : "Subir Documento ACCESS"}
//                   </Button>
//                 </div>
//               </div>

//               {/* Comprobante de pago - Solo mostrar si NO está exento */}
//               {!isEmailExempted && emailCheckStatus !== "checking" && (
//                 <div>
//                   <Label htmlFor="paymentProof">Comprobante de Pago *</Label>
//                   <div className="space-y-2">
//                     <div className="flex items-center space-x-2">
//                       <Input
//                         id="paymentProof"
//                         ref={paymentProofRef}
//                         type="file"
//                         accept=".pdf,.jpg,.jpeg,.png"
//                         onChange={(e) => handleFileChange("payment", e)}
//                         className="hidden"
//                         disabled={loading}
//                       />
//                       <Button
//                         type="button"
//                         variant="outline"
//                         onClick={() => paymentProofRef.current?.click()}
//                         className="w-full"
//                         disabled={loading}
//                       >
//                         <CreditCard className="h-4 w-4 mr-2" />
//                         {paymentProof
//                           ? paymentProof.name
//                           : "Subir Comprobante de Pago"}
//                       </Button>
//                     </div>

//                     {/* Información de Pago */}
//                     <div className="bg-blue-50 p-3 rounded-md text-sm">
//                       <p className="font-medium mb-2">
//                         Información para el pago:
//                       </p>
//                       <ul className="space-y-1 text-gray-700">
//                         <li>
//                           • <strong>Transferencia:</strong> Cuenta 1234567890 -
//                           Banco Nacional
//                         </li>
//                         <li>
//                           • <strong>PayPal:</strong> pagos@mediapp.com
//                         </li>
//                         <li>
//                           • <strong>Código QR Deuna:</strong> Disponible en la
//                           app móvil
//                         </li>
//                       </ul>
//                     </div>
//                   </div>
//                 </div>
//               )}

//               {/* Mensaje para usuarios exentos */}
//               {isEmailExempted && (
//                 <div className="bg-green-50 p-3 rounded-md text-sm border border-green-200">
//                   <div className="flex items-center space-x-2">
//                     <CheckCircle className="h-5 w-5 text-green-600" />
//                     <p className="font-medium text-green-800">
//                       Registro Gratuito
//                     </p>
//                   </div>
//                   <p className="text-green-700 mt-1">
//                     Tu email está en la lista de usuarios exentos. No necesitas
//                     realizar ningún pago y tu cuenta será activada
//                     automáticamente.
//                   </p>
//                 </div>
//               )}
//             </div>

//             {/* Términos y Condiciones */}
//             <div className="flex items-center space-x-2">
//               <Checkbox
//                 id="terms"
//                 checked={acceptTerms}
//                 onCheckedChange={(checked) =>
//                   setAcceptTerms(checked as boolean)
//                 }
//                 disabled={loading}
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
