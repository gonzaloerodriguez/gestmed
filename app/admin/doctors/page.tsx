"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Users,
  Search,
  MoreVertical,
  Eye,
  UserCheck,
  UserX,
  Shield,
  LogOut,
  //   FileText,
  //   Activity,
  //   UserPlus,
} from "lucide-react";
import { supabase, type Doctor, type Admin } from "@/lib/supabase";
import { useAuthGuard } from "@/lib/auth-guard";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { loading: authLoading, user } = useAuthGuard("admin");
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<
    "activate" | "deactivate" | null
  >(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    if (user && !authLoading) {
      loadAdminData();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredDoctors(doctors);
    } else {
      const filtered = doctors.filter(
        (doctor) =>
          doctor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doctor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doctor.license_number
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          doctor.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredDoctors(filtered);
    }
  }, [searchTerm, doctors]);

  const loadAdminData = async () => {
    try {
      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("id", user.id)
        .single();

      if (adminError) throw adminError;
      setAdmin(adminData);

      // Cargar médicos
      await loadDoctors();
    } catch (error: any) {
      console.error("Error:", error.message);
    }
  };

  const loadDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDoctors(data || []);
      setFilteredDoctors(data || []);
    } catch (error: any) {
      console.error("Error loading doctors:", error.message);
    }
  };

  const handleDoctorAction = async () => {
    if (!selectedDoctor || !actionType) return;

    try {
      const newStatus = actionType === "activate";

      const { error } = await supabase
        .from("doctors")
        .update({ is_active: newStatus })
        .eq("id", selectedDoctor.id);

      if (error) throw error;

      // Actualizar lista local
      setDoctors((prev) =>
        prev.map((doctor) =>
          doctor.id === selectedDoctor.id
            ? { ...doctor, is_active: newStatus }
            : doctor
        )
      );

      setActionDialogOpen(false);
      setSelectedDoctor(null);
      setActionType(null);
    } catch (error: any) {
      alert("Error al actualizar médico: " + error.message);
    }
  };

  const openActionDialog = (
    doctor: Doctor,
    action: "activate" | "deactivate"
  ) => {
    setSelectedDoctor(doctor);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Cargando panel de administrador...
          </p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Acceso denegado</p>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Panel de Administrador
              </h1>
              <p className="text-muted-foreground">
                Gestión de usuarios médicos - {admin.full_name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">
                <Shield className="h-3 w-3 mr-1" />
                {admin.is_super_admin ? "Super Admin" : "Admin"}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Buscar Médicos</CardTitle>
            <CardDescription>
              Busca por nombre, email, matrícula o especialidad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar médicos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Médicos</CardTitle>
            <CardDescription>
              {filteredDoctors.length} de {doctors.length} médicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDoctors.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {doctors.length === 0
                    ? "No hay médicos registrados"
                    : "No se encontraron médicos"}
                </h3>
                <p className="text-muted-foreground">
                  {doctors.length === 0
                    ? "Los médicos aparecerán aquí cuando se registren"
                    : "Intenta con otros términos de búsqueda"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Médico</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Especialidad</TableHead>
                      <TableHead>Registro</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDoctors.map((doctor) => (
                      <TableRow key={doctor.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {doctor.gender === "female" ? "Dra." : "Dr."}{" "}
                              {doctor.full_name}
                            </div>
                            <div className="text-sm text-foreground">
                              Matrícula: {doctor.license_number}
                            </div>
                            <div className="text-sm text-foreground">
                              CI: {doctor.cedula}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">{doctor.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {doctor.specialty || "Médico General"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">
                              {new Date(doctor.created_at).toLocaleDateString(
                                "es-ES"
                              )}
                            </div>
                            <div className="text-xs text-foreground">
                              {new Date(doctor.created_at).toLocaleTimeString(
                                "es-ES",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={doctor.is_active ? "default" : "secondary"}
                          >
                            {doctor.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/doctors/${doctor.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalle
                                </Link>
                              </DropdownMenuItem>
                              {doctor.is_active ? (
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() =>
                                    openActionDialog(doctor, "deactivate")
                                  }
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Desactivar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-green-600"
                                  onClick={() =>
                                    openActionDialog(doctor, "activate")
                                  }
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Activar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "activate"
                ? "Activar médico"
                : "Desactivar médico"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "activate"
                ? `¿Estás seguro de que quieres activar a ${selectedDoctor?.full_name}? Podrá acceder al sistema y crear recetas.`
                : `¿Estás seguro de que quieres desactivar a ${selectedDoctor?.full_name}? No podrá acceder al sistema.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDoctorAction}
              className={
                actionType === "activate"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {actionType === "activate" ? "Activar" : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
