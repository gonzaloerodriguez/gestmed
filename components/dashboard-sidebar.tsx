"use client";

// Assuming DashboardSidebarProps is defined in a types file
import type { Doctor } from "@/lib/supabase";
import { supabase } from "@/lib/supabase"; // Assuming supabase is initialized in a lib file
import {
  Home,
  Users,
  Stethoscope,
  FileText,
  User,
  Plus,
  X,
  LogOut,
  Menu,
} from "lucide-react"; // Assuming these icons are from lucide-react
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Assuming Button component is defined in a ui folder

interface DashboardSidebarProps {
  doctor: Doctor;
  children: React.ReactNode;
}

export function DashboardSidebar({ doctor, children }: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      current: pathname === "/dashboard",
    },
    {
      name: "Pacientes",
      href: "/dashboard/patients",
      icon: Users,
      current: pathname.startsWith("/dashboard/patients"),
    },
    {
      name: "Consultas",
      href: "/dashboard/consultations",
      icon: Stethoscope,
      current: pathname.startsWith("/dashboard/consultations"),
    },
    {
      name: "Recetas",
      href: "/dashboard/prescriptions",
      icon: FileText,
      current: pathname.startsWith("/dashboard/prescriptions"),
    },
    {
      name: "Mi Perfil",
      href: "/dashboard/profile",
      icon: User,
      current: pathname.startsWith("/dashboard/profile"),
    },
  ];

  const quickActions = [
    {
      name: "Nuevo Paciente",
      href: "/dashboard/patients?action=new",
      icon: Plus,
      color: "text-green-600",
    },
    {
      name: "Nueva Consulta",
      href: "/dashboard/consultations/new",
      icon: Menu, // Assuming Calendar is replaced with Menu based on context
      color: "text-blue-600",
    },
    {
      name: "Nueva Receta",
      href: "/dashboard/prescriptions/new",
      icon: FileText,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center">
              <Stethoscope className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">MediScript</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Doctor info */}
          <div className="p-4 border-b bg-blue-50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {doctor.gender === "female" ? "Dra." : "Dr."}{" "}
                  {doctor.full_name}
                </p>
                <p className="text-xs text-gray-600">
                  {doctor.specialty || "Médico General"}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    item.current
                      ? "bg-blue-100 text-blue-900"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 ${
                      item.current
                        ? "text-blue-600"
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="px-2 py-4 border-t">
            <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Acciones Rápidas
            </h3>
            <div className="space-y-1">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.name}
                    href={action.href}
                    className="group flex items-center px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className={`mr-3 h-4 w-4 ${action.color}`} />
                    {action.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center">
              <Stethoscope className="h-6 w-6 text-blue-600 mr-2" />
              <span className="font-semibold text-gray-900">MediScript</span>
            </div>
            <div className="w-8" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
