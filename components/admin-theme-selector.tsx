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

interface AdminThemeSelectorProps {
  adminId: string;
  currentTheme?: string;
  onThemeChange?: (theme: string) => void;
}

export function AdminThemeSelector({
  adminId,
  currentTheme = "default",
  onThemeChange,
}: AdminThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Asegurar que el componente esté montado antes de renderizar
  useEffect(() => {
    setMounted(true);
    loadAndApplyTheme();
  }, [adminId]);

  const loadAndApplyTheme = async () => {
    try {
      // 1. Primero intentar desde localStorage
      const localTheme = localStorage.getItem("admin-preferred-theme");
      if (localTheme) {
        setSelectedTheme(localTheme);
        applyTheme(localTheme);
        return;
      }

      // 2. Cargar desde base de datos
      const { data, error } = await supabase
        .from("admin_preferences")
        .select("preferred_theme")
        .eq("admin_id", adminId)
        .single();

      if (!error && data?.preferred_theme) {
        setSelectedTheme(data.preferred_theme);
        applyTheme(data.preferred_theme);
        localStorage.setItem("admin-preferred-theme", data.preferred_theme);
      } else {
        // Aplicar tema por defecto
        const fallback = currentTheme || "default";
        setSelectedTheme(fallback);
        applyTheme(fallback);
        localStorage.setItem("admin-preferred-theme", fallback);
      }
    } catch (error) {
      console.error("Error loading theme:", error);
      const fallback = currentTheme || "default";
      setSelectedTheme(fallback);
      applyTheme(fallback);
    }
  };

  const applyTheme = (themeId: string) => {
    // Remover todas las clases de tema existentes
    document.body.className = document.body.className
      .replace(/theme-\w+/g, "")
      .trim();

    // Agregar la nueva clase de tema
    document.body.classList.add(`theme-${themeId}`);

    // También aplicar al documentElement para mayor compatibilidad
    document.documentElement.setAttribute("data-theme", themeId);

    console.log(`Tema aplicado: theme-${themeId}`);
  };

  const handleThemeChange = async (themeId: string) => {
    setSelectedTheme(themeId);
    setSaving(true);

    try {
      // Aplicar tema inmediatamente
      applyTheme(themeId);

      // Verificar si ya existen preferencias
      const { data: existingPreferences } = await supabase
        .from("admin_preferences")
        .select("id")
        .eq("admin_id", adminId)
        .single();

      if (existingPreferences) {
        // Actualizar preferencias existentes
        const { error } = await supabase
          .from("admin_preferences")
          .update({
            preferred_theme: themeId,
            updated_at: new Date().toISOString(),
          })
          .eq("admin_id", adminId);

        if (error) throw error;
      } else {
        // Crear nuevas preferencias
        const { error } = await supabase.from("admin_preferences").insert({
          admin_id: adminId,
          preferred_theme: themeId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
      }

      // Guardar en localStorage
      localStorage.setItem("admin-preferred-theme", themeId);

      console.log("Tema guardado en base de datos:", themeId);

      // Notificar al componente padre si hay callback
      if (onThemeChange) {
        onThemeChange(themeId);
      }

      alert("Tema guardado correctamente");
    } catch (error: any) {
      console.error("Error saving theme:", error.message);
      alert("Error al guardar el tema: " + error.message);
      // Revertir cambio en caso de error
      setSelectedTheme(currentTheme);
      applyTheme(currentTheme);
    } finally {
      setSaving(false);
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
          Personaliza la apariencia de tu panel de administrador
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
                    {Object.values(theme.colors).map((color, index) => (
                      <div
                        key={index}
                        className="w-6 h-6 rounded-full border border-border shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
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

          {/* Información sobre almacenamiento */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium text-foreground mb-2">
              Información sobre temas
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Los cambios se aplican inmediatamente</li>
              <li>
                • Tu preferencia se guarda en localStorage y base de datos
              </li>
              <li>• Los temas afectan toda la interfaz de la aplicación</li>
              <li>• Tema actual: {selectedTheme}</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// "use client";

// import { useState, useEffect } from "react";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Label } from "@/components/ui/label";
// import { Palette, Check } from "lucide-react";
// import { supabase } from "@/lib/supabase";

// interface Theme {
//   id: string;
//   name: string;
//   description: string;
//   colors: {
//     primary: string;
//     secondary: string;
//     accent: string;
//     background: string;
//   };
// }

// const themes: Theme[] = [
//   {
//     id: "default",
//     name: "Clásico",
//     description: "Tema azul clásico",
//     colors: {
//       primary: "#3b82f6",
//       secondary: "#64748b",
//       accent: "#06b6d4",
//       background: "#f8fafc",
//     },
//   },
//   {
//     id: "dark",
//     name: "Oscuro",
//     description: "Tema oscuro elegante",
//     colors: {
//       primary: "#6366f1",
//       secondary: "#374151",
//       accent: "#10b981",
//       background: "#111827",
//     },
//   },
//   {
//     id: "green",
//     name: "Verde Médico",
//     description: "Verde profesional",
//     colors: {
//       primary: "#059669",
//       secondary: "#6b7280",
//       accent: "#0891b2",
//       background: "#f0fdf4",
//     },
//   },
//   {
//     id: "purple",
//     name: "Púrpura",
//     description: "Púrpura moderno",
//     colors: {
//       primary: "#7c3aed",
//       secondary: "#6b7280",
//       accent: "#ec4899",
//       background: "#faf5ff",
//     },
//   },
// ];

// interface AdminThemeSelectorProps {
//   adminId: string;
//   currentTheme?: string;
//   onThemeChange?: (theme: string) => void;
// }

// export function AdminThemeSelector({
//   adminId,
//   currentTheme = "default",
//   onThemeChange,
// }: AdminThemeSelectorProps) {
//   const [selectedTheme, setSelectedTheme] = useState(currentTheme);
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     loadSavedTheme();
//   }, [adminId]);

//   const loadSavedTheme = async () => {
//     try {
//       const { data, error } = await supabase
//         .from("admin_preferences")
//         .select("preferred_theme")
//         .eq("admin_id", adminId)
//         .single();

//       const themeId = data?.preferred_theme || currentTheme || "default";
//       setSelectedTheme(themeId);
//       applyTheme(themeId);
//     } catch (error) {
//       console.error("Error loading theme from DB:", error);
//       const fallback = currentTheme || "default";
//       setSelectedTheme(fallback);
//       applyTheme(fallback);
//     }
//   };

//   const applyTheme = (themeId: string) => {
//     // Remover todas las clases de tema existentes
//     document.body.className = document.body.className
//       .replace(/theme-\w+/g, "")
//       .trim();

//     // Agregar la nueva clase de tema
//     document.body.classList.add(`theme-${themeId}`);

//     // Guardar en localStorage para persistencia
//     localStorage.setItem("admin-preferred-theme", themeId);
//   };

//   const handleThemeChange = async (themeId: string) => {
//     setSelectedTheme(themeId);
//     setSaving(true);

//     try {
//       applyTheme(themeId);

//       // Guardar en base de datos
//       const { error } = await supabase
//         .from("admin_preferences")
//         .upsert({
//           id: adminId,
//           preferred_theme: themeId,
//           updated_at: new Date().toISOString(),
//         })
//         .eq("admin_id", adminId);

//       if (error) {
//         console.warn("Error saving theme to database:", error.message);
//       } else {
//         console.log(`Tema guardado en BD: ${themeId}`);
//         localStorage.setItem("admin-preferred-theme", themeId);
//       }

//       // Notificar al componente padre si hay callback
//       if (onThemeChange) {
//         onThemeChange(themeId);
//       }
//     } catch (error: any) {
//       console.error("Error saving theme:", error.message);
//       // Revertir cambio en caso de error
//       setSelectedTheme(currentTheme);
//       applyTheme(currentTheme);
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className="flex items-center">
//           <Palette className="h-5 w-5 mr-2" />
//           Tema de la Aplicación
//         </CardTitle>
//         <CardDescription>
//           Personaliza la apariencia de tu panel de administrador
//         </CardDescription>
//       </CardHeader>
//       <CardContent>
//         <div className="space-y-4">
//           <Label>Selecciona un tema:</Label>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             {themes.map((theme) => (
//               <div
//                 key={theme.id}
//                 className={`relative border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
//                   selectedTheme === theme.id
//                     ? "border-primary bg-primary/5 ring-2 ring-primary/20"
//                     : "border-border hover:border-primary/50"
//                 }`}
//                 onClick={() => handleThemeChange(theme.id)}
//               >
//                 {selectedTheme === theme.id && (
//                   <div className="absolute top-2 right-2">
//                     <Check className="h-5 w-5 text-primary" />
//                   </div>
//                 )}

//                 <div className="space-y-3">
//                   <div>
//                     <h3 className="font-medium text-foreground">
//                       {theme.name}
//                     </h3>
//                     <p className="text-sm text-muted-foreground">
//                       {theme.description}
//                     </p>
//                   </div>

//                   <div className="flex space-x-2">
//                     {Object.values(theme.colors).map((color, index) => (
//                       <div
//                         key={index}
//                         className="w-6 h-6 rounded-full border border-border shadow-sm"
//                         style={{ backgroundColor: color }}
//                       />
//                     ))}
//                   </div>

//                   <div className="mt-3 p-3 rounded border bg-card">
//                     <div className="flex items-center justify-between mb-2">
//                       <span className="text-xs font-medium text-card-foreground">
//                         Vista previa
//                       </span>
//                       <div
//                         className="w-3 h-3 rounded-full"
//                         style={{ backgroundColor: theme.colors.primary }}
//                       ></div>
//                     </div>
//                     <div className="space-y-1">
//                       <div
//                         className="h-2 rounded"
//                         style={{
//                           backgroundColor: theme.colors.primary,
//                           opacity: 0.8,
//                         }}
//                       ></div>
//                       <div
//                         className="h-2 rounded"
//                         style={{
//                           backgroundColor: theme.colors.accent,
//                           opacity: 0.6,
//                         }}
//                       ></div>
//                       <div
//                         className="h-2 rounded w-3/4"
//                         style={{
//                           backgroundColor: theme.colors.secondary,
//                           opacity: 0.4,
//                         }}
//                       ></div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {saving && (
//             <div className="flex items-center space-x-2 text-sm text-muted-foreground">
//               <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
//               <span>Guardando tema...</span>
//             </div>
//           )}

//           {/* Información sobre almacenamiento */}
//           <div className="mt-6 p-4 bg-muted/50 rounded-lg">
//             <h4 className="text-sm font-medium text-foreground mb-2">
//               Información sobre temas
//             </h4>
//             <ul className="text-xs text-muted-foreground space-y-1">
//               <li>• Los cambios se aplican inmediatamente</li>
//               <li>
//                 • Tu preferencia se guarda en localStorage y base de datos
//               </li>
//               <li>• Los temas afectan toda la interfaz de la aplicación</li>
//               <li>• Tema actual: {selectedTheme}</li>
//             </ul>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }
