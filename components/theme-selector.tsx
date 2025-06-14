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
import { supabase } from "@/lib/supabase";

interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
}

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

interface ThemeSelectorProps {
  doctorId: string;
  currentTheme?: string;
}

export function ThemeSelector({
  doctorId,
  currentTheme = "default",
}: ThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Aplicar tema al cargar el componente
    applyTheme(selectedTheme);
  }, [selectedTheme]);

  useEffect(() => {
    // Aplicar tema inicial al montar el componente
    applyTheme(currentTheme);
  }, [currentTheme]);

  const applyTheme = (themeId: string) => {
    // Remover todas las clases de tema existentes
    document.body.className = document.body.className
      .replace(/theme-\w+/g, "")
      .trim();

    // Agregar la nueva clase de tema
    document.body.classList.add(`theme-${themeId}`);

    // Guardar en localStorage para persistencia
    localStorage.setItem("preferred-theme", themeId);

    console.log(`Tema aplicado: theme-${themeId}`);
  };

  const handleThemeChange = async (themeId: string) => {
    setSelectedTheme(themeId);
    setSaving(true);

    try {
      // Aplicar tema inmediatamente
      applyTheme(themeId);

      // Guardar en base de datos
      const { error } = await supabase
        .from("doctors")
        .update({ preferred_theme: themeId })
        .eq("id", doctorId);

      if (error) throw error;

      console.log("Tema guardado en base de datos:", themeId);
    } catch (error: any) {
      console.error("Error saving theme:", error.message);
      // Revertir cambio en caso de error
      setSelectedTheme(currentTheme);
      applyTheme(currentTheme);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Palette className="h-5 w-5 mr-2" />
          Tema de la Aplicación
        </CardTitle>
        <CardDescription>
          Personaliza la apariencia de tu interfaz
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
              <li>• Puedes cambiar el tema en cualquier momento</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
