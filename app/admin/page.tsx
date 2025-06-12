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
  FileText,
  Activity,
} from "lucide-react";
import { supabase, type Doctor, type Admin } from "@/lib/supabase";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<
    "activate" | "deactivate" | null
  >(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [stats, setStats] = useState({
    totalDoctors: 0,
    activeDoctors: 0,
    inactiveDoctors: 0,
    totalPrescriptions: 0,
  });

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  useEffect(() => {
    // Filtrar médicos cuando cambie el término de búsqueda
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

      if (adminError) {
        console.error("Error al verificar administrador:", adminError.message);
        alert(
          "Error al cargar información del administrador: " + adminError.message
        );
        router.push("/");
        return;
      }

      if (!adminData) {
        alert("Acceso denegado. No tienes permisos de administrador.");
        router.push("/");
        return;
      }

      setAdmin(adminData);

      // Cargar médicos
      await loadDoctors();
      await loadStats();
    } catch (error: any) {
      console.error("Error:", error);
      alert("Error al cargar el panel de administrador: " + error.message);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error al cargar médicos:", error);
        return;
      }

      setDoctors(data || []);
      setFilteredDoctors(data || []);
    } catch (error: any) {
      console.error("Error loading doctors:", error.message);
    }
  };

  const loadStats = async () => {
    try {
      // Contar médicos
      const { count: totalDoctors } = await supabase
        .from("doctors")
        .select("*", { count: "exact", head: true });

      const { count: activeDoctors } = await supabase
        .from("doctors")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      const { count: inactiveDoctors } = await supabase
        .from("doctors")
        .select("*", { count: "exact", head: true })
        .eq("is_active", false);

      // Contar recetas
      const { count: totalPrescriptions } = await supabase
        .from("prescriptions")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      setStats({
        totalDoctors: totalDoctors || 0,
        activeDoctors: activeDoctors || 0,
        inactiveDoctors: inactiveDoctors || 0,
        totalPrescriptions: totalPrescriptions || 0,
      });
    } catch (error: any) {
      console.error("Error loading stats:", error.message);
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

      // Recargar estadísticas
      await loadStats();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            Cargando panel de administrador...
          </p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Acceso denegado</p>
          <Button onClick={() => router.push("/")} className="mt-4">
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Panel de Administrador
              </h1>
              <p className="text-gray-600">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Médicos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDoctors}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Médicos Activos
              </CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.activeDoctors}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Médicos Inactivos
              </CardTitle>
              <Activity className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.inactiveDoctors}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Recetas
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalPrescriptions}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Buscar Médicos</CardTitle>
            <CardDescription>
              Busca por nombre, email, matrícula o especialidad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar médicos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Doctors Table */}
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
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {doctors.length === 0
                    ? "No hay médicos registrados"
                    : "No se encontraron médicos"}
                </h3>
                <p className="text-gray-600">
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
                            <div className="text-sm text-gray-500">
                              Matrícula: {doctor.license_number}
                            </div>
                            <div className="text-sm text-gray-500">
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
                            <div className="text-xs text-gray-500">
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

      {/* Action Confirmation Dialog */}
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

// "use client"

// import { useEffect, useState } from "react"
// import { useRouter } from "next/navigation"
// import Link from "next/link"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Badge } from "@/components/ui/badge"
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog"
// import { Users, Search, MoreVertical, Eye, UserCheck, UserX, Shield, LogOut, FileText, Activity } from "lucide-react"
// import { supabase, type Doctor, type Admin } from "@/lib/supabase"

// export default function AdminDashboardPage() {
//   const router = useRouter()
//   const [loading, setLoading] = useState(true)
//   const [admin, setAdmin] = useState<Admin | null>(null)
//   const [doctors, setDoctors] = useState<Doctor[]>([])
//   const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([])
//   const [searchTerm, setSearchTerm] = useState("")
//   const [actionDialogOpen, setActionDialogOpen] = useState(false)
//   const [actionType, setActionType] = useState<"activate" | "deactivate" | null>(null)
//   const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
//   const [stats, setStats] = useState({
//     totalDoctors: 0,
//     activeDoctors: 0,
//     inactiveDoctors: 0,
//     totalPrescriptions: 0,
//   })

//   useEffect(() => {
//     checkAdminAndLoadData()
//   }, [])

//   useEffect(() => {
//     // Filtrar médicos cuando cambie el término de búsqueda
//     if (searchTerm.trim() === "") {
//       setFilteredDoctors(doctors)
//     } else {
//       const filtered = doctors.filter(
//         (doctor) =>
//           doctor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//           doctor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
//           doctor.license_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
//           doctor.specialty?.toLowerCase().includes(searchTerm.toLowerCase()),
//       )
//       setFilteredDoctors(filtered)
//     }
//   }, [searchTerm, doctors])

