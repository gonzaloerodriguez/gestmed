"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, User, Mail, Calendar, Shield, FileText, Activity, Download } from "lucide-react"
import { supabase, type Doctor, type Prescription, type Admin } from "@/lib/supabase"

interface DoctorDetailPageProps {
  params: {
    id: string
  }
}

export default function DoctorDetailPage({ params }: DoctorDetailPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [stats, setStats] = useState({
    totalPrescriptions: 0,
    activePrescriptions: 0,
    thisMonthPrescriptions: 0,
  })

  useEffect(() => {
    checkAdminAndLoadData()
  }, [params.id])

  const checkAdminAndLoadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      // Verificar si es administrador
      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("id", user.id)
        .single()

      if (adminError || !adminData) {
        alert("Acceso denegado. No tienes permisos de administrador.")
        router.push("/dashboard")
        return
      }

      setAdmin(adminData)

      // Cargar datos del médico
      await loadDoctor()
      await loadPrescriptions()
    } catch (error: any) {
      console.error("Error:", error.message)
      router.push("/admin")
    } finally {
      setLoading(false)
    }
  }

  const loadDoctor = async () => {
    try {
      const { data, error } = await supabase.from("doctors").select("*").eq("id", params.id).single()

      if (error) throw error

      setDoctor(data)
    } catch (error: any) {
      console.error("Error loading doctor:", error.message)
      router.push("/admin")
    }
  }

  const loadPrescriptions = async () => {
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("doctor_id", params.id)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error

      setPrescriptions(data || [])

      // Calcular estadísticas
      const { count: totalPrescriptions } = await supabase
        .from("prescriptions")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", params.id)

      const { count: activePrescriptions } = await supabase
        .from("prescriptions")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", params.id)
        .eq("is_active", true)

      // Recetas de este mes
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const { count: thisMonthPrescriptions } = await supabase
        .from("prescriptions")
        .select("*", { count: "exact", head: true })
        .eq("doctor_id", params.id)
        .gte("created_at", firstDayOfMonth)

      setStats({
        totalPrescriptions: totalPrescriptions || 0,
        activePrescriptions: activePrescriptions || 0,
        thisMonthPrescriptions: thisMonthPrescriptions || 0,
      })
    } catch (error: any) {
      console.error("Error loading prescriptions:", error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información del médico...</p>
        </div>
      </div>
    )
  }

  if (!doctor || !admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Médico no encontrado</p>
          <Button onClick={() => router.push("/admin")} className="mt-4">
            Volver al Panel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => router.push("/admin")} className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {doctor.gender === "female" ? "Dra." : "Dr."} {doctor.full_name}
                </h1>
                <p className="text-gray-600">Información detallada del médico</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={doctor.is_active ? "default" : "secondary"}>
                {doctor.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Información Personal */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Nombre Completo</p>
                  <p className="font-medium">{doctor.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cédula de Identidad</p>
                  <p className="font-medium">{doctor.cedula}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sexo</p>
                  <p className="font-medium">{doctor.gender === "female" ? "Femenino" : "Masculino"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Correo Electrónico</p>
                  <p className="font-medium flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {doctor.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Número de Matrícula</p>
                  <p className="font-medium flex items-center">
                    <Shield className="h-4 w-4 mr-1" />
                    {doctor.license_number}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Especialidad</p>
                  <p className="font-medium">{doctor.specialty || "Médico General"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha de Registro</p>
                  <p className="font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(doctor.created_at).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Documentos */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Documentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {doctor.signature_stamp_url && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Firma y Sello</p>
                    <div className="border rounded-lg p-2 bg-gray-50">
                      <img
                        src={doctor.signature_stamp_url || "/placeholder.svg"}
                        alt="Firma y sello"
                        className="max-h-20 mx-auto"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    </div>
                  </div>
                )}
                {doctor.document_url && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Documento de Credencial</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doctor.document_url!, "_blank")}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Ver Documento
                    </Button>
                  </div>
                )}
                {!doctor.signature_stamp_url && !doctor.document_url && (
                  <p className="text-sm text-gray-500">No hay documentos cargados</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Estadísticas y Recetas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Recetas</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPrescriptions}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recetas Activas</CardTitle>
                  <Activity className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.activePrescriptions}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.thisMonthPrescriptions}</div>
                </CardContent>
              </Card>
            </div>

            {/* Recetas Recientes */}
            <Card>
              <CardHeader>
                <CardTitle>Recetas Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                {prescriptions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No hay recetas creadas</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Paciente</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Diagnóstico</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {prescriptions.map((prescription) => (
                          <TableRow key={prescription.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{prescription.patient_name}</div>
                                {prescription.patient_age && (
                                  <div className="text-sm text-gray-500">{prescription.patient_age} años</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="text-sm">
                                  {new Date(prescription.date_prescribed).toLocaleDateString("es-ES")}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(prescription.created_at).toLocaleTimeString("es-ES", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate">{prescription.diagnosis || "Sin diagnóstico"}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={prescription.is_active ? "default" : "secondary"}>
                                {prescription.is_active ? "Activa" : "Inactiva"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
