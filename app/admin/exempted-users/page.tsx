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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ArrowLeft, Plus, Trash2, Mail, Shield } from "lucide-react";
import { supabase, type Admin } from "@/lib/supabase";

interface ExemptedUser {
  id: string;
  email: string;
  created_at: string;
  created_by: string;
}

export default function ExemptedUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [exemptedUsers, setExemptedUsers] = useState<ExemptedUser[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      // Verificar si es administrador
      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("id", user.id)
        .single();

      if (adminError || !adminData) {
        alert("Acceso denegado. No tienes permisos de administrador.");
        router.push("/");
        return;
      }

      setAdmin(adminData);
      await loadExemptedUsers();
    } catch (error: any) {
      console.error("Error:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const loadExemptedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("exempted_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExemptedUsers(data || []);
    } catch (error: any) {
      console.error("Error loading exempted users:", error.message);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      alert("Por favor ingresa un email válido");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      alert("Por favor ingresa un email válido");
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase
        .from("exempted_users")
        .insert({
          email: newEmail.trim().toLowerCase(),
          created_by: admin?.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation
          alert("Este email ya está en la lista de exentos");
        } else {
          throw error;
        }
        return;
      }

      setExemptedUsers((prev) => [data, ...prev]);
      setNewEmail("");
      alert("Email agregado exitosamente");
    } catch (error: any) {
      alert("Error al agregar email: " + error.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const { error } = await supabase
        .from("exempted_users")
        .delete()
        .eq("id", userToDelete);

      if (error) throw error;

      setExemptedUsers((prev) =>
        prev.filter((user) => user.id !== userToDelete)
      );
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      alert("Email eliminado exitosamente");
    } catch (error: any) {
      alert("Error al eliminar email: " + error.message);
    }
  };

  const openDeleteDialog = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => router.push("/admin")}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Usuarios Exentos de Pago
                </h1>
                <p className="text-muted-foreground">
                  Gestiona los usuarios que no requieren pago al registrarse
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-muted-foreground">
                {admin?.full_name}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add New Email */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Agregar Nuevo Email</CardTitle>
            <CardDescription>
              Los usuarios con estos emails podrán registrarse sin subir
              comprobante de pago
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <div className="flex-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddEmail()}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddEmail} disabled={adding}>
                  <Plus className="h-4 w-4 mr-2" />
                  {adding ? "Agregando..." : "Agregar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exempted Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuarios Exentos</CardTitle>
            <CardDescription>
              {exemptedUsers.length} email
              {exemptedUsers.length !== 1 ? "s" : ""} exento
              {exemptedUsers.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {exemptedUsers.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No hay usuarios exentos
                </h3>
                <p className="text-muted-foreground">
                  Agrega emails de usuarios que no requieran pago al registrarse
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Fecha de Creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exemptedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openDeleteDialog(user.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario exento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario será removido de la
              lista de exentos y futuros registros con este email requerirán
              pago.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
