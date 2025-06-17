"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ThemeInitializerProps {
  userId?: string;
  userType?: "doctor" | "admin";
}

export function ThemeInitializer({
  userId,
  userType = "doctor",
}: ThemeInitializerProps) {
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // Primero intentar cargar desde localStorage
        const storageKey =
          userType === "admin" ? "admin-preferred-theme" : "preferred-theme";
        const savedTheme = localStorage.getItem(storageKey);

        if (savedTheme) {
          applyTheme(savedTheme);
          return;
        }

        // Si hay userId, cargar desde base de datos
        if (userId) {
          let themeData = null;

          if (userType === "admin") {
            const { data } = await supabase
              .from("admin_preferences")
              .select("preferred_theme")
              .eq("admin_id", userId)
              .single();
            themeData = data;
          } else {
            const { data } = await supabase
              .from("doctors")
              .select("preferred_theme")
              .eq("id", userId)
              .single();
            themeData = data;
          }

          if (themeData?.preferred_theme) {
            applyTheme(themeData.preferred_theme);
            localStorage.setItem(storageKey, themeData.preferred_theme);
          } else {
            applyTheme("default");
          }
        } else {
          applyTheme("default");
        }
      } catch (error) {
        console.error("Error initializing theme:", error);
        applyTheme("default");
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
    };

    initializeTheme();
  }, [userId, userType]);

  // Este componente no renderiza nada visible
  return null;
}

// "use client"

// import { useEffect } from "react"
// import { supabase } from "@/lib/supabase";

// interface ThemeInitializerProps {
//   userId?: string
//   userType?: "doctor" | "admin"
// }

// export function ThemeInitializer({ userId, userType = "doctor" }: ThemeInitializerProps) {
//   useEffect(() => {
//     const initializeTheme = async () => {
//       try {
//         // Primero intentar cargar desde localStorage
//         const storageKey = userType === "admin" ? "admin-preferred-theme" : "preferred-theme"
//         const savedTheme = localStorage.getItem(storageKey)

//         if (savedTheme) {
//           applyTheme(savedTheme)
//           return
//         }

//         // Si hay userId, cargar desde base de datos
//         if (userId) {
//           let themeData = null

//           if (userType === "admin") {
//             const { data } = await supabase
//               .from("admin_preferences")
//               .select("preferred_theme")
//               .eq("admin_id", userId)
//               .single()
//             themeData = data
//           } else {
//             const { data } = await supabase.from("doctors").select("preferred_theme").eq("id", userId).single()
//             themeData = data
//           }

//           if (themeData?.preferred_theme) {
//             applyTheme(themeData.preferred_theme)
//             localStorage.setItem(storageKey, themeData.preferred_theme)
//           } else {
//             applyTheme("default")
//           }
//         } else {
//           applyTheme("default")
//         }
//       } catch (error) {
//         console.error("Error initializing theme:", error)
//         applyTheme("default")
//       }
//     }

//     const applyTheme = (theme: string) => {
//       document.documentElement.className = theme
//     }

//     initializeTheme()
//   }, [userId, userType])

//   // Este componente no renderiza nada visible
//   return null
// }

// "use client";

// import { useEffect } from "react";
// import { supabase } from "@/lib/supabase";

// interface ThemeInitializerProps {
//   doctorId?: string;
// }

// export function ThemeInitializer({ doctorId }: ThemeInitializerProps) {
//   useEffect(() => {
//     const initializeTheme = async () => {
//       try {
//         // Primero intentar cargar desde localStorage
//         const savedTheme = localStorage.getItem("preferred-theme");

//         if (savedTheme) {
//           applyTheme(savedTheme);
//           return;
//         }

//         // Si hay doctorId, cargar desde base de datos
//         if (doctorId) {
//           const { data: doctor, error } = await supabase
//             .from("doctors")
//             .select("preferred_theme")
//             .eq("id", doctorId)
//             .single();

//           if (!error && doctor?.preferred_theme) {
//             applyTheme(doctor.preferred_theme);
//             localStorage.setItem("preferred-theme", doctor.preferred_theme);
//           } else {
//             // Aplicar tema por defecto
//             applyTheme("default");
//           }
//         } else {
//           // Aplicar tema por defecto si no hay usuario
//           applyTheme("default");
//         }
//       } catch (error) {
//         console.error("Error initializing theme:", error);
//         applyTheme("default");
//       }
//     };

//     initializeTheme();
//   }, [doctorId]);

//   const applyTheme = (themeId: string) => {
//     // Remover todas las clases de tema existentes
//     document.body.className = document.body.className
//       .replace(/theme-\w+/g, "")
//       .trim();

//     // Agregar la nueva clase de tema
//     document.body.classList.add(`theme-${themeId}`);
//   };

//   return null; // Este componente no renderiza nada
// }
