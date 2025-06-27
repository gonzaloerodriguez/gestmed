"use client";

import { useState } from "react";
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
import { Save, Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { useToastEnhanced } from "@/hooks/use-toast-enhanced";

interface ValidationErrors {
  [key: string]: string;
}

export function SecurityTab() {
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const { showSuccess, showError } = useToastEnhanced();

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case "newPassword":
        if (!value) return "La nueva contraseña es requerida";
        if (value.length < 6)
          return "La contraseña debe tener al menos 6 caracteres";
        if (!/(?=.*[a-z])/.test(value))
          return "Debe contener al menos una letra minúscula";
        if (!/(?=.*[A-Z])/.test(value))
          return "Debe contener al menos una letra mayúscula";
        if (!/(?=.*\d)/.test(value)) return "Debe contener al menos un número";
        return "";

      case "confirmPassword":
        if (!value) return "Confirma tu nueva contraseña";
        if (value !== passwordData.newPassword)
          return "Las contraseñas no coinciden";
        return "";

      default:
        return "";
    }
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));

    // Validar campo en tiempo real
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error }));

    // Si es confirmPassword, también validar que coincida con newPassword
    if (field === "newPassword" && passwordData.confirmPassword) {
      const confirmError =
        passwordData.confirmPassword !== value
          ? "Las contraseñas no coinciden"
          : "";
      setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const validateAllFields = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    // Validar nueva contraseña
    const newPasswordError = validateField(
      "newPassword",
      passwordData.newPassword
    );
    if (newPasswordError) {
      newErrors.newPassword = newPasswordError;
      isValid = false;
    }

    // Validar confirmación
    const confirmError = validateField(
      "confirmPassword",
      passwordData.confirmPassword
    );
    if (confirmError) {
      newErrors.confirmPassword = confirmError;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const changePassword = async () => {
    if (!validateAllFields()) {
      showError(
        "Datos incompletos",
        "Por favor corrige los errores antes de continuar"
      );
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      showSuccess(
        "Contraseña actualizada",
        "Tu contraseña ha sido cambiada correctamente"
      );
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setErrors({});
    } catch (error: any) {
      showError(
        "Error al cambiar contraseña",
        error.message || "Ha ocurrido un error inesperado"
      );
    } finally {
      setSaving(false);
    }
  };

  const ErrorMessage = ({ error }: { error: string }) =>
    error ? (
      <div className="flex items-center gap-1 text-destructive text-sm mt-1">
        <AlertCircle className="h-3 w-3" />
        <span>{error}</span>
      </div>
    ) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar Contraseña</CardTitle>
        <CardDescription>
          Actualiza tu contraseña para mantener tu cuenta segura
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="current_password">Contraseña Actual</Label>
          <div className="relative">
            <Input
              id="current_password"
              type={showCurrentPassword ? "text" : "password"}
              value={passwordData.currentPassword}
              onChange={(e) =>
                handlePasswordChange("currentPassword", e.target.value)
              }
              placeholder="Ingresa tu contraseña actual"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
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
          <Label htmlFor="new_password">
            Nueva Contraseña <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="new_password"
              type={showNewPassword ? "text" : "password"}
              value={passwordData.newPassword}
              onChange={(e) =>
                handlePasswordChange("newPassword", e.target.value)
              }
              className={errors.newPassword ? "border-destructive" : ""}
              placeholder="Ingresa tu nueva contraseña"
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
          <ErrorMessage error={errors.newPassword} />
          <div className="text-xs text-gray-500 mt-1">
            La contraseña debe tener al menos 6 caracteres, incluyendo
            mayúsculas, minúsculas y números
          </div>
        </div>

        <div>
          <Label htmlFor="confirm_password">
            Confirmar Nueva Contraseña{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="confirm_password"
            type="password"
            value={passwordData.confirmPassword}
            onChange={(e) =>
              handlePasswordChange("confirmPassword", e.target.value)
            }
            className={errors.confirmPassword ? "border-destructive" : ""}
            placeholder="Confirma tu nueva contraseña"
          />
          <ErrorMessage error={errors.confirmPassword} />
        </div>

        <div className="flex justify-end">
          <Button onClick={changePassword} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Cambiando..." : "Cambiar Contraseña"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
