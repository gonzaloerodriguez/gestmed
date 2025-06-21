"use client";

import type { ThemeSelectorProps } from "@/lib/supabase/types/themeselector";
import { UnifiedThemeSelector } from "./unified-theme-selector";

export function ThemeSelector({
  doctorId,
  currentTheme,
  onThemeChange,
}: ThemeSelectorProps) {
  return (
    <UnifiedThemeSelector
      userId={doctorId}
      userType="doctor"
      currentTheme={currentTheme}
      onThemeChange={onThemeChange}
    />
  );
}
