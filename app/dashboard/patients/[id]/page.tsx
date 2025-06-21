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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  User,
  Heart,
  Calendar,
  Phone,
  MapPin,
  UserCheck,
  Plus,
  Eye,
  Edit,
  FileText,
  Stethoscope,
  Pill,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabase/supabase";
import { ConsultationForm } from "@/components/forms/ConsultationForm";
import { PrescriptionFromConsultation } from "@/components/prescription-from-consultation";
import type {
  Patient,
  PatientRepresentative,
  MedicalHistory,
} from "@/lib/supabase/supabase";
import type { Doctor } from "@/lib/supabase/types/doctor";
import type { Consultation } from "@/lib/supabase/types/consultations";
import type { Prescription } from "@/lib/supabase/types/prescription";

interface PatientDetailPageProps {
  params: Promise<{ id: string }>;
}

// Función para parsear signos vitales
const parseVitalSigns = (vitalSigns: any) => {
  if (!vitalSigns) return null;

  try {
    // Si es string, parsearlo
    const parsed =
      typeof vitalSigns === "string" ? JSON.parse(vitalSigns) : vitalSigns;

    // Filtrar valores nulos o vacíos
    const filtered = Object.entries(parsed).filter(
      ([key, value]) => value !== null && value !== undefined && value !== ""
    );

    return filtered.length > 0 ? Object.fromEntries(filtered) : null;
  } catch (error) {
    console.error("Error parsing vital signs:", error);
    return null;
  }
};

// Función para obtener label amigable y unidades
const getVitalSignInfo = (key: string, value: any) => {
  const vitalSignsMap: Record<
    string,
    { label: string; unit: string; color: string }
  > = {
    bp: {
      label: "Presión Arterial",
      unit: "mmHg",
      color: "bg-red-100 text-red-800",
    },
    temp: {
      label: "Temperatura",
      unit: "°C",
      color: "bg-orange-100 text-orange-800",
    },
    heart_rate: {
      label: "Frecuencia Cardíaca",
      unit: "lpm",
      color: "bg-pink-100 text-pink-800",
    },
    respiratory_rate: {
      label: "Frecuencia Respiratoria",
      unit: "rpm",
      color: "bg-blue-100 text-blue-800",
    },
    height: {
      label: "Altura",
      unit: "cm",
      color: "bg-green-100 text-green-800",
    },
    weight: {
      label: "Peso",
      unit: "kg",
      color: "bg-purple-100 text-purple-800",
    },
    oxygen_saturation: {
      label: "Saturación O2",
      unit: "%",
      color: "bg-cyan-100 text-cyan-800",
    },
    glucose: {
      label: "Glucosa",
      unit: "mg/dL",
      color: "bg-yellow-100 text-yellow-800",
    },
  };

  const info = vitalSignsMap[key] || {
    label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    unit: "",
    color: "bg-gray-100 text-gray-800",
  };

  return {
    ...info,
    displayValue: `${value}${info.unit ? ` ${info.unit}` : ""}`,
  };
};

