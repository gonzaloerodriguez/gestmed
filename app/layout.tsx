import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema de Gestión Médica",
  description:
    "Web App para la gestión de pacientes, historias clínicas y recetas médicas",
  generator: "GestMed",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}

// import type React from "react";
// import type { Metadata } from "next";
// import { Inter } from "next/font/google";
// import "./globals.css";
// import { ThemeProvider } from "@/components/theme-provider";

// const inter = Inter({ subsets: ["latin"] });

// export const metadata: Metadata = {
//   title: "Sistema de Gestión Médica",
//   description:
//     "Web App para la gestión de pacientes, historias clínicas y recetas médicas",
//   generator: "GestMed",
// };

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html lang="es" suppressHydrationWarning>
//       <body className={inter.className}>
//         <ThemeProvider
//           attribute="class"
//           defaultTheme="system"
//           enableSystem
//           disableTransitionOnChange={false}
//         >
//           {/* Removí el div con bg-gray-50 para que los temas controlen el fondo */}
//           {children}
//         </ThemeProvider>
//       </body>
//     </html>
//   );
// }

// import type React from "react";
// import type { Metadata } from "next";
// import { Inter } from "next/font/google";
// import "./globals.css";

// const inter = Inter({ subsets: ["latin"] });

// export const metadata: Metadata = {
//   title: "Sistema de Gestión Médica",
//   description:
//     "Web App para la gestión de pacientes, historias clínicas y recetas médicas",
//   generator: "GestMed",
// };

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html lang="es">
//       <body className={inter.className}>
//         <div className="min-h-screen bg-gray-50">{children}</div>
//       </body>
//     </html>
//   );
// }