//   const checkAdminAndLoadData = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()

//       if (!user) {
//         router.push("/login")
//         return
//       }

//       // Verificar si es administrador
//       const { data: adminData, error: adminError } = await supabase
//         .from("admins")
//         .select("*")
//         .eq("id", user.id)
//         .single()

//       if (adminError || !adminData) {
//         alert("Acceso denegado. No tienes permisos de administrador.")
//         router.push("/dashboard")
//         return
//       }

//       setAdmin(adminData)

//       // Cargar médicos
//       await loadDoctors()
//       await loadStats()
//     } catch (error: any) {
//       console.error("Error:", error.message)
//       router.push("/dashboard")
//     } finally {
//       setLoading(false)
//     }
//   }

//   const loadDoctors = async () => {
//     try {
//       const { data, error } = await supabase.from("doctors").select("*").order("created_at", { ascending: false })

//       if (error) throw error

//       setDoctors(data || [])
//       setFilteredDoctors(data || [])
//     } catch (error: any) {
//       console.error("Error loading doctors:", error.message)
//     }
//   }

//   const loadStats = async () => {
//     try {
//       // Contar médicos
//       const { count: totalDoctors } = await supabase.from("doctors").select("*", { count: "exact", head: true })

//       const { count: activeDoctors } = await supabase
//         .from("doctors")
//         .select("*", { count: "exact", head: true })
//         .eq("is_active", true)

//       const { count: inactiveDoctors } = await supabase
//         .from("doctors")
//         .select("*", { count: "exact", head: true })
//         .eq("is_active", false)

//       // Contar recetas
//       const { count: totalPrescriptions } = await supabase
//         .from("prescriptions")
//         .select("*", { count: "exact", head: true })
//         .eq("is_active", true)

//       setStats({
//         totalDoctors: totalDoctors || 0,
//         activeDoctors: activeDoctors || 0,
//         inactiveDoctors: inactiveDoctors || 0,
//         totalPrescriptions: totalPrescriptions || 0,
//       })
//     } catch (error: any) {
//       console.error("Error loading stats:", error.message)
//     }
//   }

//   const handleDoctorAction = async () => {
//     if (!selectedDoctor || !actionType) return

//     try {
//       const newStatus = actionType === "activate"

//       const { error } = await supabase.from("doctors").update({ is_active: newStatus }).eq("id", selectedDoctor.id)

//       if (error) throw error

//       // Actualizar lista local
//       setDoctors((prev) =>
//         prev.map((doctor) => (doctor.id === selectedDoctor.id ? { ...doctor, is_active: newStatus } : doctor)),
//       )

//       setActionDialogOpen(false)
//       setSelectedDoctor(null)
//       setActionType(null)

//       // Recargar estadísticas
//       await loadStats()
//     } catch (error: any) {
//       alert("Error al actualizar médico: " + error.message)
//     }
//   }

//   const openActionDialog = (doctor: Doctor, action: "activate" | "deactivate") => {
//     setSelectedDoctor(doctor)
//     setActionType(action)
//     setActionDialogOpen(true)
//   }

//   const handleLogout = async () => {
//     await supabase.auth.signOut()
//     router.push("/")
//   }

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Cargando panel de administrador...</p>
//         </div>
//       </div>
//     )
//   }

//   if (!admin) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <p className="text-red-600">Acceso denegado</p>
//           <Button onClick={() => router.push("/dashboard")} className="mt-4">
//             Volver al Dashboard
//           </Button>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <header className="bg-white shadow-sm">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex items-center justify-between py-6">
//             <div>
//               <h1 className="text-2xl font-bold text-gray-900">Panel de Administrador</h1>
//               <p className="text-gray-600">Gestión de usuarios médicos - {admin.full_name}</p>
//             </div>
//             <div className="flex items-center space-x-4">
//               <Badge variant="secondary">
//                 <Shield className="h-3 w-3 mr-1" />
//                 {admin.is_super_admin ? "Super Admin" : "Admin"}
//               </Badge>
//               <Button variant="outline" size="sm" onClick={handleLogout}>
//                 <LogOut className="h-4 w-4 mr-2" />
//                 Cerrar Sesión
//               </Button>
//             </div>
//           </div>
//         </div>
//       </header>