export default function PatientDetailPage({ params }: PatientDetailPageProps) {
  const router = useRouter();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [representatives, setRepresentatives] = useState<
    PatientRepresentative[]
  >([]);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory | null>(
    null
  );
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [selectedConsultation, setSelectedConsultation] =
    useState<Consultation | null>(null);

  // Resolver params
  useEffect(() => {
    const resolveParams = async () => {
      try {
        const resolvedParams = await params;
        setPatientId(resolvedParams.id);
      } catch (error) {
        console.error("Error resolviendo parámetros:", error);
        router.push("/dashboard/patients");
      }
    };
    resolveParams();
  }, [params, router]);

  // Cargar datos cuando patientId esté disponible
  useEffect(() => {
    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

  const loadPatientData = async () => {
    if (!patientId) return;

    try {
      setLoading(true);

      // Cargar doctor actual
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("*")
        .eq("id", user.id)
        .single();

      if (doctorError) throw doctorError;
      setDoctor(doctorData);

      // Cargar paciente
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .eq("doctor_id", user.id)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Cargar representantes
      const { data: representativesData, error: representativesError } =
        await supabase
          .from("patient_representatives")
          .select("*")
          .eq("patient_id", patientId)
          .order("is_primary", { ascending: false });

      if (representativesError) throw representativesError;
      setRepresentatives(representativesData || []);

      // Cargar historia clínica
      const { data: historyData, error: historyError } = await supabase
        .from("medical_histories")
        .select("*")
        .eq("patient_id", patientId)
        .single();

      if (historyError) throw historyError;
      setMedicalHistory(historyData);

      // Cargar consultas
      const { data: consultationsData, error: consultationsError } =
        await supabase
          .from("consultations")
          .select("*")
          .eq("medical_history_id", historyData.id)
          .order("consultation_date", { ascending: false });

      if (consultationsError) throw consultationsError;
      setConsultations(consultationsData || []);

      // CORREGIDO: Cargar TODAS las prescripciones del paciente
      const { data: prescriptionsData, error: prescriptionsError } =
        await supabase
          .from("prescriptions")
          .select("*")
          .or(
            `medical_history_id.eq.${historyData.id},and(patient_name.eq.${patientData.full_name},doctor_id.eq.${user.id})`
          )
          .order("date_prescribed", { ascending: false });

      if (prescriptionsError) {
        console.error("Error cargando prescripciones:", prescriptionsError);
        // Fallback: cargar por medical_history_id solamente
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("prescriptions")
          .select("*")
          .eq("medical_history_id", historyData.id)
          .order("date_prescribed", { ascending: false });

        if (fallbackError) throw fallbackError;
        setPrescriptions(fallbackData || []);
      } else {
        setPrescriptions(prescriptionsData || []);
      }

      console.log("Datos cargados:", {
        patient: patientData.full_name,
        medicalHistoryId: historyData.id,
        prescriptionsCount: prescriptionsData?.length || 0,
      });
    } catch (error: any) {
      console.error("Error cargando datos del paciente:", error);
      alert("Error cargando información del paciente");
      router.push("/dashboard/patients");
    } finally {
      setLoading(false);
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

  const handleConsultationCreated = () => {
    setShowConsultationForm(false);
    loadPatientData();
  };

  const handlePrescriptionCreated = () => {
    setShowPrescriptionForm(false);
    setSelectedConsultation(null);
    loadPatientData();
  };

  // Función para crear prescripción directa
  const handleCreateDirectPrescription = () => {
    if (!medicalHistory || !patient || !doctor) return;
    router.push(
      `/dashboard/prescriptions/new?patientId=${patient.id}&medicalHistoryId=${medicalHistory.id}`
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando historia clínica...</p>
        </div>
      </div>
    );
  }

  if (!patient || !medicalHistory || !doctor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Paciente no encontrado</p>
          <Button
            onClick={() => router.push("/dashboard/patients")}
            className="mt-4"
          >
            Volver a Pacientes
          </Button>
        </div>
      </div>
    );
  }

  const age = patient.birth_date ? calculateAge(patient.birth_date) : null;
  const isMinor = age !== null && age < 18;

  if (showConsultationForm) {
    return (
      <div className="container mx-auto py-8">
        <ConsultationForm
          medicalHistoryId={medicalHistory.id}
          doctorId={doctor.id}
          patient={patient}
          onSuccess={handleConsultationCreated}
          onCancel={() => setShowConsultationForm(false)}
        />
      </div>
    );
  }

  if (showPrescriptionForm && selectedConsultation) {
    return (
      <div className="container mx-auto py-8">
        <PrescriptionFromConsultation
          consultation={selectedConsultation}
          patient={patient}
          doctor={doctor}
          medicalHistoryId={medicalHistory.id}
          onSuccess={handlePrescriptionCreated}
          onCancel={() => {
            setShowPrescriptionForm(false);
            setSelectedConsultation(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-end mb-8">
        <div className="flex space-x-2">
          <Button onClick={() => setShowConsultationForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Consulta
          </Button>
          <Button variant="outline" onClick={handleCreateDirectPrescription}>
            <FileText className="h-4 w-4 mr-2" />
            Nueva Receta
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/dashboard/patients/${patient.id}/edit`)
            }
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* Información básica del paciente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Nombre Completo</p>
              <p className="font-medium">{patient.full_name}</p>
            </div>
            {patient.cedula && (
              <div>
                <p className="text-sm text-gray-600">Cédula</p>
                <p className="font-medium">{patient.cedula}</p>
              </div>
            )}
            {age !== null && (
              <div>
                <p className="text-sm text-gray-600">Edad</p>
                <div className="flex items-center">
                  <p className="font-medium">{age} años</p>
                  {isMinor && (
                    <Badge variant="secondary" className="ml-2">
                      Menor de edad
                    </Badge>
                  )}
                </div>
              </div>
            )}
            {patient.birth_date && (
              <div>
                <p className="text-sm text-gray-600">Fecha de Nacimiento</p>
                <p className="font-medium">
                  {new Date(patient.birth_date).toLocaleDateString("es-ES")}
                </p>
              </div>
            )}
            {patient.phone && (
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                  <p className="font-medium">{patient.phone}</p>
                </div>
              </div>
            )}
            {patient.address && (
              <div>
                <p className="text-sm text-gray-600">Dirección</p>
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                  <p className="font-medium">{patient.address}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Representantes */}
        {representatives.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="h-5 w-5 mr-2" />
                Representante{representatives.length > 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {representatives.map((rep) => (
                <div key={rep.id} className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{rep.full_name}</p>
                    {rep.is_primary && (
                      <Badge variant="default" className="text-xs">
                        Principal
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 capitalize">
                    {rep.relationship}
                  </p>
                  {rep.phone && (
                    <div className="flex items-center mt-1">
                      <Phone className="h-3 w-3 mr-1 text-gray-400" />
                      <p className="text-sm">{rep.phone}</p>
                    </div>
                  )}
                  {rep.cedula && (
                    <p className="text-xs text-gray-500">CI: {rep.cedula}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Información médica básica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Heart className="h-5 w-5 mr-2" />
              Información Médica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {medicalHistory.blood_type && (
              <div>
                <p className="text-sm text-gray-600">Tipo de Sangre</p>
                <Badge variant="outline" className="font-medium">
                  {medicalHistory.blood_type}
                </Badge>
              </div>
            )}
            {medicalHistory.allergies && (
              <div>
                <p className="text-sm text-gray-600">Alergias</p>
                <div className="flex items-start">
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-500 mt-0.5" />
                  <p className="text-sm">{medicalHistory.allergies}</p>
                </div>
              </div>
            )}
            {medicalHistory.chronic_conditions && (
              <div>
                <p className="text-sm text-gray-600">Condiciones Crónicas</p>
                <p className="text-sm">{medicalHistory.chronic_conditions}</p>
              </div>
            )}
            {medicalHistory.current_medications && (
              <div>
                <p className="text-sm text-gray-600">Medicamentos Actuales</p>
                <div className="flex items-start">
                  <Pill className="h-4 w-4 mr-2 text-blue-500 mt-0.5" />
                  <p className="text-sm">
                    {medicalHistory.current_medications}
                  </p>
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Registro</p>
              <p className="text-xs text-gray-500">
                Creado:{" "}
                {new Date(medicalHistory.created_at).toLocaleDateString(
                  "es-ES"
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para consultas y prescripciones */}
      <Tabs defaultValue="consultations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="consultations">
            <Stethoscope className="h-4 w-4 mr-2" />
            Consultas ({consultations.length})
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            <FileText className="h-4 w-4 mr-2" />
            Prescripciones ({prescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <Activity className="h-4 w-4 mr-2" />
            Historia Completa
          </TabsTrigger>
        </TabsList>

        {/* Tab: Consultas */}
        <TabsContent value="consultations">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Consultas</CardTitle>
              <CardDescription>
                {consultations.length} consulta
                {consultations.length !== 1 ? "s" : ""} registrada
                {consultations.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {consultations.length === 0 ? (
                <div className="text-center py-8">
                  <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay consultas registradas</p>
                  <Button
                    onClick={() => setShowConsultationForm(true)}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Primera Consulta
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {consultations.map((consultation) => {
                    // Parsear signos vitales
                    const vitalSigns = parseVitalSigns(
                      consultation.vital_signs
                    );

                    return (
                      <Card
                        key={consultation.id}
                        className="border-l-4 border-blue-500"
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                                <p className="text-sm text-gray-600">
                                  {new Date(
                                    consultation.consultation_date
                                  ).toLocaleDateString("es-ES", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              <h4 className="font-medium mb-2">
                                {consultation.reason_for_visit}
                              </h4>
                              {consultation.diagnosis && (
                                <p className="text-sm text-gray-700 mb-2">
                                  <strong>Diagnóstico:</strong>{" "}
                                  {consultation.diagnosis}
                                </p>
                              )}
                              {consultation.symptoms && (
                                <p className="text-sm text-gray-600 mb-2">
                                  <strong>Síntomas:</strong>{" "}
                                  {consultation.symptoms}
                                </p>
                              )}

                              {/* SIGNOS VITALES CORREGIDOS */}
                              {vitalSigns && (
                                <div className="mb-3">
                                  <p className="text-sm font-medium text-gray-700 mb-2">
                                    Signos Vitales:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(vitalSigns).map(
                                      ([key, value]) => {
                                        const vitalInfo = getVitalSignInfo(
                                          key,
                                          value
                                        );
                                        return (
                                          <Badge
                                            key={key}
                                            className={`text-xs ${vitalInfo.color} border-0`}
                                          >
                                            {vitalInfo.label}:{" "}
                                            {vitalInfo.displayValue}
                                          </Badge>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedConsultation(consultation);
                                  setShowPrescriptionForm(true);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Recetar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/consultations/${consultation.id}`
                                  )
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Prescripciones */}
        <TabsContent value="prescriptions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Historial de Prescripciones</CardTitle>
                  <CardDescription>
                    {prescriptions.length} prescripción
                    {prescriptions.length !== 1 ? "es" : ""} emitida
                    {prescriptions.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
                <Button onClick={handleCreateDirectPrescription}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Receta
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {prescriptions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    No hay prescripciones registradas
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Las prescripciones se pueden crear desde las consultas
                    médicas o directamente
                  </p>
                  <Button
                    onClick={handleCreateDirectPrescription}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Primera Receta
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Diagnóstico</TableHead>
                      <TableHead>Medicamentos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescriptions.map((prescription) => (
                      <TableRow key={prescription.id}>
                        <TableCell>
                          {new Date(
                            prescription.date_prescribed
                          ).toLocaleDateString("es-ES")}
                        </TableCell>
                        <TableCell>
                          <p className="max-w-xs truncate">
                            {prescription.diagnosis || "Sin diagnóstico"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="max-w-xs truncate">
                            {prescription.medications}
                          </p>
                        </TableCell>
                        <TableCell>
                          {prescription.medical_history_id ? (
                            <Badge variant="default" className="text-xs">
                              Vinculada
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Sin vincular
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/dashboard/prescriptions/${prescription.id}`
                              )
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historia Completa */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historia Clínica Completa</CardTitle>
              <CardDescription>
                Información médica detallada del paciente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {medicalHistory.family_history && (
                <div>
                  <h4 className="font-medium mb-2">Antecedentes Familiares</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {medicalHistory.family_history}
                  </p>
                </div>
              )}

              {medicalHistory.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notas Generales</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {medicalHistory.notes}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Resumen de Actividad</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Stethoscope className="h-6 w-6 text-blue-600" />
                      <div className="ml-3">
                        <p className="text-sm text-blue-600">Total Consultas</p>
                        <p className="text-xl font-bold text-blue-800">
                          {consultations.length}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-6 w-6 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm text-green-600">Prescripciones</p>
                        <p className="text-xl font-bold text-green-800">
                          {prescriptions.length}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="h-6 w-6 text-purple-600" />
                      <div className="ml-3">
                        <p className="text-sm text-purple-600">
                          Última Consulta
                        </p>
                        <p className="text-sm font-medium text-purple-800">
                          {consultations.length > 0
                            ? new Date(
                                consultations[0].consultation_date
                              ).toLocaleDateString("es-ES")
                            : "Nunca"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   ArrowLeft,
//   User,
//   Heart,
//   Calendar,
//   Phone,
//   MapPin,
//   UserCheck,
//   Plus,
//   Eye,
//   Edit,
//   FileText,
//   Stethoscope,
//   Pill,
//   AlertTriangle,
//   Activity,
// } from "lucide-react";
// import { supabase } from "@/lib/supabase";
// import { ConsultationForm } from "@/components/forms/ConsultationForm";
// import { PrescriptionFromConsultation } from "@/components/prescription-from-consultation";
// import type {
//   Patient,
//   PatientRepresentative,
//   MedicalHistory,
//   Consultation,
//   Prescription,
//   Doctor,
// } from "@/lib/supabase";

// interface PatientDetailPageProps {
//   params: Promise<{ id: string }>;
// }

// export default function PatientDetailPage({ params }: PatientDetailPageProps) {
//   const router = useRouter();
//   const [patientId, setPatientId] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [patient, setPatient] = useState<Patient | null>(null);
//   const [representatives, setRepresentatives] = useState<
//     PatientRepresentative[]
//   >([]);
//   const [medicalHistory, setMedicalHistory] = useState<MedicalHistory | null>(
//     null
//   );
//   const [consultations, setConsultations] = useState<Consultation[]>([]);
//   const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
//   const [doctor, setDoctor] = useState<Doctor | null>(null);
//   const [showConsultationForm, setShowConsultationForm] = useState(false);
//   const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
//   const [selectedConsultation, setSelectedConsultation] =
//     useState<Consultation | null>(null);

//   // Resolver params
//   useEffect(() => {
//     const resolveParams = async () => {
//       try {
//         const resolvedParams = await params;
//         setPatientId(resolvedParams.id);
//       } catch (error) {
//         console.error("Error resolviendo parámetros:", error);
//         router.push("/dashboard/patients");
//       }
//     };
//     resolveParams();
//   }, [params, router]);

//   // Cargar datos cuando patientId esté disponible
//   useEffect(() => {
//     if (patientId) {
//       loadPatientData();
//     }
//   }, [patientId]);

//   const loadPatientData = async () => {
//     if (!patientId) return;

//     try {
//       setLoading(true);

//       // Cargar doctor actual
//       const {
//         data: { user },
//       } = await supabase.auth.getUser();
//       if (!user) throw new Error("Usuario no autenticado");

//       const { data: doctorData, error: doctorError } = await supabase
//         .from("doctors")
//         .select("*")
//         .eq("id", user.id)
//         .single();

//       if (doctorError) throw doctorError;
//       setDoctor(doctorData);

//       // Cargar paciente
//       const { data: patientData, error: patientError } = await supabase
//         .from("patients")
//         .select("*")
//         .eq("id", patientId)
//         .eq("doctor_id", user.id)
//         .single();

//       if (patientError) throw patientError;
//       setPatient(patientData);

//       // Cargar representantes
//       const { data: representativesData, error: representativesError } =
//         await supabase
//           .from("patient_representatives")
//           .select("*")
//           .eq("patient_id", patientId)
//           .order("is_primary", { ascending: false });

//       if (representativesError) throw representativesError;
//       setRepresentatives(representativesData || []);

//       // Cargar historia clínica
//       const { data: historyData, error: historyError } = await supabase
//         .from("medical_histories")
//         .select("*")
//         .eq("patient_id", patientId)
//         .single();

//       if (historyError) throw historyError;
//       setMedicalHistory(historyData);

//       // Cargar consultas
//       const { data: consultationsData, error: consultationsError } =
//         await supabase
//           .from("consultations")
//           .select("*")
//           .eq("medical_history_id", "306a26e1-5572-4d11-911d-6b63cbc1037e")
//           .order("consultation_date", { ascending: false });

//       if (consultationsError) throw consultationsError;
//       setConsultations(consultationsData || []);

//       // CORREGIDO: Cargar TODAS las prescripciones del paciente
//       // Tanto las que tienen medical_history_id como las que no
//       const { data: prescriptionsData, error: prescriptionsError } =
//         await supabase
//           .from("prescriptions")
//           .select("*")
//           .or(
//             `medical_history_id.eq.${historyData.id},and(patient_name.eq.${patientData.full_name},doctor_id.eq.${user.id})`
//           )
//           .order("date_prescribed", { ascending: false });

//       if (prescriptionsError) {
//         console.error("Error cargando prescripciones:", prescriptionsError);
//         // Fallback: cargar por medical_history_id solamente
//         const { data: fallbackData, error: fallbackError } = await supabase
//           .from("prescriptions")
//           .select("*")
//           .eq("medical_history_id", historyData.id)
//           .order("date_prescribed", { ascending: false });

//         if (fallbackError) throw fallbackError;
//         setPrescriptions(fallbackData || []);
//       } else {
//         setPrescriptions(prescriptionsData || []);
//       }

//       console.log("Datos cargados:", {
//         patient: patientData.full_name,
//         medicalHistoryId: historyData.id,
//         prescriptionsCount: prescriptionsData?.length || 0,
//       });
//     } catch (error: any) {
//       console.error("Error cargando datos del paciente:", error);
//       alert("Error cargando información del paciente");
//       router.push("/dashboard/patients");
//     } finally {
//       setLoading(false);
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

//   const handleConsultationCreated = () => {
//     setShowConsultationForm(false);
//     loadPatientData();
//   };

//   const handlePrescriptionCreated = () => {
//     setShowPrescriptionForm(false);
//     setSelectedConsultation(null);
//     loadPatientData();
//   };

//   // Función para crear prescripción directa
//   const handleCreateDirectPrescription = () => {
//     if (!medicalHistory || !patient || !doctor) return;
//     router.push(
//       `/dashboard/prescriptions/new?patientId=${patient.id}&medicalHistoryId=${medicalHistory.id}`
//     );
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Cargando historia clínica...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!patient || !medicalHistory || !doctor) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="text-center">
//           <p className="text-red-600">Paciente no encontrado</p>
//           <Button
//             onClick={() => router.push("/dashboard/patients")}
//             className="mt-4"
//           >
//             Volver a Pacientes
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   const age = patient.birth_date ? calculateAge(patient.birth_date) : null;
//   const isMinor = age !== null && age < 18;

//   if (showConsultationForm) {
//     return (
//       <div className="container mx-auto py-8">
//         <ConsultationForm
//           medicalHistoryId={medicalHistory.id}
//           doctorId={doctor.id}
//           patient={patient}
//           onSuccess={handleConsultationCreated}
//           onCancel={() => setShowConsultationForm(false)}
//         />
//       </div>
//     );
//   }

//   if (showPrescriptionForm && selectedConsultation) {
//     return (
//       <div className="container mx-auto py-8">
//         <PrescriptionFromConsultation
//           consultation={selectedConsultation}
//           patient={patient}
//           doctor={doctor}
//           medicalHistoryId={medicalHistory.id}
//           onSuccess={handlePrescriptionCreated}
//           onCancel={() => {
//             setShowPrescriptionForm(false);
//             setSelectedConsultation(null);
//           }}
//         />
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto py-8">
//       {/* Header */}
//       <div className="flex items-center justify-end mb-8">
//         <div className="flex space-x-2">
//           <Button onClick={() => setShowConsultationForm(true)}>
//             <Plus className="h-4 w-4 mr-2" />
//             Nueva Consulta
//           </Button>
//           <Button variant="outline" onClick={handleCreateDirectPrescription}>
//             <FileText className="h-4 w-4 mr-2" />
//             Nueva Receta
//           </Button>
//           <Button
//             variant="outline"
//             onClick={() =>
//               router.push(`/dashboard/patients/${patient.id}/edit`)
//             }
//           >
//             <Edit className="h-4 w-4 mr-2" />
//             Editar
//           </Button>
//         </div>
//       </div>

//       {/* Información básica del paciente */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center">
//               <User className="h-5 w-5 mr-2" />
//               Información Personal
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-3">
//             <div>
//               <p className="text-sm text-gray-600">Nombre Completo</p>
//               <p className="font-medium">{patient.full_name}</p>
//             </div>
//             {patient.cedula && (
//               <div>
//                 <p className="text-sm text-gray-600">Cédula</p>
//                 <p className="font-medium">{patient.cedula}</p>
//               </div>
//             )}
//             {age !== null && (
//               <div>
//                 <p className="text-sm text-gray-600">Edad</p>
//                 <div className="flex items-center">
//                   <p className="font-medium">{age} años</p>
//                   {isMinor && (
//                     <Badge variant="secondary" className="ml-2">
//                       Menor de edad
//                     </Badge>
//                   )}
//                 </div>
//               </div>
//             )}
//             {patient.birth_date && (
//               <div>
//                 <p className="text-sm text-gray-600">Fecha de Nacimiento</p>
//                 <p className="font-medium">
//                   {new Date(patient.birth_date).toLocaleDateString("es-ES")}
//                 </p>
//               </div>
//             )}
//             {patient.phone && (
//               <div>
//                 <p className="text-sm text-gray-600">Teléfono</p>
//                 <div className="flex items-center">
//                   <Phone className="h-4 w-4 mr-2 text-gray-400" />
//                   <p className="font-medium">{patient.phone}</p>
//                 </div>
//               </div>
//             )}
//             {patient.address && (
//               <div>
//                 <p className="text-sm text-gray-600">Dirección</p>
//                 <div className="flex items-start">
//                   <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
//                   <p className="font-medium">{patient.address}</p>
//                 </div>
//               </div>
//             )}
//           </CardContent>
//         </Card>

//         {/* Representantes */}
//         {representatives.length > 0 && (
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center">
//                 <UserCheck className="h-5 w-5 mr-2" />
//                 Representante{representatives.length > 1 ? "s" : ""}
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               {representatives.map((rep) => (
//                 <div key={rep.id} className="border-l-4 border-blue-500 pl-4">
//                   <div className="flex items-center justify-between">
//                     <p className="font-medium">{rep.full_name}</p>
//                     {rep.is_primary && (
//                       <Badge variant="default" className="text-xs">
//                         Principal
//                       </Badge>
//                     )}
//                   </div>
//                   <p className="text-sm text-gray-600 capitalize">
//                     {rep.relationship}
//                   </p>
//                   {rep.phone && (
//                     <div className="flex items-center mt-1">
//                       <Phone className="h-3 w-3 mr-1 text-gray-400" />
//                       <p className="text-sm">{rep.phone}</p>
//                     </div>
//                   )}
//                   {rep.cedula && (
//                     <p className="text-xs text-gray-500">CI: {rep.cedula}</p>
//                   )}
//                 </div>
//               ))}
//             </CardContent>
//           </Card>
//         )}

//         {/* Información médica básica */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="flex items-center">
//               <Heart className="h-5 w-5 mr-2" />
//               Información Médica
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-3">
//             {medicalHistory.blood_type && (
//               <div>
//                 <p className="text-sm text-gray-600">Tipo de Sangre</p>
//                 <Badge variant="outline" className="font-medium">
//                   {medicalHistory.blood_type}
//                 </Badge>
//               </div>
//             )}
//             {medicalHistory.allergies && (
//               <div>
//                 <p className="text-sm text-gray-600">Alergias</p>
//                 <div className="flex items-start">
//                   <AlertTriangle className="h-4 w-4 mr-2 text-red-500 mt-0.5" />
//                   <p className="text-sm">{medicalHistory.allergies}</p>
//                 </div>
//               </div>
//             )}
//             {medicalHistory.chronic_conditions && (
//               <div>
//                 <p className="text-sm text-gray-600">Condiciones Crónicas</p>
//                 <p className="text-sm">{medicalHistory.chronic_conditions}</p>
//               </div>
//             )}
//             {medicalHistory.current_medications && (
//               <div>
//                 <p className="text-sm text-gray-600">Medicamentos Actuales</p>
//                 <div className="flex items-start">
//                   <Pill className="h-4 w-4 mr-2 text-blue-500 mt-0.5" />
//                   <p className="text-sm">
//                     {medicalHistory.current_medications}
//                   </p>
//                 </div>
//               </div>
//             )}
//             <div>
//               <p className="text-sm text-gray-600">Registro</p>
//               <p className="text-xs text-gray-500">
//                 Creado:{" "}
//                 {new Date(medicalHistory.created_at).toLocaleDateString(
//                   "es-ES"
//                 )}
//               </p>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Tabs para consultas y prescripciones */}
//       <Tabs defaultValue="consultations" className="space-y-6">
//         <TabsList className="grid w-full grid-cols-3">
//           <TabsTrigger value="consultations">
//             <Stethoscope className="h-4 w-4 mr-2" />
//             Consultas ({consultations.length})
//           </TabsTrigger>
//           <TabsTrigger value="prescriptions">
//             <FileText className="h-4 w-4 mr-2" />
//             Prescripciones ({prescriptions.length})
//           </TabsTrigger>
//           <TabsTrigger value="history">
//             <Activity className="h-4 w-4 mr-2" />
//             Historia Completa
//           </TabsTrigger>
//         </TabsList>

//         {/* Tab: Consultas */}
//         <TabsContent value="consultations">
//           <Card>
//             <CardHeader>
//               <CardTitle>Historial de Consultas</CardTitle>
//               <CardDescription>
//                 {consultations.length} consulta
//                 {consultations.length !== 1 ? "s" : ""} registrada
//                 {consultations.length !== 1 ? "s" : ""}
//               </CardDescription>
//             </CardHeader>
//             <CardContent>
//               {consultations.length === 0 ? (
//                 <div className="text-center py-8">
//                   <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                   <p className="text-gray-500">No hay consultas registradas</p>
//                   <Button
//                     onClick={() => setShowConsultationForm(true)}
//                     className="mt-4"
//                   >
//                     <Plus className="h-4 w-4 mr-2" />
//                     Primera Consulta
//                   </Button>
//                 </div>
//               ) : (
//                 <div className="space-y-4">
//                   {consultations.map((consultation) => (
//                     <Card
//                       key={consultation.id}
//                       className="border-l-4 border-blue-500"
//                     >
//                       <CardContent className="pt-4">
//                         <div className="flex items-start justify-between">
//                           <div className="flex-1">
//                             <div className="flex items-center mb-2">
//                               <Calendar className="h-4 w-4 mr-2 text-gray-500" />
//                               <p className="text-sm text-gray-600">
//                                 {new Date(
//                                   consultation.consultation_date
//                                 ).toLocaleDateString("es-ES", {
//                                   year: "numeric",
//                                   month: "long",
//                                   day: "numeric",
//                                   hour: "2-digit",
//                                   minute: "2-digit",
//                                 })}
//                               </p>
//                             </div>
//                             <h4 className="font-medium mb-2">
//                               {consultation.reason_for_visit}
//                             </h4>
//                             {consultation.diagnosis && (
//                               <p className="text-sm text-gray-700 mb-2">
//                                 <strong>Diagnóstico:</strong>{" "}
//                                 {consultation.diagnosis}
//                               </p>
//                             )}
//                             {consultation.symptoms && (
//                               <p className="text-sm text-gray-600 mb-2">
//                                 <strong>Síntomas:</strong>{" "}
//                                 {consultation.symptoms}
//                               </p>
//                             )}
//                             {consultation.vital_signs && (
//                               <div className="flex flex-wrap gap-2 mb-2">
//                                 {Object.entries(consultation.vital_signs).map(
//                                   ([key, value]) => (
//                                     <Badge
//                                       key={key}
//                                       variant="secondary"
//                                       className="text-xs"
//                                     >
//                                       {key}: {value}
//                                     </Badge>
//                                   )
//                                 )}
//                               </div>
//                             )}
//                           </div>
//                           <div className="flex space-x-2 ml-4">
//                             <Button
//                               variant="outline"
//                               size="sm"
//                               onClick={() => {
//                                 setSelectedConsultation(consultation);
//                                 setShowPrescriptionForm(true);
//                               }}
//                             >
//                               <FileText className="h-4 w-4 mr-1" />
//                               Recetar
//                             </Button>
//                             <Button
//                               variant="outline"
//                               size="sm"
//                               onClick={() =>
//                                 router.push(
//                                   `/dashboard/consultations/${consultation.id}`
//                                 )
//                               }
//                             >
//                               <Eye className="h-4 w-4" />
//                             </Button>
//                           </div>
//                         </div>
//                       </CardContent>
//                     </Card>
//                   ))}
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         {/* Tab: Prescripciones */}
//         <TabsContent value="prescriptions">
//           <Card>
//             <CardHeader>
//               <div className="flex items-center justify-between">
//                 <div>
//                   <CardTitle>Historial de Prescripciones</CardTitle>
//                   <CardDescription>
//                     {prescriptions.length} prescripción
//                     {prescriptions.length !== 1 ? "es" : ""} emitida
//                     {prescriptions.length !== 1 ? "s" : ""}
//                   </CardDescription>
//                 </div>
//                 <Button onClick={handleCreateDirectPrescription}>
//                   <Plus className="h-4 w-4 mr-2" />
//                   Nueva Receta
//                 </Button>
//               </div>
//             </CardHeader>
//             <CardContent>
//               {prescriptions.length === 0 ? (
//                 <div className="text-center py-8">
//                   <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//                   <p className="text-gray-500">
//                     No hay prescripciones registradas
//                   </p>
//                   <p className="text-sm text-gray-400 mt-2">
//                     Las prescripciones se pueden crear desde las consultas
//                     médicas o directamente
//                   </p>
//                   <Button
//                     onClick={handleCreateDirectPrescription}
//                     className="mt-4"
//                   >
//                     <Plus className="h-4 w-4 mr-2" />
//                     Primera Receta
//                   </Button>
//                 </div>
//               ) : (
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Fecha</TableHead>
//                       <TableHead>Diagnóstico</TableHead>
//                       <TableHead>Medicamentos</TableHead>
//                       <TableHead>Estado</TableHead>
//                       <TableHead>Acciones</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {prescriptions.map((prescription) => (
//                       <TableRow key={prescription.id}>
//                         <TableCell>
//                           {new Date(
//                             prescription.date_prescribed
//                           ).toLocaleDateString("es-ES")}
//                         </TableCell>
//                         <TableCell>
//                           <p className="max-w-xs truncate">
//                             {prescription.diagnosis || "Sin diagnóstico"}
//                           </p>
//                         </TableCell>
//                         <TableCell>
//                           <p className="max-w-xs truncate">
//                             {prescription.medications}
//                           </p>
//                         </TableCell>
//                         <TableCell>
//                           {prescription.medical_history_id ? (
//                             <Badge variant="default" className="text-xs">
//                               Vinculada
//                             </Badge>
//                           ) : (
//                             <Badge variant="secondary" className="text-xs">
//                               Sin vincular
//                             </Badge>
//                           )}
//                         </TableCell>
//                         <TableCell>
//                           <Button
//                             variant="outline"
//                             size="sm"
//                             onClick={() =>
//                               router.push(
//                                 `/dashboard/prescriptions/${prescription.id}`
//                               )
//                             }
//                           >
//                             <Eye className="h-4 w-4" />
//                           </Button>
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         {/* Tab: Historia Completa */}
//         <TabsContent value="history">
//           <Card>
//             <CardHeader>
//               <CardTitle>Historia Clínica Completa</CardTitle>
//               <CardDescription>
//                 Información médica detallada del paciente
//               </CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-6">
//               {medicalHistory.family_history && (
//                 <div>
//                   <h4 className="font-medium mb-2">Antecedentes Familiares</h4>
//                   <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
//                     {medicalHistory.family_history}
//                   </p>
//                 </div>
//               )}

//               {medicalHistory.notes && (
//                 <div>
//                   <h4 className="font-medium mb-2">Notas Generales</h4>
//                   <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
//                     {medicalHistory.notes}
//                   </p>
//                 </div>
//               )}

//               <div>
//                 <h4 className="font-medium mb-2">Resumen de Actividad</h4>
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                   <div className="bg-blue-50 p-4 rounded-lg">
//                     <div className="flex items-center">
//                       <Stethoscope className="h-6 w-6 text-blue-600" />
//                       <div className="ml-3">
//                         <p className="text-sm text-blue-600">Total Consultas</p>
//                         <p className="text-xl font-bold text-blue-800">
//                           {consultations.length}
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="bg-green-50 p-4 rounded-lg">
//                     <div className="flex items-center">
//                       <FileText className="h-6 w-6 text-green-600" />
//                       <div className="ml-3">
//                         <p className="text-sm text-green-600">Prescripciones</p>
//                         <p className="text-xl font-bold text-green-800">
//                           {prescriptions.length}
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="bg-purple-50 p-4 rounded-lg">
//                     <div className="flex items-center">
//                       <Calendar className="h-6 w-6 text-purple-600" />
//                       <div className="ml-3">
//                         <p className="text-sm text-purple-600">
//                           Última Consulta
//                         </p>
//                         <p className="text-sm font-medium text-purple-800">
//                           {consultations.length > 0
//                             ? new Date(
//                                 consultations[0].consultation_date
//                               ).toLocaleDateString("es-ES")
//                             : "Nunca"}
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }
