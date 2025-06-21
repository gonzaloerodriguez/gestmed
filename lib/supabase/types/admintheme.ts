export interface AdminThemeSelectorProps {
  adminId: string;
  currentTheme?: string;
  onThemeChange?: (theme: string) => void;
}
