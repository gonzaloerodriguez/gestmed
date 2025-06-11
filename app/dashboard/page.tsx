"use client";

import { useEffect, useState } from "react";
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
  Users,
  Plus,
  Eye,
  Search,
  Calendar,
  Stethoscope,
  Activity,
  UserCheck,
  Clock,
} from "lucide-react";
import {
  supabase,
  type Doctor,
  type Patient,
  type Consultation,
} from "@/lib/supabase";

export default function DashboardPage() {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [recentConsultations, setRecentConsultations] = useState<
    Consultation[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    minorPatients: 0,
    consultationsToday: 0,
    consultationsThisWeek: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      searchPatients();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const loadDashboardData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Obtener datos del médico
      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("*")
        .eq("id", user.id)
        .single();

      if (doctorError) throw doctorError;
      setDoctor(doctorData);

      // Obtener pacientes recientes (últimos 5)
      const { data: patientsData, error: patientsError } = await supabase
        .from("patients")
        .select("*")
        .eq("doctor_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (patientsError) throw patientsError;
      setRecentPatients(patientsData || []);

      // Obtener estadísticas de pacientes
      const { data: allPatients, error: allPatientsError } = await supabase
        .from("patients")
        .select("birth_date")
        .eq("doctor_id", user.id)
        .eq("is_active", true);

      if (!allPatientsError && allPatients) {
        const totalPatients = allPatients.length;
        const minorPatients = allPatients.filter((p) => {
          if (!p.birth_date) return false;
          const age = calculateAge(p.birth_date);
          return age < 18;
        }).length;

        setStats((prev) => ({ ...prev, totalPatients, minorPatients }));
      }

      // Obtener consultas recientes
      const { data: consultationsData, error: consultationsError } =
        await supabase
          .from("consultations")
          .select(
            `
          *,
          medical_histories!inner(
            patient_id,
            patients!inner(full_name)
          )
        `
          )
          .eq("doctor_id", user.id)
          .order("consultation_date", { ascending: false })
          .limit(5);

      if (!consultationsError && consultationsData) {
        setRecentConsultations(consultationsData);

        // Calcular consultas de hoy y esta semana
        const today = new Date();
        const startOfDay = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        const consultationsToday = consultationsData.filter(
          (c) => new Date(c.consultation_date) >= startOfDay
        ).length;

        const consultationsThisWeek = consultationsData.filter(
          (c) => new Date(c.consultation_date) >= startOfWeek
        ).length;

        setStats((prev) => ({
          ...prev,
          consultationsToday,
          consultationsThisWeek,
        }));
      }
    } catch (error: any) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchPatients = async () => {
    if (!doctor || !searchTerm.trim()) return;

    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("doctor_id", doctor.id)
        .eq("is_active", true)
        .or(
          `full_name.ilike.%${searchTerm}%,cedula.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
        )
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error("Error searching patients:", error);
    }
  };

  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido, {doctor?.gender === "female" ? "Dra." : "Dr."}{" "}
          {doctor?.full_name}
        </h1>
        <p className="text-gray-600 mt-2">Resumen de tu actividad médica</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total Pacientes
                </p>
                <p className="text-2xl font-bold">{stats.totalPatients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Menores de Edad
                </p>
                <p className="text-2xl font-bold">{stats.minorPatients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Stethoscope className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Consultas Hoy
                </p>
                <p className="text-2xl font-bold">{stats.consultationsToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Esta Semana</p>
                <p className="text-2xl font-bold">
                  {stats.consultationsThisWeek}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda rápida de pacientes */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Búsqueda Rápida de Pacientes
          </CardTitle>
          <CardDescription>
            Busca pacientes por nombre, cédula o teléfono
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar pacientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((patient) => {
                const age = patient.birth_date
                  ? calculateAge(patient.birth_date)
                  : null;
                const isMinor = age !== null && age < 18;

                return (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center">
                      <div>
                        <p className="font-medium">{patient.full_name}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          {patient.cedula && <span>CI: {patient.cedula}</span>}
                          {age !== null && (
                            <span className="flex items-center">
                              {age} años
                              {isMinor && (
                                <Badge
                                  variant="secondary"
                                  className="ml-1 text-xs"
                                >
                                  Menor
                                </Badge>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Link href={`/dashboard/patients/${patient.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pacientes recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-6 w-6 text-gray-600 mr-2" />
              Pacientes Recientes
            </CardTitle>
            <CardDescription>Últimos 5 pacientes registrados</CardDescription>
          </CardHeader>
          <CardContent>
            {recentPatients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  No hay pacientes registrados aún
                </p>
                <Link href="/dashboard/patients?action=new">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Primer Paciente
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentPatients.map((patient) => {
                  const age = patient.birth_date
                    ? calculateAge(patient.birth_date)
                    : null;
                  const isMinor = age !== null && age < 18;

                  return (
                    <div
                      key={patient.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h3 className="font-medium">{patient.full_name}</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(patient.created_at).toLocaleDateString(
                              "es-ES"
                            )}
                          </span>
                          {age !== null && (
                            <>
                              <span>•</span>
                              <span>{age} años</span>
                              {isMinor && (
                                <Badge variant="secondary" className="text-xs">
                                  Menor
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <Link href={`/dashboard/patients/${patient.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </Link>
                    </div>
                  );
                })}
                <div className="text-center pt-4">
                  <Link href="/dashboard/patients">
                    <Button variant="outline">Ver Todos los Pacientes</Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consultas recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Stethoscope className="h-6 w-6 text-gray-600 mr-2" />
              Consultas Recientes
            </CardTitle>
            <CardDescription>Últimas 5 consultas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {recentConsultations.length === 0 ? (
              <div className="text-center py-8">
                <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  No hay consultas registradas aún
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Las consultas se crean desde la historia clínica de cada
                  paciente
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentConsultations.map((consultation) => (
                  <div
                    key={consultation.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">
                        {(consultation as any).medical_histories?.patients
                          ?.full_name || "Paciente"}
                      </h3>
                      <p className="text-sm text-gray-600 mb-1">
                        {consultation.reason_for_visit}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(
                          consultation.consultation_date
                        ).toLocaleDateString("es-ES", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <Link href={`/dashboard/consultations/${consultation.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
                <div className="text-center pt-4">
                  <Link href="/dashboard/patients">
                    <Button variant="outline">Ver Historias Clínicas</Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import {
//   Users,
//   Plus,
//   User,
//   LogOut,
//   Eye,
//   Search,
//   Calendar,
//   FileText,
//   Stethoscope,
//   Activity,
//   UserCheck,
//   Clock,
// } from "lucide-react";
// import {
//   supabase,
//   type Doctor,
//   type Patient,
//   type Consultation,
// } from "@/lib/supabase";

// export default function DashboardPage() {
//   const router = useRouter();
//   const [doctor, setDoctor] = useState<Doctor | null>(null);
//   const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
//   const [recentConsultations, setRecentConsultations] = useState<
//     Consultation[]
//   >([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [searchResults, setSearchResults] = useState<Patient[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [stats, setStats] = useState({
//     totalPatients: 0,
//     minorPatients: 0,
//     consultationsToday: 0,
//     consultationsThisWeek: 0,
//   });

//   useEffect(() => {
//     checkUser();
//   }, []);

//   useEffect(() => {
//     if (searchTerm.trim()) {
//       searchPatients();
//     } else {
//       setSearchResults([]);
//     }
//   }, [searchTerm]);

//   const checkUser = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();

//       if (!user) {
//         router.push("/login");
//         return;
//       }

//       // Obtener datos del médico
//       const { data: doctorData, error: doctorError } = await supabase
//         .from("doctors")
//         .select("*")
//         .eq("id", user.id)
//         .single();

//       if (doctorError) throw doctorError;
//       setDoctor(doctorData);

//       // Cargar datos del dashboard
//       await loadDashboardData(user.id);
//     } catch (error: any) {
//       console.error("Error:", error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadDashboardData = async (doctorId: string) => {
//     try {
//       // Obtener pacientes recientes (últimos 5)
//       const { data: patientsData, error: patientsError } = await supabase
//         .from("patients")
//         .select("*")
//         .eq("doctor_id", doctorId)
//         .eq("is_active", true)
//         .order("created_at", { ascending: false })
//         .limit(5);

//       if (patientsError) throw patientsError;
//       setRecentPatients(patientsData || []);

//       // Obtener estadísticas de pacientes
//       const { data: allPatients, error: allPatientsError } = await supabase
//         .from("patients")
//         .select("birth_date")
//         .eq("doctor_id", doctorId)
//         .eq("is_active", true);

//       if (!allPatientsError && allPatients) {
//         const totalPatients = allPatients.length;
//         const minorPatients = allPatients.filter((p) => {
//           if (!p.birth_date) return false;
//           const age = calculateAge(p.birth_date);
//           return age < 18;
//         }).length;

//         setStats((prev) => ({ ...prev, totalPatients, minorPatients }));
//       }

//       // Obtener consultas recientes
//       const { data: consultationsData, error: consultationsError } =
//         await supabase
//           .from("consultations")
//           .select(
//             `
//           *,
//           medical_histories!inner(
//             patient_id,
//             patients!inner(full_name)
//           )
//         `
//           )
//           .eq("doctor_id", doctorId)
//           .order("consultation_date", { ascending: false })
//           .limit(5);

//       if (!consultationsError && consultationsData) {
//         setRecentConsultations(consultationsData);

//         // Calcular consultas de hoy y esta semana
//         const today = new Date();
//         const startOfDay = new Date(
//           today.getFullYear(),
//           today.getMonth(),
//           today.getDate()
//         );
//         const startOfWeek = new Date(today);
//         startOfWeek.setDate(today.getDate() - today.getDay());

//         const consultationsToday = consultationsData.filter(
//           (c) => new Date(c.consultation_date) >= startOfDay
//         ).length;

//         const consultationsThisWeek = consultationsData.filter(
//           (c) => new Date(c.consultation_date) >= startOfWeek
//         ).length;

//         setStats((prev) => ({
//           ...prev,
//           consultationsToday,
//           consultationsThisWeek,
//         }));
//       }
//     } catch (error: any) {
//       console.error("Error loading dashboard data:", error);
//     }
//   };

//   const searchPatients = async () => {
//     if (!doctor || !searchTerm.trim()) return;

//     try {
//       const { data, error } = await supabase
//         .from("patients")
//         .select("*")
//         .eq("doctor_id", doctor.id)
//         .eq("is_active", true)
//         .or(
//           `full_name.ilike.%${searchTerm}%,cedula.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
//         )
//         .limit(5);

//       if (error) throw error;
//       setSearchResults(data || []);
//     } catch (error: any) {
//       console.error("Error searching patients:", error);
//     }
//   };

//   const calculateAge = (birthDate: string): number => {
//     if (!birthDate) return 0;
//     const today = new Date();
//     const birth = new Date(birthDate);
//     let age = today.getFullYear() - birth.getFullYear();
//     const monthDiff = today.getMonth() - birth.getMonth();
//     if (
//       monthDiff < 0 ||
//       (monthDiff === 0 && today.getDate() < birth.getDate())
//     ) {
//       age--;
//     }
//     return age;
//   };

//   const handleLogout = async () => {
//     await supabase.auth.signOut();
//     router.push("/");
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Cargando dashboard...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <header className="bg-white shadow-sm">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between items-center py-6">
//             <div>
//               <h1 className="text-2xl font-bold text-gray-900">
//                 Bienvenido, {doctor?.gender === "female" ? "Dra." : "Dr."}{" "}
//                 {doctor?.full_name}
//               </h1>
//               <p className="text-gray-600">
//                 {doctor?.specialty || "Médico General"}
//               </p>
//             </div>
//             <div className="flex items-center space-x-4">
//               <Link href="/dashboard/profile">
//                 <Button variant="outline" size="sm">
//                   <User className="h-4 w-4 mr-2" />
//                   Perfil
//                 </Button>
//               </Link>
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
//         {/* Estadísticas */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center">
//                 <Users className="h-8 w-8 text-blue-600" />
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-600">
//                     Total Pacientes
//                   </p>
//                   <p className="text-2xl font-bold">{stats.totalPatients}</p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center">
//                 <UserCheck className="h-8 w-8 text-green-600" />
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-600">
//                     Menores de Edad
//                   </p>
//                   <p className="text-2xl font-bold">{stats.minorPatients}</p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center">
//                 <Stethoscope className="h-8 w-8 text-purple-600" />
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-600">
//                     Consultas Hoy
//                   </p>
//                   <p className="text-2xl font-bold">
//                     {stats.consultationsToday}
//                   </p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center">
//                 <Activity className="h-8 w-8 text-orange-600" />
//                 <div className="ml-4">
//                   <p className="text-sm font-medium text-gray-600">
//                     Esta Semana
//                   </p>
//                   <p className="text-2xl font-bold">
//                     {stats.consultationsThisWeek}
//                   </p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Búsqueda rápida de pacientes */}
//         <Card className="mb-8">
//           <CardHeader>
//             <CardTitle className="flex items-center">
//               <Search className="h-5 w-5 mr-2" />
//               Búsqueda Rápida de Pacientes
//             </CardTitle>
//             <CardDescription>
//               Busca pacientes por nombre, cédula o teléfono
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//               <Input
//                 placeholder="Buscar pacientes..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10"
//               />
//             </div>
//             {searchResults.length > 0 && (
//               <div className="mt-4 space-y-2">
//                 {searchResults.map((patient) => {
//                   const age = patient.birth_date
//                     ? calculateAge(patient.birth_date)
//                     : null;
//                   const isMinor = age !== null && age < 18;

//                   return (
//                     <div
//                       key={patient.id}
//                       className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
//                     >
//                       <div className="flex items-center">
//                         <div>
//                           <p className="font-medium">{patient.full_name}</p>
//                           <div className="flex items-center space-x-2 text-sm text-gray-600">
//                             {patient.cedula && (
//                               <span>CI: {patient.cedula}</span>
//                             )}
//                             {age !== null && (
//                               <span className="flex items-center">
//                                 {age} años
//                                 {isMinor && (
//                                   <Badge
//                                     variant="secondary"
//                                     className="ml-1 text-xs"
//                                   >
//                                     Menor
//                                   </Badge>
//                                 )}
//                               </span>
//                             )}
//                           </div>
//                         </div>
//                       </div>
//                       <div className="flex space-x-2">
//                         <Link href={`/dashboard/patients/${patient.id}`}>
//                           <Button variant="outline" size="sm">
//                             <Eye className="h-4 w-4 mr-1" />
//                             Ver
//                           </Button>
//                         </Link>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </CardContent>
//         </Card>

//         {/* Acciones rápidas */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
//           <Card className="hover:shadow-lg transition-shadow cursor-pointer">
//             <Link href="/dashboard/patients">
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <Users className="h-6 w-6 text-blue-600 mr-2" />
//                   Mis Pacientes
//                 </CardTitle>
//                 <CardDescription>
//                   Ver y gestionar todos los pacientes
//                 </CardDescription>
//               </CardHeader>
//             </Link>
//           </Card>

//           <Card className="hover:shadow-lg transition-shadow cursor-pointer">
//             <Link href="/dashboard/patients?action=new">
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <Plus className="h-6 w-6 text-green-600 mr-2" />
//                   Nuevo Paciente
//                 </CardTitle>
//                 <CardDescription>Registrar un nuevo paciente</CardDescription>
//               </CardHeader>
//             </Link>
//           </Card>

//           <Card className="hover:shadow-lg transition-shadow cursor-pointer">
//             <Link href="/dashboard/prescriptions">
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <FileText className="h-6 w-6 text-purple-600 mr-2" />
//                   Recetas
//                 </CardTitle>
//                 <CardDescription>Gestionar recetas médicas</CardDescription>
//               </CardHeader>
//             </Link>
//           </Card>

//           <Card className="hover:shadow-lg transition-shadow cursor-pointer">
//             <Link href="/dashboard/profile">
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <User className="h-6 w-6 text-orange-600 mr-2" />
//                   Mi Perfil
//                 </CardTitle>
//                 <CardDescription>
//                   Actualizar información personal
//                 </CardDescription>
//               </CardHeader>
//             </Link>
//           </Card>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//           {/* Pacientes recientes */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <Users className="h-6 w-6 text-gray-600 mr-2" />
//                 Pacientes Recientes
//               </CardTitle>
//               <CardDescription>Últimos 5 pacientes registrados</CardDescription>
//             </CardHeader>
//             <CardContent>
//               {recentPatients.length === 0 ? (
//                 <div className="text-center py-8">
//                   <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                   <p className="text-gray-600">
//                     No hay pacientes registrados aún
//                   </p>
//                   <Link href="/dashboard/patients?action=new">
//                     <Button className="mt-4">
//                       <Plus className="h-4 w-4 mr-2" />
//                       Registrar Primer Paciente
//                     </Button>
//                   </Link>
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                   {recentPatients.map((patient) => {
//                     const age = patient.birth_date
//                       ? calculateAge(patient.birth_date)
//                       : null;
//                     const isMinor = age !== null && age < 18;

//                     return (
//                       <div
//                         key={patient.id}
//                         className="flex items-center justify-between p-4 border rounded-lg"
//                       >
//                         <div>
//                           <h3 className="font-medium">{patient.full_name}</h3>
//                           <div className="flex items-center space-x-2 text-sm text-gray-600">
//                             <Calendar className="h-3 w-3" />
//                             <span>
//                               {new Date(patient.created_at).toLocaleDateString(
//                                 "es-ES"
//                               )}
//                             </span>
//                             {age !== null && (
//                               <>
//                                 <span>•</span>
//                                 <span>{age} años</span>
//                                 {isMinor && (
//                                   <Badge
//                                     variant="secondary"
//                                     className="text-xs"
//                                   >
//                                     Menor
//                                   </Badge>
//                                 )}
//                               </>
//                             )}
//                           </div>
//                         </div>
//                         <Link href={`/dashboard/patients/${patient.id}`}>
//                           <Button variant="outline" size="sm">
//                             <Eye className="h-4 w-4 mr-1" />
//                             Ver
//                           </Button>
//                         </Link>
//                       </div>
//                     );
//                   })}
//                   <div className="text-center pt-4">
//                     <Link href="/dashboard/patients">
//                       <Button variant="outline">Ver Todos los Pacientes</Button>
//                     </Link>
//                   </div>
//                 </div>
//               )}
//             </CardContent>
//           </Card>

//           {/* Consultas recientes */}
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <Stethoscope className="h-6 w-6 text-gray-600 mr-2" />
//                 Consultas Recientes
//               </CardTitle>
//               <CardDescription>Últimas 5 consultas realizadas</CardDescription>
//             </CardHeader>
//             <CardContent>
//               {recentConsultations.length === 0 ? (
//                 <div className="text-center py-8">
//                   <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                   <p className="text-gray-600">
//                     No hay consultas registradas aún
//                   </p>
//                   <p className="text-sm text-gray-500 mt-2">
//                     Las consultas se crean desde la historia clínica de cada
//                     paciente
//                   </p>
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                   {recentConsultations.map((consultation) => (
//                     <div
//                       key={consultation.id}
//                       className="flex items-center justify-between p-4 border rounded-lg"
//                     >
//                       <div>
//                         <h3 className="font-medium">
//                           {(consultation as any).medical_histories?.patients
//                             ?.full_name || "Paciente"}
//                         </h3>
//                         <p className="text-sm text-gray-600 mb-1">
//                           {consultation.reason_for_visit}
//                         </p>
//                         <div className="flex items-center text-xs text-gray-500">
//                           <Clock className="h-3 w-3 mr-1" />
//                           {new Date(
//                             consultation.consultation_date
//                           ).toLocaleDateString("es-ES", {
//                             month: "short",
//                             day: "numeric",
//                             hour: "2-digit",
//                             minute: "2-digit",
//                           })}
//                         </div>
//                       </div>
//                       <Link
//                         href={`/dashboard/consultations/${consultation.id}`}
//                       >
//                         <Button variant="outline" size="sm">
//                           <Eye className="h-4 w-4" />
//                         </Button>
//                       </Link>
//                     </div>
//                   ))}
//                   <div className="text-center pt-4">
//                     <Link href="/dashboard/patients">
//                       <Button variant="outline">Ver Historias Clínicas</Button>
//                     </Link>
//                   </div>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </div>
//       </main>
//     </div>
//   );
// }

// "use client"

// import { useEffect, useState } from "react"
// import { useRouter } from "next/navigation"
// import Link from "next/link"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { FileText, Plus, User, LogOut, Eye } from "lucide-react"
// import { supabase, type Doctor, type Prescription } from "@/lib/supabase"

// export default function DashboardPage() {
//   const router = useRouter()
//   const [doctor, setDoctor] = useState<Doctor | null>(null)
//   const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
//   const [loading, setLoading] = useState(true)

//   useEffect(() => {
//     checkUser()
//   }, [])

//   const checkUser = async () => {
//     try {
//       const {
//         data: { user },
//       } = await supabase.auth.getUser()

//       if (!user) {
//         router.push("/login")
//         return
//       }

//       // Obtener datos del médico
//       const { data: doctorData, error: doctorError } = await supabase
//         .from("doctors")
//         .select("*")
//         .eq("id", user.id)
//         .single()

//       if (doctorError) throw doctorError
//       setDoctor(doctorData)

//       // Obtener recetas recientes
//       const { data: prescriptionsData, error: prescriptionsError } = await supabase
//         .from("prescriptions")
//         .select("*")
//         .eq("doctor_id", user.id)
//         .order("created_at", { ascending: false })
//         .limit(5)

//       if (prescriptionsError) throw prescriptionsError
//       setPrescriptions(prescriptionsData || [])
//     } catch (error: any) {
//       console.error("Error:", error.message)
//     } finally {
//       setLoading(false)
//     }
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
//           <p className="mt-4 text-gray-600">Cargando...</p>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <header className="bg-white shadow-sm">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between items-center py-6">
//             <div>
//               <h1 className="text-2xl font-bold text-gray-900">
//                 Bienvenido, {doctor?.gender === "female" ? "Dra." : "Dr."} {doctor?.full_name}
//               </h1>
//               <p className="text-gray-600">{doctor?.specialty || "Médico General"}</p>
//             </div>
//             <div className="flex items-center space-x-4">
//               <Link href="/dashboard/profile">
//                 <Button variant="outline" size="sm">
//                   <User className="h-4 w-4 mr-2" />
//                   Perfil
//                 </Button>
//               </Link>
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
//         {/* Quick Actions */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//           <Card className="hover:shadow-lg transition-shadow cursor-pointer">
//             <Link href="/dashboard/prescriptions/new">
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <Plus className="h-6 w-6 text-green-600 mr-2" />
//                   Nueva Receta
//                 </CardTitle>
//                 <CardDescription>Crear una nueva receta médica</CardDescription>
//               </CardHeader>
//             </Link>
//           </Card>

//           <Card className="hover:shadow-lg transition-shadow cursor-pointer">
//             <Link href="/dashboard/prescriptions">
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <Eye className="h-6 w-6 text-blue-600 mr-2" />
//                   Ver Recetas
//                 </CardTitle>
//                 <CardDescription>Gestionar recetas existentes</CardDescription>
//               </CardHeader>
//             </Link>
//           </Card>

//           <Card className="hover:shadow-lg transition-shadow cursor-pointer">
//             <Link href="/dashboard/profile">
//               <CardHeader>
//                 <CardTitle className="flex items-center">
//                   <User className="h-6 w-6 text-purple-600 mr-2" />
//                   Mi Perfil
//                 </CardTitle>
//                 <CardDescription>Actualizar información personal</CardDescription>
//               </CardHeader>
//             </Link>
//           </Card>
//         </div>

//         {/* Recent Prescriptions */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center">
//               <FileText className="h-6 w-6 text-gray-600 mr-2" />
//               Recetas Recientes
//             </CardTitle>
//             <CardDescription>Últimas 5 recetas creadas</CardDescription>
//           </CardHeader>
//           <CardContent>
//             {prescriptions.length === 0 ? (
//               <div className="text-center py-8">
//                 <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                 <p className="text-gray-600">No hay recetas creadas aún</p>
//                 <Link href="/dashboard/prescriptions/new">
//                   <Button className="mt-4">
//                     <Plus className="h-4 w-4 mr-2" />
//                     Crear Primera Receta
//                   </Button>
//                 </Link>
//               </div>
//             ) : (
//               <div className="space-y-4">
//                 {prescriptions.map((prescription) => (
//                   <div key={prescription.id} className="flex items-center justify-between p-4 border rounded-lg">
//                     <div>
//                       <h3 className="font-medium">{prescription.patient_name}</h3>
//                       <p className="text-sm text-gray-600">
//                         {new Date(prescription.date_prescribed).toLocaleDateString("es-ES")}
//                       </p>
//                     </div>
//                     <Link href={`/dashboard/prescriptions/${prescription.id}`}>
//                       <Button variant="outline" size="sm">
//                         Ver Detalle
//                       </Button>
//                     </Link>
//                   </div>
//                 ))}
//                 <div className="text-center pt-4">
//                   <Link href="/dashboard/prescriptions">
//                     <Button variant="outline">Ver Todas las Recetas</Button>
//                   </Link>
//                 </div>
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </main>
//     </div>
//   )
// }
