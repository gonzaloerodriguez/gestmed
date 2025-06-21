"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Palette, Check } from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import type { Theme } from "@/lib/supabase/types/theme";

const themes: Theme[] = [
  {
    id: "default",
    name: "Clásico",
    description: "Tema azul clásico",
    colors: {
      primary: "#3b82f6",
      secondary: "#64748b",
      accent: "#06b6d4",
      background: "#f8fafc",
    },
  },
  {
    id: "dark",
    name: "Oscuro",
    description: "Tema oscuro elegante",
    colors: {
      primary: "#6366f1",
      secondary: "#374151",
      accent: "#10b981",
      background: "#111827",
    },
  },
  {
    id: "green",
    name: "Verde Médico",
    description: "Verde profesional",
    colors: {
      primary: "#059669",
      secondary: "#6b7280",
      accent: "#0891b2",
      background: "#f0fdf4",
    },
  },
  {
    id: "purple",
    name: "Púrpura",
    description: "Púrpura moderno",
    colors: {
      primary: "#7c3aed",
      secondary: "#6b7280",
      accent: "#ec4899",
      background: "#faf5ff",
    },
  },
];

type UserType = "doctor" | "admin";

interface ConfigType {
  table: string;
  field: string;
  idField: string;
  localStorageKey: string;
}

interface UnifiedThemeSelectorProps {
  userId: string;
  userType: UserType;
  currentTheme?: string;
  onThemeChange?: (theme: string) => void;
}

export function UnifiedThemeSelector({
  userId,
  userType,
  currentTheme = "default",
  onThemeChange,
}: UnifiedThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Configuración según el tipo de usuario
  const config = {
    doctor: {
      table: "doctors",
      field: "preferred_theme",
      idField: "id",
      localStorageKey: "preferred-theme",
    },
    admin: {
      table: "admin_preferences",
      field: "preferred_theme",
      idField: "admin_id",
      localStorageKey: "admin-preferred-theme",
    },
  } as const;

  const currentConfig: ConfigType = config[userType];

  useEffect(() => {
    setMounted(true);
    loadAndApplyTheme();
  }, [userId, userType]);

  const loadAndApplyTheme = async () => {
    try {
      console.log(`🎨 ${userType.toUpperCase()}: Inicializando tema...`);

      // 1. Primero intentar desde localStorage
      const localTheme = localStorage.getItem(currentConfig.localStorageKey);
      if (localTheme) {
        console.log(
          `🎨 ${userType.toUpperCase()}: Tema encontrado en localStorage:`,
          localTheme
        );
        setSelectedTheme(localTheme);
        applyTheme(localTheme);
        return;
      }

      // 2. Cargar desde base de datos
      const { data, error } = await supabase
        .from(currentConfig.table)
        .select(currentConfig.field)
        .eq(currentConfig.idField, userId)
        .single();

      if (data && typeof data === "object" && currentConfig.field in data) {
        const dbTheme = (data as Record<string, string | null>)[
          currentConfig.field
        ];
        setSelectedTheme(dbTheme || "default");
        applyTheme(dbTheme || "default");
        localStorage.setItem(
          currentConfig.localStorageKey,
          dbTheme || "default"
        );
      } else {
        // fallback
        const fallback = currentTheme || "default";
        setSelectedTheme(fallback);
        applyTheme(fallback);
        localStorage.setItem(currentConfig.localStorageKey, fallback);
      }
    } catch (error) {
      console.error(
        `🎨 ${userType.toUpperCase()}: Error inicializando tema:`,
        error
      );
      const fallback = currentTheme || "default";
      setSelectedTheme(fallback);
      applyTheme(fallback);
    }
  };

  const applyTheme = (themeId: string) => {
    console.log(`🎨 ${userType.toUpperCase()}: Aplicando tema:`, themeId);

    // Remover todas las clases de tema existentes
    document.body.className = document.body.className
      .replace(/theme-\w+/g, "")
      .trim();

    // Agregar la nueva clase de tema
    document.body.classList.add(`theme-${themeId}`);

    // También aplicar al documentElement para mayor compatibilidad
    document.documentElement.setAttribute("data-theme", themeId);
  };

  const handleThemeChange = async (themeId: string) => {
    setSelectedTheme(themeId);
    setSaving(true);

    try {
      console.log(`🎨 ${userType.toUpperCase()}: Cambiando tema a:`, themeId);

      // Aplicar tema inmediatamente
      applyTheme(themeId);

      // Guardar en base de datos según el tipo de usuario
      if (userType === "doctor") {
        await saveDoctorTheme(themeId);
      } else {
        await saveAdminTheme(themeId);
      }

      // Guardar en localStorage
      localStorage.setItem(currentConfig.localStorageKey, themeId);

      console.log(
        `🎨 ${userType.toUpperCase()}: Tema guardado exitosamente:`,
        themeId
      );

      // Notificar al componente padre si hay callback
      if (onThemeChange) {
        onThemeChange(themeId);
      }
    } catch (error: any) {
      console.error(
        `🎨 ${userType.toUpperCase()}: Error guardando tema:`,
        error.message
      );
      // Revertir cambio en caso de error
      setSelectedTheme(currentTheme);
      applyTheme(currentTheme);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const saveDoctorTheme = async (themeId: string) => {
    const { error } = await supabase
      .from("doctors")
      .update({ preferred_theme: themeId })
      .eq("id", userId);

    if (error) throw error;
  };

  const saveAdminTheme = async (themeId: string) => {
    // Verificar si ya existen preferencias
    const { data: existingPreferences } = await supabase
      .from("admin_preferences")
      .select("id")
      .eq("admin_id", userId)
      .single();

    if (existingPreferences) {
      // Actualizar preferencias existentes
      const { error } = await supabase
        .from("admin_preferences")
        .update({
          preferred_theme: themeId,
          updated_at: new Date().toISOString(),
        })
        .eq("admin_id", userId);

      if (error) throw error;
    } else {
      // Crear nuevas preferencias
      const { error } = await supabase.from("admin_preferences").insert({
        admin_id: userId,
        preferred_theme: themeId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
    }
  };

  // No renderizar hasta que esté montado
  if (!mounted) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Palette className="h-5 w-5 mr-2" />
          Tema de la Aplicación
        </CardTitle>
        <CardDescription>
          {userType === "admin"
            ? "Personaliza la apariencia de tu panel de administrador"
            : "Personaliza la apariencia de tu interfaz"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Label>Selecciona un tema:</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className={`relative border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedTheme === theme.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => handleThemeChange(theme.id)}
              >
                {selectedTheme === theme.id && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium text-foreground">
                      {theme.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {theme.description}
                    </p>
                  </div>

                  {/* Preview de colores */}
                  <div className="flex space-x-2">
                    <div
                      className="w-6 h-6 rounded-full border border-border shadow-sm"
                      style={{ backgroundColor: theme.colors.primary }}
                      title="Color primario"
                    />
                    <div
                      className="w-6 h-6 rounded-full border border-border shadow-sm"
                      style={{ backgroundColor: theme.colors.secondary }}
                      title="Color secundario"
                    />
                    <div
                      className="w-6 h-6 rounded-full border border-border shadow-sm"
                      style={{ backgroundColor: theme.colors.accent }}
                      title="Color de acento"
                    />
                    <div
                      className="w-6 h-6 rounded-full border border-border shadow-sm"
                      style={{ backgroundColor: theme.colors.background }}
                      title="Color de fondo"
                    />
                  </div>

                  {/* Preview del tema aplicado */}
                  <div className="mt-3 p-3 rounded border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-card-foreground">
                        Vista previa
                      </span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: theme.colors.primary }}
                      ></div>
                    </div>
                    <div className="space-y-1">
                      <div
                        className="h-2 rounded"
                        style={{
                          backgroundColor: theme.colors.primary,
                          opacity: 0.8,
                        }}
                      ></div>
                      <div
                        className="h-2 rounded"
                        style={{
                          backgroundColor: theme.colors.accent,
                          opacity: 0.6,
                        }}
                      ></div>
                      <div
                        className="h-2 rounded w-3/4"
                        style={{
                          backgroundColor: theme.colors.secondary,
                          opacity: 0.4,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {saving && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Guardando tema...</span>
            </div>
          )}

          {/* Información adicional */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium text-foreground mb-2">
              Información sobre temas
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Los cambios se aplican inmediatamente</li>
              <li>• Tu preferencia se guarda automáticamente</li>
              <li>• Los temas afectan toda la interfaz de la aplicación</li>
              <li>• Tema actual: {selectedTheme}</li>
              <li>• Usuario: {userType}</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
