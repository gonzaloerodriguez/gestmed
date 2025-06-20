"use client";

import type React from "react";
import { useUser } from "@/contexts/user-context";
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
  ArrowLeft,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeInitializer } from "@/components/theme-initializer";

interface DashboardSidebarProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageDescription?: string;
  showBackButton?: boolean;
  backUrl?: string;
}

export function DashboardSidebar({
  children,
  pageTitle,
  pageDescription,
  showBackButton = false,
  backUrl,
}: DashboardSidebarProps) {
  const { user, userType, loading } = useUser();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !userType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">
            Error al cargar información del usuario
          </p>
        </div>
      </div>
    );
  }

  const navigation = userType === "doctor" ? doctorNavigation : adminNavigation;
  const quickActions =
    userType === "doctor" ? doctorQuickActions : adminQuickActions;

  // Get user display info - AHORA REACTIVO
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

  // Get page info based on current route
  const getPageInfo = () => {
    if (pageTitle && pageDescription) {
      return { title: pageTitle, description: pageDescription };
    }

    // Auto-detect based on pathname
    if (pathname.includes("/profile")) {
      return {
        title:
          userType === "doctor" ? "Mi Perfil" : "Mi Perfil de Administrador",
        description:
          userType === "doctor"
            ? "Gestiona tu información personal y credenciales"
            : "Gestiona tu cuenta y configuraciones administrativas",
      };
    }

    if (pathname.includes("/patients")) {
      return {
        title: "Pacientes",
        description: "Gestiona la información de tus pacientes",
      };
    }

    if (pathname.includes("/consultations/new")) {
      return {
        title: "Nueva consulta",
        description: "Registrar una nueva consulta médica",
      };
    }
    if (pathname.includes("/consultations")) {
      return {
        title: "Consultas",
        description: "Historial y gestión de consultas médicas",
      };
    }

    if (pathname.includes("/prescriptions/new")) {
      return {
        title: "Nueva receta",
        description: "Crear una nueva receta médica",
      };
    }

    if (pathname.includes("/prescriptions") && pathname.endsWith("/edit")) {
      return {
        title: "Editar receta",
        description: "Modificar los datos de la receta médica",
      };
    }

    if (pathname.includes("/prescriptions")) {
      return { title: "Recetas", description: "Gestión de recetas médicas" };
    }

    if (pathname.includes("/statistics")) {
      return {
        title: "Estadísticas",
        description: "Análisis y reportes del sistema",
      };
    }

    if (pathname.includes("/doctors")) {
      return {
        title: "Gestión de Usuarios",
        description: "Administra médicos y usuarios del sistema",
      };
    }

    if (pathname.includes("/exempted-users")) {
      return {
        title: "Usuarios Exentos",
        description: "Gestiona usuarios con acceso especial",
      };
    }
    if (pathname.includes("/payment-history")) {
      return {
        title: "Historial de comprobante",
        description: "Todos tus comprobantes subidos",
      };
    }

    // Default dashboard
    return {
      title:
        userType === "doctor"
          ? `Bienvenido, ${userInfo?.title}`
          : "Panel de Administración",
      description:
        userType === "doctor"
          ? `${userInfo?.subtitle}`
          : "Resumen del sistema y estadísticas",
    };
  };

  const userInfo = getUserDisplayInfo();
  const pageInfo = getPageInfo();
  const UserIcon = userInfo.icon;
  showBackButton =
    pathname.includes("/patients") ||
    pathname.includes("/profile") ||
    pathname.includes("/stadistics") ||
    pathname.includes("/prescriptions") ||
    pathname.includes("/exempted-users") ||
    pathname.includes("/consultations") ||
    pathname.includes("/doctors") ||
    pathname.includes("/payment-history")
      ? true
      : false;

  const getBackUrl = () => {
    if (pathname) {
      const parts = pathname.split("/").filter(Boolean); // elimina ""
      parts.pop(); // elimina la última parte del path

      console.log(`/${parts.join("/")}`);
      return `/${parts.join("/")}`;
    }
    return userType === "doctor" ? "/dashboard" : "/admin";
  };
  console.log(user.id);

  return (
    <div className="flex h-screen bg-background">
      <ThemeInitializer userId={user.id} userType={userType || undefined} />

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

          {/* User info - AHORA SE ACTUALIZA AUTOMÁTICAMENTE */}
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
                <p className="text-xs text-muted-foreground mt-2">
                  {(user as Admin) ? "" : userInfo.subtitle}
                </p>
                {(user as Doctor).subscription_status && (
                  <Badge
                    variant={
                      (user as Doctor).subscription_status === "active"
                        ? "default"
                        : (user as Doctor).subscription_status ===
                            "pending_verification"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {(user as Doctor).subscription_status === "active" &&
                      "Suscripción Activa"}
                    {(user as Doctor).subscription_status ===
                      "pending_verification" && "Pago Pendiente"}
                    {(user as Doctor).subscription_status === "expired" &&
                      "Suscripción Vencida"}
                  </Badge>
                )}
                {(user as Admin).is_super_admin && (
                  <Badge
                    variant={
                      (user as Admin).is_super_admin ? "default" : "secondary"
                    }
                  >
                    {(user as Admin).is_super_admin ? "Super Admin" : "Admin"}
                  </Badge>
                )}
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

        {/* Page Header - NUEVO */}
        <header className="bg-card shadow-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center lg:w-1/2">
                {showBackButton && (
                  <Button
                    variant="ghost"
                    onClick={() => router.push(getBackUrl())}
                    className="mr-4"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver
                  </Button>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {pageInfo.title}
                  </h1>
                  <p className="text-muted-foreground">
                    {pageInfo.description}
                  </p>
                </div>
              </div>

              {/* Status badges - Conditional based on user type */}
              <div className="hidden lg:flex items-center space-x-4">
                {userType === "doctor" && (
                  <>
                    <Link href="/dashboard/profile">
                      <Button variant="outline" size="sm">
                        <User className="h-4 w-4 mr-2" />
                        Perfil
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Cerrar Sesión
                    </Button>
                  </>
                )}

                {userType === "admin" && (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/admin/settings">
                        <Settings className="h-4 w-4 mr-2" />
                        Configuración
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Cerrar Sesión
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
