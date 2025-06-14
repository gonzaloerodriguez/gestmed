"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ThemeInitializerProps {
  doctorId?: string;
}

export function ThemeInitializer({ doctorId }: ThemeInitializerProps) {
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        // Primero intentar cargar desde localStorage
        const savedTheme = localStorage.getItem("preferred-theme");

        if (savedTheme) {
          applyTheme(savedTheme);
          return;
        }

        // Si hay doctorId, cargar desde base de datos
        if (doctorId) {
          const { data: doctor, error } = await supabase
            .from("doctors")
            .select("preferred_theme")
            .eq("id", doctorId)
            .single();

          if (!error && doctor?.preferred_theme) {
            applyTheme(doctor.preferred_theme);
            localStorage.setItem("preferred-theme", doctor.preferred_theme);
          } else {
            // Aplicar tema por defecto
            applyTheme("default");
          }
        } else {
          // Aplicar tema por defecto si no hay usuario
          applyTheme("default");
        }
      } catch (error) {
        console.error("Error initializing theme:", error);
        applyTheme("default");
      }
    };

    initializeTheme();
  }, [doctorId]);

  const applyTheme = (themeId: string) => {
    // Remover todas las clases de tema existentes
    document.body.className = document.body.className
      .replace(/theme-\w+/g, "")
      .trim();

    // Agregar la nueva clase de tema
    document.body.classList.add(`theme-${themeId}`);
  };

  return null; // Este componente no renderiza nada
}
