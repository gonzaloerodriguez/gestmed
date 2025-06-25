import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PatientSelector } from "@/components/patient-selector";
import type { PatientSelectorItem } from "@/lib/supabase/types/patient";
import type { ValidationErrors } from "@/lib/validation/consultation-schema";
import { ErrorMessage } from "./error-message";

interface PatientSelectionCardProps {
  selectedPatient: PatientSelectorItem | null;
  onPatientSelect: (patient: PatientSelectorItem | null) => void;
  errors: ValidationErrors;
  touchedFields: Set<string>;
}

export function PatientSelectionCard({
  selectedPatient,
  onPatientSelect,
  errors,
  touchedFields,
}: PatientSelectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Paciente</CardTitle>
        <CardDescription>
          Selecciona el paciente para la consulta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          {/* Usar tu PatientSelector existente */}
          <PatientSelector
            onPatientSelect={onPatientSelect}
            selectedPatient={selectedPatient}
            allowOneTime={true}
          />
          <ErrorMessage
            field="selectedPatient"
            errors={errors}
            touchedFields={touchedFields}
          />
        </div>
      </CardContent>
    </Card>
  );
}
