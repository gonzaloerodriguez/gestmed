"use client";

import { Button } from "@/components/ui/button";
import { generatePrescriptionPDF } from "@/lib/pdf-generator";

// Componente de prueba para verificar que el código se actualiza
export function TestPDFButton() {
  const testPDF = async () => {
    console.log("🧪 Iniciando prueba de PDF...");

    const mockDoctor = {
      id: "test",
      full_name: "María González",
      gender: "female" as const,
      license_number: "12345",
      specialty: "Cardiología",
      email: "",
      cedula: "",
      is_active: true,
      created_at: new Date().toISOString(),
      signature_stamp_url: undefined,
      updated_at: new Date().toISOString(),
    };

    const mockPrescription = {
      id: "test",
      patient_name: "Juan Pérez",
      patient_cedula: "12345678",
      diagnosis: "Hipertensión arterial",
      medications: "Losartán 50mg - 1 comprimido cada 12 horas",
      instructions: "Tomar con abundante agua",
      notes: "Control en 15 días",
      date_prescribed: new Date().toISOString(),
      doctor_id: "test",
      created_at: new Date().toISOString(),

      patient_phone: "string",
      patient_address: "string",
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    try {
      const pdfBlob = await generatePrescriptionPDF(
        mockPrescription,
        mockDoctor
      );

      // Crear URL y descargar
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `test-prescription-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("✅ PDF de prueba generado exitosamente");
    } catch (error) {
      console.error("❌ Error generando PDF de prueba:", error);
    }
  };

  return (
    <Button onClick={testPDF} variant="outline">
      🧪 Probar PDF (con matrícula)
    </Button>
  );
}
