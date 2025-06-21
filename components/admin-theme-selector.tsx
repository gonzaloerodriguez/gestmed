"use client";

import type { AdminThemeSelectorProps } from "@/lib/supabase/types/admintheme";
import { UnifiedThemeSelector } from "./unified-theme-selector";

export function AdminThemeSelector({
  adminId,
  currentTheme,
  onThemeChange,
}: AdminThemeSelectorProps) {
  return (
    <UnifiedThemeSelector
      userId={adminId}
      userType="admin"
      currentTheme={currentTheme}
      onThemeChange={onThemeChange}
    />
  );
}
