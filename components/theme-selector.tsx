"use client";

import { UnifiedThemeSelector } from "./unified-theme-selector";

interface ThemeSelectorProps {
  doctorId: string;
  currentTheme?: string;
  onThemeChange?: (theme: string) => void;
}

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
