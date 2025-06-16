"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User,
  Save,
  Eye,
  EyeOff,
  ArrowLeft,
  Mail,
  Calendar,
  Shield,
  Settings,
  Activity,
  Lock,
  UserCog,
  Database,
  Download,
  Monitor,
  Palette,
} from "lucide-react";
import { supabase, type Admin } from "@/lib/supabase";
import { useAuthGuard } from "@/lib/auth-guard";
import { AdminThemeSelector } from "@/components/admin-theme-selector";

interface AdminActivity {
  id: string;
  action: string;
  timestamp: string;
  details: string;
  ip_address?: string;
}

export default function AdminProfilePage() {
  const router = useRouter();
  const { loading: authLoading, user } = useAuthGuard("admin");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [personalData, setPersonalData] = useState({
    full_name: "",
    email: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    systemAlerts: true,
    weeklyReports: false,
    darkMode: false,
  });

  const [recentActivity, setRecentActivity] = useState<AdminActivity[] | null>(
    []
  );
  const [preferencesAdmin, setPreferencesAdmin] = useState<any>(null);

  useEffect(() => {
    if (user && !authLoading) {
      loadProfile();
      loadRecentActivity();
      loadAdminPreferences();
    }
  }, [user, authLoading]);

  const loadProfile = async () => {
    try {
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: adminData, error } = await supabase
        .from("admins")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setAdmin(adminData);

      setPersonalData({
        full_name: adminData.full_name,
        email: adminData.email,
      });
    } catch (error: any) {
      console.error("Error loading profile:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    try {
      if (!user) return;

      const { data: activityData, error } = await supabase
        .from("admin_activity_logs")
        .select("*")
        .eq("admin_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const formattedActivity = activityData
        ? activityData.map((item) => ({
            id: item.id,
            action: item.action,
            timestamp: item.created_at,
            details: item.details || "",
            ip_address: item.ip_address,
          }))
        : null;
      setRecentActivity(formattedActivity);
    } catch (error: any) {
      console.error("Error loading activity:", error.message);
    }
  };

  const loadAdminPreferences = async () => {
    try {
      if (!user) {
        return;
      }

      const { data: adminPreferences, error } = await supabase
        .from("admin_preferences")
        .select("*")
        .eq("admin_id", user.id)
        .single();

      if (error) {
        // Si no existe, crear preferencias por defecto
        if (error.code === "PGRST116") {
          // No rows returned
          console.log("No preferences found, will create default");
          setPreferencesAdmin(null);
        } else {
          throw error;
        }
      } else {
        console.log("Admin preferences loaded:", adminPreferences);
        setPreferencesAdmin(adminPreferences);
      }
    } catch (error: any) {
      console.error("Error loading admin preferences:", error.message);
      setPreferencesAdmin(null);
    }
  };

  const handlePersonalDataChange = (field: string, value: string) => {
    setPersonalData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePreferenceChange = (field: string, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const savePersonalData = async () => {
    if (!admin) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("admins")
        .update({
          full_name: personalData.full_name,
          email: personalData.email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", admin.id);

      if (error) throw error;

      if (personalData.email !== admin.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: personalData.email,
        });
        if (authError) throw authError;
      }

      alert("Datos personales actualizados correctamente");
      loadProfile();
    } catch (error: any) {
      alert("Error al actualizar datos: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("Las contraseñas nuevas no coinciden");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      alert("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      alert("Contraseña actualizada correctamente");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      alert("Error al cambiar contraseña: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      localStorage.setItem("admin-preferences", JSON.stringify(preferences));

      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert("Preferencias guardadas correctamente");
    } catch (error: any) {
      alert("Error al guardar preferencias: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    if (!admin) return;

    setExportLoading(true);
    try {
      const exportData = {
        admin_info: {
          id: admin.id,
          full_name: admin.full_name,
          email: admin.email,
          is_super_admin: admin.is_super_admin,
          created_at: admin.created_at,
          updated_at: admin.updated_at,
        },
        recent_activity: recentActivity,
        preferences: preferences,
        export_date: new Date().toISOString(),
        export_type: "admin_profile_data",
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admin_data_${admin.full_name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert("Datos exportados correctamente");
    } catch (error: any) {
      alert("Error al exportar datos: " + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!admin) return;

    setSaving(true);
    try {
      if (admin.is_super_admin) {
        const { count } = await supabase
          .from("admins")
          .select("*", { count: "exact", head: true })
          .eq("is_super_admin", true);

        if (count && count <= 1) {
          alert("No puedes eliminar la única cuenta de Super Administrador");
          return;
        }
      }

      const { error } = await supabase
        .from("admins")
        .delete()
        .eq("id", admin.id);

      if (error) throw error;

      await supabase.auth.signOut();
      router.push("/");
    } catch (error: any) {
      alert("Error al eliminar cuenta: " + error.message);
    } finally {
      setSaving(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Cargando perfil de administrador...
          </p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error al cargar el perfil</p>
          <Button
            onClick={() => router.push("/admin/dashboard")}
            className="mt-4"
          >
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => router.push("/admin/dashboard")}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Mi Perfil de Administrador
                </h1>
                <p className="text-muted-foreground">
                  Gestiona tu cuenta y configuraciones administrativas
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={admin.is_super_admin ? "default" : "secondary"}>
                <Shield className="h-3 w-3 mr-1" />
                {admin.is_super_admin ? "Super Admin" : "Admin"}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Contenido principal con tabs */}
          <div className="lg:col-span-4">
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="personal">
                  <User className="h-4 w-4 mr-2" />
                  Personal
                </TabsTrigger>
                <TabsTrigger value="security">
                  <Lock className="h-4 w-4 mr-2" />
                  Seguridad
                </TabsTrigger>
                <TabsTrigger value="preferences">
                  <Settings className="h-4 w-4 mr-2" />
                  Preferencias
                </TabsTrigger>
                <TabsTrigger value="theme">
                  <Palette className="h-4 w-4 mr-2" />
                  Tema
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Activity className="h-4 w-4 mr-2" />
                  Actividad
                </TabsTrigger>
                <TabsTrigger value="account">
                  <UserCog className="h-4 w-4 mr-2" />
                  Cuenta
                </TabsTrigger>
              </TabsList>

              {/* Tab: Datos Personales */}
              <TabsContent value="personal">
                <Card>
                  <CardHeader>
                    <CardTitle>Información Personal</CardTitle>
                    <CardDescription>
                      Actualiza tu información personal de administrador
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="full_name">Nombre Completo</Label>
                        <Input
                          id="full_name"
                          value={personalData.full_name}
                          onChange={(e) =>
                            handlePersonalDataChange(
                              "full_name",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input
                          id="email"
                          type="email"
                          value={personalData.email}
                          onChange={(e) =>
                            handlePersonalDataChange("email", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo de Administrador</Label>
                        <div className="mt-2">
                          <Badge
                            variant={
                              admin.is_super_admin ? "default" : "secondary"
                            }
                            className="text-sm"
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            {admin.is_super_admin
                              ? "Super Administrador"
                              : "Administrador"}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {admin.is_super_admin
                              ? "Acceso completo al sistema"
                              : "Acceso limitado según permisos asignados"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <Label>Fecha de Registro</Label>
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            {new Date(admin.created_at).toLocaleDateString(
                              "es-ES",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={savePersonalData} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Guardando..." : "Guardar Cambios"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Seguridad */}
              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Seguridad de la Cuenta</CardTitle>
                    <CardDescription>
                      Mantén tu cuenta segura actualizando tu contraseña
                      regularmente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="current_password">
                        Contraseña Actual
                      </Label>
                      <div className="relative">
                        <Input
                          id="current_password"
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            handlePasswordChange(
                              "currentPassword",
                              e.target.value
                            )
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="new_password">Nueva Contraseña</Label>
                      <div className="relative">
                        <Input
                          id="new_password"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            handlePasswordChange("newPassword", e.target.value)
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Mínimo 8 caracteres, incluye mayúsculas y números
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="confirm_password">
                        Confirmar Nueva Contraseña
                      </Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          handlePasswordChange(
                            "confirmPassword",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="bg-background p-4 rounded-lg">
                      <h4 className="font-medium text-foreground mb-2">
                        Recomendaciones de Seguridad
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Usa una contraseña única para esta cuenta</li>
                        <li>
                          • Incluye mayúsculas, minúsculas, números y símbolos
                        </li>
                        <li>• Cambia tu contraseña cada 3-6 meses</li>
                        <li>• No compartas tus credenciales con nadie</li>
                      </ul>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={changePassword} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Cambiando..." : "Cambiar Contraseña"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Preferencias */}
              <TabsContent value="preferences">
                <Card>
                  <CardHeader>
                    <CardTitle>Preferencias del Sistema</CardTitle>
                    <CardDescription>
                      Configura cómo quieres recibir notificaciones y usar el
                      sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">
                            Notificaciones por Email
                          </Label>
                          <p className="text-sm text-gray-500">
                            Recibe alertas importantes por correo electrónico
                          </p>
                        </div>
                        <Switch
                          checked={preferences.emailNotifications}
                          onCheckedChange={(checked) =>
                            handlePreferenceChange(
                              "emailNotifications",
                              checked
                            )
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">
                            Alertas del Sistema
                          </Label>
                          <p className="text-sm text-gray-500">
                            Notificaciones sobre el estado del sistema
                          </p>
                        </div>
                        <Switch
                          checked={preferences.systemAlerts}
                          onCheckedChange={(checked) =>
                            handlePreferenceChange("systemAlerts", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">
                            Reportes Semanales
                          </Label>
                          <p className="text-sm text-gray-500">
                            Resumen semanal de actividad del sistema
                          </p>
                        </div>
                        <Switch
                          checked={preferences.weeklyReports}
                          onCheckedChange={(checked) =>
                            handlePreferenceChange("weeklyReports", checked)
                          }
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={savePreferences} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Guardando..." : "Guardar Preferencias"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Tema */}
              <TabsContent value="theme">
                {preferencesAdmin && (
                  <AdminThemeSelector
                    adminId={admin.id}
                    currentTheme={preferencesAdmin.preferred_theme || "default"}
                  />
                )}
              </TabsContent>

              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Actividad Reciente</CardTitle>
                    <CardDescription>
                      Historial de tus acciones más recientes en el sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentActivity?.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start space-x-4 p-4 border rounded-lg"
                        >
                          <div className="bg-blue-100 p-2 rounded-full">
                            <Activity className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{activity.action}</p>
                            <p className="text-sm text-gray-600">
                              {activity.details}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(activity.timestamp).toLocaleString(
                                "es-ES"
                              )}
                            </p>
                            {activity.ip_address && (
                              <p className="text-xs text-gray-400">
                                IP: {activity.ip_address}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 text-center">
                      <Button variant="outline" onClick={loadRecentActivity}>
                        <Database className="h-4 w-4 mr-2" />
                        Actualizar Actividad
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="account">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Exportar Datos</CardTitle>
                      <CardDescription>
                        Descarga una copia de tu información personal y
                        actividad
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="bg-background p-4 rounded-lg">
                          <h4 className="font-medium text-foreground mb-2">
                            ¿Qué se incluye en la exportación?
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Información personal del administrador</li>
                            <li>• Historial de actividad reciente</li>
                            <li>• Configuraciones y preferencias</li>
                            <li>• Metadatos de la cuenta</li>
                          </ul>
                        </div>
                        <Button onClick={exportData} disabled={exportLoading}>
                          <Download className="h-4 w-4 mr-2" />
                          {exportLoading
                            ? "Exportando..."
                            : "Exportar Mis Datos"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600">
                        Zona de Peligro
                      </CardTitle>
                      <CardDescription>
                        Acciones irreversibles para tu cuenta
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-background p-4 rounded-lg">
                        <h4 className="font-medium text-red-900 mb-2">
                          Eliminar Cuenta
                        </h4>
                        <p className="text-sm text-red-800 mb-4">
                          Eliminar tu cuenta es una acción permanente e
                          irreversible. Todos tus datos se perderán.
                        </p>
                        <Button
                          variant="destructive"
                          onClick={() => setDeleteDialogOpen(true)}
                          disabled={admin.is_super_admin}
                        >
                          Eliminar Cuenta
                        </Button>
                        {admin.is_super_admin && (
                          <p className="text-xs text-red-600 mt-2">
                            Los Super Administradores no pueden eliminar su
                            cuenta si son los únicos en el sistema.
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar cuenta de administrador?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente tu
              cuenta y todos los datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAccount}
              className="bg-red-600 hover:bg-red-700"
              disabled={saving}
            >
              {saving ? "Eliminando..." : "Eliminar Cuenta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