//       {/* Main Content */}
//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Stats Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">Total Médicos</CardTitle>
//               <Users className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{stats.totalDoctors}</div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">Médicos Activos</CardTitle>
//               <Activity className="h-4 w-4 text-green-600" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold text-green-600">{stats.activeDoctors}</div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">Médicos Inactivos</CardTitle>
//               <Activity className="h-4 w-4 text-red-600" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold text-red-600">{stats.inactiveDoctors}</div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">Total Recetas</CardTitle>
//               <FileText className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{stats.totalPrescriptions}</div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Search */}
//         <Card className="mb-6">
//           <CardHeader>
//             <CardTitle>Buscar Médicos</CardTitle>
//             <CardDescription>Busca por nombre, email, matrícula o especialidad</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="relative">
//               <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
//               <Input
//                 placeholder="Buscar médicos..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10"
//               />
//             </div>
//           </CardContent>
//         </Card>

//         {/* Doctors Table */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Lista de Médicos</CardTitle>
//             <CardDescription>
//               {filteredDoctors.length} de {doctors.length} médicos
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             {filteredDoctors.length === 0 ? (
//               <div className="text-center py-12">
//                 <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                 <h3 className="text-lg font-medium text-gray-900 mb-2">
//                   {doctors.length === 0 ? "No hay médicos registrados" : "No se encontraron médicos"}
//                 </h3>
//                 <p className="text-gray-600">
//                   {doctors.length === 0
//                     ? "Los médicos aparecerán aquí cuando se registren"
//                     : "Intenta con otros términos de búsqueda"}
//                 </p>
//               </div>
//             ) : (
//               <div className="overflow-x-auto">
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Médico</TableHead>
//                       <TableHead>Contacto</TableHead>
//                       <TableHead>Especialidad</TableHead>
//                       <TableHead>Registro</TableHead>
//                       <TableHead>Estado</TableHead>
//                       <TableHead className="text-right">Acciones</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {filteredDoctors.map((doctor) => (
//                       <TableRow key={doctor.id}>
//                         <TableCell>
//                           <div>
//                             <div className="font-medium">
//                               {doctor.gender === "female" ? "Dra." : "Dr."} {doctor.full_name}
//                             </div>
//                             <div className="text-sm text-gray-500">Matrícula: {doctor.license_number}</div>
//                             <div className="text-sm text-gray-500">CI: {doctor.cedula}</div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div>
//                             <div className="text-sm">{doctor.email}</div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <div className="text-sm">{doctor.specialty || "Médico General"}</div>
//                         </TableCell>
//                         <TableCell>
//                           <div>
//                             <div className="text-sm">{new Date(doctor.created_at).toLocaleDateString("es-ES")}</div>
//                             <div className="text-xs text-gray-500">
//                               {new Date(doctor.created_at).toLocaleTimeString("es-ES", {
//                                 hour: "2-digit",
//                                 minute: "2-digit",
//                               })}
//                             </div>
//                           </div>
//                         </TableCell>
//                         <TableCell>
//                           <Badge variant={doctor.is_active ? "default" : "secondary"}>
//                             {doctor.is_active ? "Activo" : "Inactivo"}
//                           </Badge>
//                         </TableCell>
//                         <TableCell className="text-right">
//                           <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                               <Button variant="ghost" className="h-8 w-8 p-0">
//                                 <MoreVertical className="h-4 w-4" />
//                               </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent align="end">
//                               <DropdownMenuItem asChild>
//                                 <Link href={`/admin/doctors/${doctor.id}`}>
//                                   <Eye className="h-4 w-4 mr-2" />
//                                   Ver Detalle
//                                 </Link>
//                               </DropdownMenuItem>
//                               {doctor.is_active ? (
//                                 <DropdownMenuItem
//                                   className="text-red-600"
//                                   onClick={() => openActionDialog(doctor, "deactivate")}
//                                 >
//                                   <UserX className="h-4 w-4 mr-2" />
//                                   Desactivar
//                                 </DropdownMenuItem>
//                               ) : (
//                                 <DropdownMenuItem
//                                   className="text-green-600"
//                                   onClick={() => openActionDialog(doctor, "activate")}
//                                 >
//                                   <UserCheck className="h-4 w-4 mr-2" />
//                                   Activar
//                                 </DropdownMenuItem>
//                               )}
//                             </DropdownMenuContent>
//                           </DropdownMenu>
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </main>

//       {/* Action Confirmation Dialog */}
//       <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>{actionType === "activate" ? "Activar médico" : "Desactivar médico"}</AlertDialogTitle>
//             <AlertDialogDescription>
//               {actionType === "activate"
//                 ? `¿Estás seguro de que quieres activar a ${selectedDoctor?.full_name}? Podrá acceder al sistema y crear recetas.`
//                 : `¿Estás seguro de que quieres desactivar a ${selectedDoctor?.full_name}? No podrá acceder al sistema.`}
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancelar</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleDoctorAction}
//               className={actionType === "activate" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
//             >
//               {actionType === "activate" ? "Activar" : "Desactivar"}
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   )
// }
