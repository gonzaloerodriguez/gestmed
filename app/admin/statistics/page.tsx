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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Users, Calendar, TrendingUp, BarChart3 } from "lucide-react";
import { supabase, type Doctor, type Admin } from "@/lib/supabase";
import { useAuthGuard } from "@/lib/auth-guard";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";

interface ConsultationStats {
  totalConsultations: number;
  weeklyConsultations: number;
  monthlyConsultations: number;
  dailyConsultations: Array<{
    date: string;
    count: number;
  }>;
  consultationsByDoctor: Array<{
    doctorName: string;
    count: number;
  }>;
  consultationTrend: Array<{
    period: string;
    consultations: number;
  }>;
}

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
  const [stats, setStats] = useState({
    totalDoctors: 0,
    activeDoctors: 0,
    inactiveDoctors: 0,
    totalPrescriptions: 0,
  });
  const [consultationStats, setConsultationStats] = useState<ConsultationStats>(
    {
      totalConsultations: 0,
      weeklyConsultations: 0,
      monthlyConsultations: 0,
      dailyConsultations: [],
      consultationsByDoctor: [],
      consultationTrend: [],
    }
  );

  useEffect(() => {
    if (user && !authLoading) {
      loadAdminData();
    }
  }, [user, authLoading]);

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

  const loadAdminData = async () => {
    try {
      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("id", user.id)
        .single();

      if (adminError) throw adminError;
      setAdmin(adminData);

      await loadDoctors();
      await loadStats();
      await loadConsultationStats();
    } catch (error: any) {
      alert("Error cargando la información del admin");
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
      alert("Error cargando los doctores");
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
      alert("Error cargando estadisticas");
    }
  };

  const loadConsultationStats = async () => {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Total consultas
      const { count: totalConsultations } = await supabase
        .from("consultations")
        .select("*", { count: "exact", head: true });

      // Consultas de la última semana
      const { count: weeklyConsultations } = await supabase
        .from("consultations")
        .select("*", { count: "exact", head: true })
        .gte("consultation_date", oneWeekAgo.toISOString());

      // Consultas del último mes
      const { count: monthlyConsultations } = await supabase
        .from("consultations")
        .select("*", { count: "exact", head: true })
        .gte("consultation_date", oneMonthAgo.toISOString());

      // Consultas por día (últimos 7 días)
      const { data: dailyData } = await supabase
        .from("consultations")
        .select("consultation_date")
        .gte("consultation_date", oneWeekAgo.toISOString())
        .order("consultation_date", { ascending: true });

      // Procesar datos diarios
      const dailyConsultations = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split("T")[0];
        const count =
          dailyData?.filter((item) =>
            item.consultation_date.startsWith(dateStr)
          ).length || 0;

        dailyConsultations.push({
          date: date.toLocaleDateString("es-ES", {
            weekday: "short",
            day: "numeric",
          }),
          count,
        });
      }

      // Consultas por doctor (top 5)
      const { data: doctorConsultations } = await supabase
        .from("consultations")
        .select(
          `
          doctor_id,
          doctors!inner(full_name)
        `
        )
        .gte("consultation_date", oneMonthAgo.toISOString());

      const doctorCounts =
        doctorConsultations?.reduce((acc: any, item: any) => {
          const doctorName = item.doctors.full_name;
          acc[doctorName] = (acc[doctorName] || 0) + 1;
          return acc;
        }, {}) || {};

      const consultationsByDoctor = Object.entries(doctorCounts)
        .map(([doctorName, count]) => ({ doctorName, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Tendencia mensual (últimos 6 meses)
      const consultationTrend = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(
          now.getFullYear(),
          now.getMonth() - i + 1,
          1
        );

        const { count } = await supabase
          .from("consultations")
          .select("*", { count: "exact", head: true })
          .gte("consultation_date", date.toISOString())
          .lt("consultation_date", nextMonth.toISOString());

        consultationTrend.push({
          period: date.toLocaleDateString("es-ES", {
            month: "short",
            year: "2-digit",
          }),
          consultations: count || 0,
        });
      }

      setConsultationStats({
        totalConsultations: totalConsultations || 0,
        weeklyConsultations: weeklyConsultations || 0,
        monthlyConsultations: monthlyConsultations || 0,
        dailyConsultations,
        consultationsByDoctor,
        consultationTrend,
      });
    } catch (error: any) {
      alert("Error cargando las estadisticas de consultas");
    }
  };

  const doctorStatusData = [
    { name: "Activos", value: stats.activeDoctors, color: "#10b981" },
    { name: "Inactivos", value: stats.inactiveDoctors, color: "#ef4444" },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-foreground flex items-center justify-center">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Médicos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDoctors}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeDoctors} activos, {stats.inactiveDoctors} inactivos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Consultas
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {consultationStats.totalConsultations}
              </div>
              <p className="text-xs text-muted-foreground">
                Todas las consultas registradas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Consultas (7 días)
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {consultationStats.weeklyConsultations}
              </div>
              <p className="text-xs text-muted-foreground">Última semana</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Consultas (30 días)
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {consultationStats.monthlyConsultations}
              </div>
              <p className="text-xs text-muted-foreground">Último mes</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Consultas Diarias (Última Semana)</CardTitle>
              <CardDescription>
                Número de consultas por día en los últimos 7 días
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  count: {
                    label: "Consultas",
                    color: "hsl(var(--chart-1))",
                  },
                }}
                className="h-[200px]"
              >
                <AreaChart data={consultationStats.dailyConsultations}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--color-count)"
                    fill="var(--color-count)"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado de Médicos</CardTitle>
              <CardDescription>
                Distribución de médicos activos vs inactivos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  activos: {
                    label: "Activos",
                    color: "#10b981",
                  },
                  inactivos: {
                    label: "Inactivos",
                    color: "#ef4444",
                  },
                }}
                className="h-[200px]"
              >
                <PieChart>
                  <Pie
                    data={doctorStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {doctorStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Consultas</CardTitle>
              <CardDescription>
                Evolución mensual de consultas (últimos 6 meses)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  consultations: {
                    label: "Consultas",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[200px]"
              >
                <LineChart data={consultationStats.consultationTrend}>
                  <XAxis dataKey="period" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="consultations"
                    stroke="var(--color-consultations)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Médicos por Consultas</CardTitle>
              <CardDescription>
                Médicos con más consultas en el último mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  count: {
                    label: "Consultas",
                    color: "hsl(var(--chart-3))",
                  },
                }}
                className="h-[200px]"
              >
                <BarChart
                  data={consultationStats.consultationsByDoctor}
                  layout="horizontal"
                >
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="doctorName"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
