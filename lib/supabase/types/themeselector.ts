export interface ThemeSelectorProps {
  doctorId: string;
  currentTheme?: string;
  onThemeChange?: (theme: string) => void;
}
