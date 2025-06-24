"use client";

import type React from "react";
import { useState, useCallback } from "react";
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
import { Stethoscope, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { redirectBasedOnRole } from "@/lib/auth-utils";
import { usePublicRoute } from "@/lib/public-route-guard";
import { loginSchema, type LoginFormData } from "@/lib/validation/auth-schema";

interface ValidationErrors {
  [key: string]: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { loading: routeLoading, canAccess } = usePublicRoute();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Validación individual de campos
  const validateField = useCallback(
    async (field: keyof LoginFormData, value: string) => {
      try {
        await loginSchema.validateAt(field, { ...formData, [field]: value });
        setFormErrors((prev) => ({ ...prev, [field]: "" }));
        return true;
      } catch (error: any) {
        setFormErrors((prev) => ({ ...prev, [field]: error.message }));
        return false;
      }
    },
    [formData]
  );

  // Manejador de cambios con validación en tiempo real
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const fieldName = name as keyof LoginFormData;

      setFormData((prev) => ({ ...prev, [fieldName]: value }));
      setTouchedFields((prev) => new Set(prev).add(fieldName));

      // Limpiar error general si existe
      if (error) setError(null);

      // Validar campo después de un delay
      const timeoutId = setTimeout(() => {
        validateField(fieldName, value);
      }, 300);

      return () => clearTimeout(timeoutId);
    },
    [error, validateField]
  );

  // Validación completa del formulario
  const validateForm = async (): Promise<boolean> => {
    try {
      await loginSchema.validate(formData, { abortEarly: false });
      setFormErrors({});
      return true;
    } catch (error: any) {
      const errors: ValidationErrors = {};
      error.inner.forEach((err: any) => {
        errors[err.path] = err.message;
      });
      setFormErrors(errors);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar formulario completo
      const isValid = await validateForm();
      if (!isValid) {
        setLoading(false);
        return;
      }

      console.log("🔐 LOGIN: Iniciando autenticación...");

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      if (data.user) {
        console.log("✅ LOGIN: Usuario autenticado:", data.user.id);

        // Esperar a que la sesión se establezca
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Redirigir según el rol
        console.log("🔍 LOGIN: Verificando roles y redirigiendo...");
        await redirectBasedOnRole(router);
      }
    } catch (error: any) {
      console.error("❌ LOGIN ERROR:", error);
      setError(error.message);
      setLoading(false);
    }
  };

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
        <Card className="w-full max-w-md">
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

  // Si no puede acceder (ya autenticado), no mostrar nada
  if (!canAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Stethoscope className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>Accede a tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">
                Correo Electrónico <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="tu-email@ejemplo.com"
                disabled={loading}
                className={formErrors.email ? "border-destructive" : ""}
              />
              <ErrorMessage error={formErrors.email} />
            </div>

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
                placeholder="Tu contraseña"
                disabled={loading}
                className={formErrors.password ? "border-destructive" : ""}
              />
              <ErrorMessage error={formErrors.password} />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <strong>Error:</strong> {error}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:underline block"
            >
              ¿Olvidaste tu contraseña?
            </Link>
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="text-blue-600 hover:underline">
                Registrarse
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
