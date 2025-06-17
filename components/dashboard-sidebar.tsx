"use client";

import type React from "react";

import type { Doctor, Admin } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
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
  Shield,
  BarChart3,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeInitializer } from "@/components/theme-initializer";

interface DashboardSidebarProps {
  user: Doctor | Admin;
  userType: "doctor" | "admin";
  children: React.ReactNode;
}

export function DashboardSidebar({
  user,
  userType,
  children,
}: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Navigation for doctors
  const doctorNavigation = [
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

  // Navigation for admins
  const adminNavigation = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: Home,
      current: pathname === "/admin",
    },
    {
      name: "Usuarios",
      href: "/admin/doctors",
      icon: Users,
      current: pathname === "/admin/doctors",
    },
    {
      name: "Estadísticas",
      href: "/admin/statistics",
      icon: BarChart3,
      current: pathname.startsWith("/admin/statistics"),
    },
    {
      name: "Usuarios Exentos",
      href: "/admin/exempted-users",
      icon: UserPlus,
      current: pathname.startsWith("/admin/exempted-users"),
    },
    {
      name: "Mi Perfil",
      href: "/admin/profile",
      icon: User,
      current: pathname.startsWith("/admin/profile"),
    },
  ];

  // Quick actions for doctors
  const doctorQuickActions = [
    {
      name: "Nuevo Paciente",
      href: "/dashboard/patients?action=new",
      icon: Plus,
      color: "text-green-600",
    },
    {
      name: "Nueva Consulta",
      href: "/dashboard/consultations/new",
      icon: Menu,
      color: "text-blue-600",
    },
    {
      name: "Nueva Receta",
      href: "/dashboard/prescriptions/new",
      icon: FileText,
      color: "text-purple-600",
    },
  ];

  // Quick actions for admins
  const adminQuickActions = [
    {
      name: "Ver Estadísticas",
      href: "/admin/statistics",
      icon: BarChart3,
      color: "text-blue-600",
    },
    {
      name: "Gestionar Usuarios",
      href: "/admin/doctors",
      icon: Users,
      color: "text-green-600",
    },
    {
      name: "Usuarios Exentos",
      href: "/admin/exempted-users",
      icon: UserPlus,
      color: "text-orange-600",
    },
  ];

  const navigation = userType === "doctor" ? doctorNavigation : adminNavigation;
  const quickActions =
    userType === "doctor" ? doctorQuickActions : adminQuickActions;

  // Get user display info
  const getUserDisplayInfo = () => {
    if (userType === "doctor") {
      const doctor = user as Doctor;
      return {
        title: `${doctor.gender === "female" ? "Dra." : "Dr."} ${doctor.full_name}`,
        subtitle: doctor.specialty || "Médico General",
        icon: User,
        bgColor: "bg-primary",
        iconColor: "text-primary-foreground",
      };
    } else {
      const admin = user as Admin;
      return {
        title: admin.full_name,
        subtitle: admin.is_super_admin
          ? "Super Administrador"
          : "Administrador",
        icon: Shield,
        bgColor: "bg-orange-600",
        iconColor: "text-white",
      };
    }
  };

  const userInfo = getUserDisplayInfo();
  const UserIcon = userInfo.icon;

  return (
    <div className="flex h-screen bg-background">
      {userType === "doctor" && <ThemeInitializer userId={user.id} />}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-background/75 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-lg border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center">
              {userType === "doctor" ? (
                <Stethoscope className="h-8 w-8 text-primary mr-3" />
              ) : (
                <Shield className="h-8 w-8 text-orange-600 mr-3" />
              )}
              <h1 className="text-xl font-bold text-foreground">
                {userType === "doctor" ? "GestMed" : "Admin Panel"}
              </h1>
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

          {/* User info */}
          <div className="p-4 border-b border-border bg-muted/50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`h-10 w-10 rounded-full ${userInfo.bgColor} flex items-center justify-center`}
                >
                  <UserIcon className={`h-6 w-6 ${userInfo.iconColor}`} />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">
                  {userInfo.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userInfo.subtitle}
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
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 ${
                      item.current
                        ? userType === "doctor"
                          ? "text-primary"
                          : "text-orange-600"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions */}
          <div className="px-2 py-4 border-t border-border">
            <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {userType === "doctor"
                ? "Acciones Rápidas"
                : "Herramientas Admin"}
            </h3>
            <div className="space-y-1">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.name}
                    href={action.href}
                    className="group flex items-center px-2 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-accent/50 hover:text-foreground transition-colors"
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
          <div className="p-4 border-t border-border">
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
        <div className="lg:hidden bg-card shadow-sm border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center">
              {userType === "doctor" ? (
                <>
                  <Stethoscope className="h-6 w-6 text-primary mr-2" />
                  <span className="font-semibold text-foreground">GestMed</span>
                </>
              ) : (
                <>
                  <Shield className="h-6 w-6 text-orange-600 mr-2" />
                  <span className="font-semibold text-foreground">
                    Admin Panel
                  </span>
                </>
              )}
            </div>
            <div className="w-8" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
